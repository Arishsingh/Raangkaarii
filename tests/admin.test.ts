import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: authMock }));

describe("admin access", () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_EMAIL;
  });

  it("recognises an admin address regardless of case", async () => {
    const { emailIsAdmin } = await import("@/lib/admin");
    expect(emailIsAdmin("arishsingh9469@gmail.com")).toBe(true);
    expect(emailIsAdmin("ArishSingh9469@Gmail.com")).toBe(true);
  });

  it("refuses everyone else, and missing addresses", async () => {
    const { emailIsAdmin } = await import("@/lib/admin");
    expect(emailIsAdmin("customer@gmail.com")).toBe(false);
    expect(emailIsAdmin("")).toBe(false);
    expect(emailIsAdmin(null)).toBe(false);
    expect(emailIsAdmin(undefined)).toBe(false);
  });

  it("does not match a lookalike address", async () => {
    const { emailIsAdmin } = await import("@/lib/admin");
    expect(emailIsAdmin("arishsingh9469@gmail.com.evil.example")).toBe(false);
    expect(emailIsAdmin(" arishsingh9469@gmail.com")).toBe(false);
  });

  it("uses ADMIN_EMAILS instead of the built-in list when it is set", async () => {
    process.env.ADMIN_EMAILS = "owner@rangkaarii.in, Second@Rangkaarii.in";
    const { emailIsAdmin } = await import("@/lib/admin");
    expect(emailIsAdmin("owner@rangkaarii.in")).toBe(true);
    expect(emailIsAdmin("second@rangkaarii.in")).toBe(true);
    expect(emailIsAdmin("arishsingh9469@gmail.com")).toBe(false);
  });

  it("getAdminUser returns null when signed out or not an admin", async () => {
    const { getAdminUser } = await import("@/lib/admin");
    authMock.mockResolvedValueOnce(null);
    expect(await getAdminUser()).toBeNull();
    authMock.mockResolvedValueOnce({ user: { email: "customer@gmail.com", verified: true } });
    expect(await getAdminUser()).toBeNull();
  });

  it("getAdminUser refuses an admin address whose session is not verified", async () => {
    const { getAdminUser } = await import("@/lib/admin");
    authMock.mockResolvedValueOnce({ user: { email: "arishsingh9469@gmail.com" } });
    expect(await getAdminUser()).toBeNull();
    authMock.mockResolvedValueOnce({ user: { email: "arishsingh9469@gmail.com", verified: false } });
    expect(await getAdminUser()).toBeNull();
  });

  it("getAdminUser returns the admin's verified session user", async () => {
    const { getAdminUser } = await import("@/lib/admin");
    const user = { id: "u1", email: "arishsingh9469@gmail.com", verified: true };
    authMock.mockResolvedValueOnce({ user });
    expect(await getAdminUser()).toEqual(user);
  });
});
