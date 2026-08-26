import { createClerkClient } from "@clerk/nextjs/server";

/**
 * Registration runs server-side against the Backend API so it never depends on
 * the browser's Clerk client, which can hold a dead sign-up attempt id.
 */
const PASSWORD_MIN_LENGTH = 15;

type Body = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return bad("Registration is not configured.", 500);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid request.");
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!firstName) return bad("Please enter your first name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return bad("Please enter a valid email address.");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return bad(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  const clerk = createClerkClient({ secretKey });

  try {
    const existing = await clerk.users.getUserList({ emailAddress: [email] });
    if (existing.totalCount > 0) {
      return Response.json(
        { error: "An account already uses this email.", existingAccount: true },
        { status: 409 },
      );
    }

    const user = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName: lastName || undefined,
    });

    // This instance asks for an email code as a second factor after a password
    // sign-in. A sign-in ticket completes in one step, so the person who just
    // registered lands straight in their account.
    let ticket: string | undefined;
    try {
      const token = await clerk.signInTokens.createSignInToken({
        userId: user.id,
        expiresInSeconds: 300,
      });
      ticket = token.token;
    } catch (caught) {
      // Account exists either way; the form falls back to the sign-in page.
      console.error("Could not mint sign-in token", caught);
    }

    return Response.json({ ok: true, ticket });
  } catch (caught) {
    const detail = (caught as { errors?: { message?: string }[] })?.errors?.[0];
    const message = detail?.message ?? "";

    if (/taken|already exists/i.test(message)) {
      return Response.json(
        { error: "An account already uses this email.", existingAccount: true },
        { status: 409 },
      );
    }
    if (/password/i.test(message)) return bad(message);

    console.error("Registration failed", caught);
    return bad("Could not create your account. Please try again.", 500);
  }
}
