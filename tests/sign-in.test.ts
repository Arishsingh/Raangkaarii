import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Exercises the real `authorize` and `signIn` callback from src/auth.ts.
 * NextAuth is stubbed only to capture the config it is handed; the database,
 * rate limiter and mailer are faked.
 */
const findUserByEmail = vi.fn();
const loginIsBlocked = vi.fn();
const recordLoginFailure = vi.fn();
const clearLoginFailures = vi.fn();
const sendVerificationLink = vi.fn();

type Config = {
  providers: { id?: string; authorize?: (c: unknown, r?: Request) => Promise<unknown> }[];
};
let config: Config;

vi.mock("next-auth", () => ({
  default: (factory: () => Config) => {
    config = factory();
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials";
  },
}));
vi.mock("@/lib/email-verification", () => ({ sendVerificationLink }));
vi.mock("@/lib/admin-emails", () => ({
  emailIsAdmin: (email: string) => email === "boss@example.com",
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (options: object) => ({ id: "credentials", ...options }),
}));
vi.mock("next-auth/providers/google", () => ({ default: () => ({ id: "google" }) }));
vi.mock("@auth/neon-adapter", () => ({ default: () => ({}) }));
vi.mock("@neondatabase/serverless", async (original) => ({
  ...(await original<object>()),
  Pool: class {},
}));
vi.mock("@/lib/users-store", () => ({
  ensureAuthSchema: vi.fn(async () => {}),
  findUserByEmail,
}));
vi.mock("@/lib/login-limit", async (original) => ({
  ...(await original<typeof import("@/lib/login-limit")>()),
  loginIsBlocked,
  recordLoginFailure,
  clearLoginFailures,
}));

let authorize: (credentials: unknown, request?: Request) => Promise<unknown>;
let passwordHash: string;

beforeAll(async () => {
  await import("@/auth");
  authorize = config.providers.find((p) => p.id === "credentials")!.authorize!;
  passwordHash = await bcrypt.hash("correct-horse-battery", 4);
});

beforeEach(() => {
  for (const mock of [
    findUserByEmail,
    loginIsBlocked,
    recordLoginFailure,
    clearLoginFailures,
    sendVerificationLink,
  ]) mock.mockReset();
  sendVerificationLink.mockResolvedValue(true);
  loginIsBlocked.mockResolvedValue(false);
  recordLoginFailure.mockResolvedValue(undefined);
  clearLoginFailures.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const customer = (overrides = {}) => ({
  id: "user-1",
  name: "Asha",
  email: "asha@example.com",
  image: null,
  password: passwordHash,
  emailVerified: new Date("2026-01-01"),
  ...overrides,
});

const request = (ip = "203.0.113.7") =>
  new Request("http://localhost/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
  });

const login = (email: string, password: string, ip?: string) =>
  authorize({ email, password }, request(ip));

describe("password sign-in", () => {
  it("signs in a confirmed account with the right password", async () => {
    findUserByEmail.mockResolvedValue(customer());
    const user = await login("asha@example.com", "correct-horse-battery");
    expect(user).toEqual({ id: "user-1", name: "Asha", email: "asha@example.com", image: null });
    expect(clearLoginFailures).toHaveBeenCalledWith("asha@example.com");
  });

  it("never hands the password hash back", async () => {
    findUserByEmail.mockResolvedValue(customer());
    expect(JSON.stringify(await login("asha@example.com", "correct-horse-battery"))).not.toContain(passwordHash);
  });

  it("rejects a wrong password and records the failure against email and IP", async () => {
    findUserByEmail.mockResolvedValue(customer());
    expect(await login("asha@example.com", "wrong-password", "198.51.100.4")).toBeNull();
    expect(recordLoginFailure).toHaveBeenCalledWith("asha@example.com", "198.51.100.4");
    expect(clearLoginFailures).not.toHaveBeenCalled();
  });

  it("rejects an unknown email, and counts it too", async () => {
    findUserByEmail.mockResolvedValue(null);
    expect(await login("nobody@example.com", "anything-at-all")).toBeNull();
    expect(recordLoginFailure).toHaveBeenCalled();
  });

  it("rejects a Google-only account (no password set)", async () => {
    findUserByEmail.mockResolvedValue(customer({ password: null }));
    expect(await login("asha@example.com", "anything")).toBeNull();
  });

  it("rejects empty fields without touching the database", async () => {
    expect(await login("", "x")).toBeNull();
    expect(await login("asha@example.com", "")).toBeNull();
    expect(await authorize(undefined)).toBeNull();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it("fails closed when the database errors", async () => {
    findUserByEmail.mockRejectedValue(new Error("connection reset"));
    expect(await login("asha@example.com", "correct-horse-battery")).toBeNull();
  });

  it("spends real hashing time on unknown emails (no account enumeration)", async () => {
    findUserByEmail.mockResolvedValue(null);
    const start = performance.now();
    await login("nobody@example.com", "whatever-123");
    expect(performance.now() - start).toBeGreaterThan(20);
  });
});

describe("login attempt limit", () => {
  it("refuses once locked, before looking at the password", async () => {
    loginIsBlocked.mockResolvedValue(true);
    findUserByEmail.mockResolvedValue(customer());
    await expect(login("asha@example.com", "correct-horse-battery")).rejects.toMatchObject({
      code: "rate_limited",
    });
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it("checks the limit against the client's IP from x-forwarded-for", async () => {
    findUserByEmail.mockResolvedValue(customer());
    await login("asha@example.com", "correct-horse-battery", "192.0.2.55");
    expect(loginIsBlocked).toHaveBeenCalledWith("asha@example.com", "192.0.2.55");
  });
});

describe("email confirmation (admin-list accounts only)", () => {
  it("lets an unconfirmed customer straight in, with no email", async () => {
    findUserByEmail.mockResolvedValue(customer({ emailVerified: null }));
    expect(await login("asha@example.com", "correct-horse-battery")).toMatchObject({ id: "user-1" });
    expect(sendVerificationLink).not.toHaveBeenCalled();
  });

  it("refuses an unconfirmed admin-list account and emails a link", async () => {
    findUserByEmail.mockResolvedValue(customer({ email: "boss@example.com", emailVerified: null }));
    await expect(login("boss@example.com", "correct-horse-battery")).rejects.toMatchObject({
      code: "email_unverified",
    });
    expect(sendVerificationLink).toHaveBeenCalledTimes(1);
  });

  it("lets a confirmed admin-list account in", async () => {
    findUserByEmail.mockResolvedValue(customer({ email: "boss@example.com" }));
    expect(await login("boss@example.com", "correct-horse-battery")).toMatchObject({ id: "user-1" });
    expect(sendVerificationLink).not.toHaveBeenCalled();
  });

  it("does not email anyone who gave the wrong password", async () => {
    findUserByEmail.mockResolvedValue(customer({ email: "boss@example.com", emailVerified: null }));
    expect(await login("boss@example.com", "wrong-password")).toBeNull();
    expect(sendVerificationLink).not.toHaveBeenCalled();
  });
});

describe("session", () => {
  it("uses JWT sessions carrying the user id", async () => {
    const { authConfig } = await import("@/auth.config");
    expect(authConfig.session.strategy).toBe("jwt");
    const token = authConfig.callbacks.jwt({ token: {}, user: { id: "u1" } } as never);
    expect(token).toMatchObject({ id: "u1" });
    const session = authConfig.callbacks.session({ session: { user: {} }, token } as never);
    expect(session.user.id).toBe("u1");
  });
});
