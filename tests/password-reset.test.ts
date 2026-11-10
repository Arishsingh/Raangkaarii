import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPassword = vi.fn();
const createResetToken = vi.fn();
const sendEmail = vi.fn();
const clearLoginFailures = vi.fn(async () => {});
const pending: (() => Promise<void>)[] = [];

vi.mock("@/auth", () => ({ BCRYPT_ROUNDS: 4 }));
vi.mock("@/lib/password-reset", () => ({
  resetPassword,
  createResetToken,
  RESET_TOKEN_TTL_MINUTES: 30,
}));
vi.mock("@/lib/email", () => ({
  emailConfigured: () => true,
  passwordResetEmail: (input: { link: string }) => ({ subject: "Reset", html: input.link }),
  sendEmail,
}));
vi.mock("@/lib/login-limit", () => ({ clearLoginFailures }));
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => pending.push(fn) }));
vi.mock("@/lib/users-store", () => ({ normaliseEmail: (e: string) => e.trim().toLowerCase() }));

const reset = await import("@/app/api/password/reset/route");
const forgot = await import("@/app/api/password/forgot/route");

const post = (handler: (r: Request) => Promise<Response>, body: unknown, headers = {}) =>
  handler(
    new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body), headers }),
  );

beforeEach(() => {
  pending.length = 0;
  resetPassword.mockReset();
  createResetToken.mockReset();
  sendEmail.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/password/forgot", () => {
  it("answers the same for known and unknown addresses", async () => {
    createResetToken.mockResolvedValueOnce({ token: "t", name: "A", email: "a@example.com" });
    const known = await (await post(forgot.POST, { email: "a@example.com" })).json();
    createResetToken.mockResolvedValueOnce(null);
    const unknown = await (await post(forgot.POST, { email: "nobody@example.com" })).json();
    expect(known).toEqual(unknown);
  });

  it("does the lookup after responding, so timing reveals nothing", async () => {
    await post(forgot.POST, { email: "a@example.com" });
    expect(createResetToken).not.toHaveBeenCalled();
    expect(pending).toHaveLength(1);
  });

  it("builds the link from config, not a forged Host header", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "");
    createResetToken.mockResolvedValue({ token: "abc", name: null, email: "a@example.com" });
    await post(forgot.POST, { email: "a@example.com" }, { host: "evil.example" });
    await pending[0]();
    expect(sendEmail.mock.calls[0][0].html).toMatch(/^https:\/\/www\.rangkaarii\.in\/reset-password\?token=abc$/);
    vi.unstubAllEnvs();
  });

  it("rejects an invalid email", async () => {
    expect((await post(forgot.POST, { email: "nope" })).status).toBe(400);
  });
});

describe("POST /api/password/reset", () => {
  it("sets a new hashed password with a valid token", async () => {
    resetPassword.mockResolvedValue("a@example.com");
    const res = await post(reset.POST, { token: "tok", password: "newpassword1", confirmPassword: "newpassword1" });
    expect(res.status).toBe(200);
    expect(resetPassword.mock.calls[0][0]).toBe("tok");
    expect(resetPassword.mock.calls[0][1]).toMatch(/^\$2[aby]\$/);
  });

  it("lifts a login lockout once the reset succeeds", async () => {
    resetPassword.mockResolvedValue("a@example.com");
    await post(reset.POST, { token: "tok", password: "newpassword1", confirmPassword: "newpassword1" });
    expect(clearLoginFailures).toHaveBeenCalledWith("a@example.com");
  });

  it("rejects an expired or reused token", async () => {
    resetPassword.mockResolvedValue(null);
    const res = await post(reset.POST, { token: "old", password: "newpassword1", confirmPassword: "newpassword1" });
    expect(res.status).toBe(400);
    expect((await res.json()).expired).toBe(true);
  });

  it("rejects a short or mismatched password before using the token", async () => {
    expect((await post(reset.POST, { token: "t", password: "short", confirmPassword: "short" })).status).toBe(400);
    expect((await post(reset.POST, { token: "t", password: "newpassword1", confirmPassword: "other12345" })).status).toBe(400);
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
