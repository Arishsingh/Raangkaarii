import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserByEmail = vi.fn();
const createCredentialsUser = vi.fn();
const sendVerificationLink = vi.fn();
let emailOn = true;

vi.mock("@/auth", () => ({ BCRYPT_ROUNDS: 4 }));
vi.mock("@/lib/users-store", () => ({
  findUserByEmail,
  createCredentialsUser,
  normaliseEmail: (email: string) => email.trim().toLowerCase(),
}));

vi.mock("@/lib/email", () => ({ emailConfigured: () => emailOn }));
vi.mock("@/lib/email-verification", () => ({ sendVerificationLink }));

const { POST } = await import("@/app/api/register/route");

function register(body: unknown) {
  return POST(
    new Request("http://localhost/api/register", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  findUserByEmail.mockReset().mockResolvedValue(null);
  createCredentialsUser.mockReset().mockImplementation(async (input) => ({ id: "new", ...input }));
  sendVerificationLink.mockReset().mockResolvedValue(true);
  emailOn = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/register", () => {
  it("creates an account and stores a bcrypt hash, never the password", async () => {
    const res = await register({ name: " Asha ", email: " Asha@Example.com ", password: "longenough1" });
    expect(res.status).toBe(200);
    const saved = createCredentialsUser.mock.calls[0][0];
    expect(saved.email).toBe("asha@example.com");
    expect(saved.name).toBe("Asha");
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(saved.passwordHash).not.toContain("longenough1");
  });

  it("emails a confirmation link and does not sign anyone in", async () => {
    const res = await register({ email: "a@example.com", password: "longenough1" });
    expect(await res.json()).toEqual({ ok: true, verify: true });
    expect(sendVerificationLink).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new", email: "a@example.com" }),
      "http://localhost",
    );
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("still creates the account if the email fails (signing in resends it)", async () => {
    sendVerificationLink.mockRejectedValue(new Error("Resend down"));
    expect((await register({ email: "a@example.com", password: "longenough1" })).status).toBe(200);
  });

  it("refuses to create accounts when email isn't configured", async () => {
    emailOn = false;
    const res = await register({ email: "a@example.com", password: "longenough1" });
    expect(res.status).toBe(503);
    expect(createCredentialsUser).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    expect((await register("{not json")).status).toBe(400);
  });

  it.each(["", "not-an-email", "a@b", "a b@c.com"])("rejects invalid email %j", async (email) => {
    const res = await register({ email, password: "longenough1" });
    expect(res.status).toBe(400);
    expect(createCredentialsUser).not.toHaveBeenCalled();
  });

  it("rejects a password under 8 characters", async () => {
    const res = await register({ email: "a@example.com", password: "short" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 8/);
  });

  it("rejects mismatched confirmation", async () => {
    const res = await register({ email: "a@example.com", password: "longenough1", confirmPassword: "different1" });
    expect(res.status).toBe(400);
  });

  it("refuses an email that already has an account", async () => {
    findUserByEmail.mockResolvedValue({ id: "existing" });
    const res = await register({ email: "a@example.com", password: "longenough1" });
    expect(res.status).toBe(409);
    expect(createCredentialsUser).not.toHaveBeenCalled();
  });

  it("refuses when a parallel sign-up won the race", async () => {
    createCredentialsUser.mockResolvedValue(null);
    expect((await register({ email: "a@example.com", password: "longenough1" })).status).toBe(409);
  });

  it("hides database errors from the browser", async () => {
    findUserByEmail.mockRejectedValue(new Error('relation "users" does not exist'));
    const res = await register({ email: "a@example.com", password: "longenough1" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/relation|users/);
  });

  it("ignores attempts to set extra fields like an id", async () => {
    await register({ email: "a@example.com", password: "longenough1", id: "admin", emailVerified: true });
    expect(Object.keys(createCredentialsUser.mock.calls[0][0]).sort()).toEqual(["email", "name", "passwordHash"]);
  });
});
