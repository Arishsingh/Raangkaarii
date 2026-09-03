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

type ClerkFailure = {
  errors?: { code?: string; message?: string; longMessage?: string }[];
};

/**
 * Clerk's own error, turned into something the person filling in the form can
 * act on. Anything unrecognised keeps the generic message and is logged, so a
 * new failure mode shows up in the server log rather than disappearing.
 */
function fromClerk(caught: unknown) {
  const detail = (caught as ClerkFailure)?.errors?.[0];
  const code = detail?.code ?? "";
  const message = detail?.longMessage || detail?.message || "";

  if (code === "form_identifier_exists" || /taken|already exists/i.test(message)) {
    return {
      status: 409,
      body: { error: "An account already uses this email.", existingAccount: true },
      log: false,
    };
  }

  /**
   * The instance is full. Nothing the person typed is wrong, so they must not
   * be sent back to edit the form — and Clerk's wording is about our plan, not
   * their account, so it is logged rather than shown.
   */
  if (code === "user_quota_exceeded") {
    return {
      status: 503,
      body: {
        error:
          "We cannot open new accounts just now. Please try again shortly, or reach us on WhatsApp at +91 87160 00023.",
      },
      log: true,
    };
  }

  // Breached, too short, too weak — Clerk words these well, so pass them on.
  if (code.startsWith("form_password") || /password/i.test(message)) {
    return {
      status: 400,
      body: { error: message || "Please choose a different password." },
      log: false,
    };
  }

  if (code.startsWith("form_param") || code === "form_identifier_not_allowed") {
    return {
      status: 400,
      body: { error: message || "Please check the details you entered." },
      log: false,
    };
  }

  return {
    status: 500,
    body: { error: "Could not create your account. Please try again." },
    log: true,
  };
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
    const { status, body, log } = fromClerk(caught);
    // The code and trace id are what make a failure here diagnosable; the
    // generic message alone never was, which is how a full instance read as
    // "please try again" for as long as it did.
    if (log) console.error("Registration failed", caught);
    return Response.json(body, { status });
  }
}
