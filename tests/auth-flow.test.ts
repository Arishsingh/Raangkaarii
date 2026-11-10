import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End to end through the real Auth.js handlers: CSRF, the credentials
 * callback, the session cookie and /api/auth/session. Only the database,
 * rate-limit store and mailer are faked, so nothing touches real data.
 */
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123";
process.env.AUTH_URL = "http://localhost:3000";
process.env.AUTH_TRUST_HOST = "true";
delete process.env.GOOGLE_CLIENT_ID;

const users = new Map<string, Record<string, unknown>>();
const failures: string[] = [];
const sendVerificationLink = vi.fn(async () => true);

vi.mock("@auth/neon-adapter", () => ({ default: () => ({}) }));
vi.mock("@neondatabase/serverless", async (original) => ({
  ...(await original<object>()),
  Pool: class {},
}));
vi.mock("@/lib/users-store", () => ({
  ensureAuthSchema: async () => {},
  findUserByEmail: async (email: string) => users.get(email.trim().toLowerCase()) ?? null,
  claimUnverifiedAccountForGoogle: async () => {},
}));
vi.mock("@/lib/login-limit", async (original) => ({
  ...(await original<typeof import("@/lib/login-limit")>()),
  loginIsBlocked: async (email: string) =>
    failures.filter((entry) => entry === email).length >= 5,
  recordLoginFailure: async (email: string) => void failures.push(email),
  clearLoginFailures: async (email: string) => {
    for (let i = failures.length - 1; i >= 0; i--) if (failures[i] === email) failures.splice(i, 1);
  },
}));
vi.mock("@/lib/email-verification", () => ({ sendVerificationLink }));

let handlers: { GET: (r: Request) => Promise<Response>; POST: (r: Request) => Promise<Response> };

beforeAll(async () => {
  ({ handlers } = (await import("@/auth")) as never);
  const hash = await bcrypt.hash("correct-horse-battery", 4);
  users.set("asha@example.com", {
    id: "u-asha", name: "Asha", email: "asha@example.com", image: null,
    password: hash, emailVerified: new Date(),
  });
  users.set("new@example.com", {
    id: "u-new", name: null, email: "new@example.com", image: null,
    password: hash, emailVerified: null,
  });
  users.set("arishsingh9469@gmail.com", {
    id: "u-admin", name: "Arish", email: "arishsingh9469@gmail.com", image: null,
    password: hash, emailVerified: new Date(),
  });
});

beforeEach(() => {
  failures.length = 0;
  sendVerificationLink.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const BASE = "http://localhost:3000/api/auth";

function cookiesFrom(res: Response) {
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

/** What the browser's signIn("credentials", { redirect: false }) does. */
async function signInWith(email: string, password: string) {
  const csrfRes = await handlers.GET(new NextRequest(`${BASE}/csrf`));
  const { csrfToken } = await csrfRes.json();
  const res = await handlers.POST(
    new NextRequest(`${BASE}/callback/credentials`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: cookiesFrom(csrfRes),
        "x-forwarded-for": "203.0.113.9",
        "x-auth-return-redirect": "1",
      },
      body: new URLSearchParams({ email, password, csrfToken, callbackUrl: "/dashboard" }),
    }),
  );
  const { url } = await res.json();
  const params = new URL(url).searchParams;
  return { error: params.get("error"), code: params.get("code"), cookie: cookiesFrom(res) };
}

async function sessionFor(cookie: string) {
  const res = await handlers.GET(new NextRequest(`${BASE}/session`, { headers: { cookie } }));
  return res.json();
}

describe("real Auth.js sign-in flow", () => {
  it("signs in a confirmed customer and issues a verified session", async () => {
    const result = await signInWith("asha@example.com", "correct-horse-battery");
    expect(result.error).toBeNull();
    const session = await sessionFor(result.cookie);
    expect(session.user).toMatchObject({ id: "u-asha", email: "asha@example.com", verified: true });
  });

  it("answers a wrong password with the generic error and no session", async () => {
    const result = await signInWith("asha@example.com", "wrong-password");
    expect(result.error).toBe("CredentialsSignin");
    expect(result.code).toBe("credentials");
    expect(await sessionFor(result.cookie)).toBeNull();
  });

  it("gives an unknown email exactly the same answer as a wrong password", async () => {
    const unknown = await signInWith("nobody@example.com", "wrong-password");
    const wrong = await signInWith("asha@example.com", "wrong-password");
    expect([unknown.error, unknown.code]).toEqual([wrong.error, wrong.code]);
  });

  it("refuses an unconfirmed account with code email_unverified and sends a link", async () => {
    const result = await signInWith("new@example.com", "correct-horse-battery");
    expect(result.code).toBe("email_unverified");
    expect(await sessionFor(result.cookie)).toBeNull();
    expect(sendVerificationLink).toHaveBeenCalledTimes(1);
  });

  it("locks an address after 5 wrong passwords — even the right one is refused", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await signInWith("asha@example.com", `guess-${i}`)).code).toBe("credentials");
    }
    const locked = await signInWith("asha@example.com", "correct-horse-battery");
    expect(locked.code).toBe("rate_limited");
    expect(await sessionFor(locked.cookie)).toBeNull();
  });

  it("clears the count after a successful sign-in", async () => {
    for (let i = 0; i < 4; i++) await signInWith("asha@example.com", `guess-${i}`);
    expect((await signInWith("asha@example.com", "correct-horse-battery")).error).toBeNull();
    expect(failures).not.toContain("asha@example.com");
  });

  it("an admin's fresh session is verified, so the admin check passes", async () => {
    const result = await signInWith("arishsingh9469@gmail.com", "correct-horse-battery");
    const session = await sessionFor(result.cookie);
    const { emailIsAdmin } = await import("@/lib/admin");
    expect(session.user.verified).toBe(true);
    expect(emailIsAdmin(session.user.email)).toBe(true);
  });
});
