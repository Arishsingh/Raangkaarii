import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPassword = vi.fn();
const createResetToken = vi.fn();
const sendEmail = vi.fn();
const clearLoginFailures = vi.fn(async () => {});

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
vi.mock("@/lib/users-store", () => ({ normaliseEmail: (e: string) => e.trim().toLowerCase() }));

const reset = await import("@/app/api/password/reset/route");
const forgot = await import("@/app/api/password/forgot/route");

const post = (handler: (r: Request) => Promise<Response>, body: unknown, headers = {}) =>
  handler(
    new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body), headers }),
  );

beforeEach(() => {
  resetPassword.mockReset();
  createResetToken.mockReset();
  sendEmail.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/password/forgot", () => {
  const issued = { status: "issued", token: "abc", name: "A", email: "a@example.com" };

  it("sends the email and reports status 'sent'", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    createResetToken.mockResolvedValue(issued);
    const res = await post(forgot.POST, { email: "A@Example.com" });
    expect(await res.json()).toEqual({ ok: true, status: "sent" });
    expect(createResetToken).toHaveBeenCalledWith("a@example.com");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@example.com" }));
    expect(info).toHaveBeenCalledWith("Password reset email sent");
  });

  it("reports 'no_account' and sends nothing for an unknown address", async () => {
    createResetToken.mockResolvedValue({ status: "no_account" });
    const res = await post(forgot.POST, { email: "nobody@example.com" });
    expect(await res.json()).toEqual({ ok: true, status: "no_account" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reports 'rate_limited' and sends nothing past the hourly limit", async () => {
    createResetToken.mockResolvedValue({ status: "rate_limited" });
    const res = await post(forgot.POST, { email: "a@example.com" });
    expect(await res.json()).toEqual({ ok: true, status: "rate_limited" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reports a failed send as an error the screen can show", async () => {
    createResetToken.mockResolvedValue(issued);
    sendEmail.mockRejectedValue(new Error("Resend rejected the email (403)"));
    const res = await post(forgot.POST, { email: "a@example.com" });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn't send/i);
    expect(console.error).toHaveBeenCalledWith("Could not send password reset email", expect.any(Error));
  });

  it("builds the link from config, not a forged Host header", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "");
    createResetToken.mockResolvedValue(issued);
    await post(forgot.POST, { email: "a@example.com" }, { host: "evil.example" });
    expect(sendEmail.mock.calls[0][0].html).toMatch(/^https:\/\/www\.rangkaarii\.in\/reset-password\?token=abc$/);
    vi.unstubAllEnvs();
  });

  it("rejects an invalid email", async () => {
    expect((await post(forgot.POST, { email: "nope" })).status).toBe(400);
    expect(createResetToken).not.toHaveBeenCalled();
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
