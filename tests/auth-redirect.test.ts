import { describe, expect, it } from "vitest";

import { DEFAULT_REDIRECT, loginRedirectFor, safeCallbackUrl } from "@/lib/auth-redirect";

/** Where a browser would actually go if handed this value on our own site. */
function landsOn(value: string) {
  return new URL(value, "https://www.rangkaarii.in").origin;
}

describe("safeCallbackUrl", () => {
  it("falls back to the dashboard when nothing was asked for", () => {
    expect(safeCallbackUrl(null)).toBe(DEFAULT_REDIRECT);
    expect(safeCallbackUrl(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeCallbackUrl("")).toBe(DEFAULT_REDIRECT);
  });

  it("keeps an on-site path, query included", () => {
    expect(safeCallbackUrl("/dashboard/product/p1?size=M")).toBe("/dashboard/product/p1?size=M");
    expect(safeCallbackUrl("/admin/orders")).toBe("/admin/orders");
  });

  it.each([
    "https://evil.example",
    "http://evil.example/dashboard",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil.example",
  ])("rejects off-site value %s", (value) => {
    expect(safeCallbackUrl(value)).toBe(DEFAULT_REDIRECT);
  });

  // Browsers delete tab, CR and LF from URLs before parsing them, so these
  // collapse to "//evil.example" — a protocol-relative link off the site.
  it.each(["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "\t//evil.example"])(
    "never returns a value that leaves the site: %j",
    (value) => {
      expect(landsOn(safeCallbackUrl(value))).toBe("https://www.rangkaarii.in");
    },
  );
});

describe("loginRedirectFor", () => {
  it.each(["/", "/dashboard", "/dashboard/product/p1", "/dashboard/cart", "/collections/new-in", "/login", "/signup"])(
    "lets a guest browse %s",
    (path) => {
      expect(loginRedirectFor(path, "", false)).toBeNull();
    },
  );

  it("sends a guest who presses Place order to sign in, then back to checkout", () => {
    const target = loginRedirectFor("/dashboard/checkout", "", false);
    expect(target).toBe("/login?callbackUrl=%2Fdashboard%2Fcheckout");
    // The login page resolves that value to checkout, not the dashboard.
    const callback = new URL(target!, "https://rangkaarii.in").searchParams.get("callbackUrl");
    expect(safeCallbackUrl(callback)).toBe("/dashboard/checkout");
  });

  it("keeps the query string of the page they were heading to", () => {
    expect(loginRedirectFor("/dashboard/orders/42", "?paid=1", false)).toBe(
      "/login?callbackUrl=%2Fdashboard%2Forders%2F42%3Fpaid%3D1",
    );
  });

  it.each(["/dashboard/orders", "/admin", "/admin/products", "/profile", "/settings"])(
    "asks a guest to sign in for %s",
    (path) => {
      expect(loginRedirectFor(path, "", false)).toMatch(/^\/login\?callbackUrl=/);
    },
  );

  it("does not match lookalike paths", () => {
    expect(loginRedirectFor("/administrator", "", false)).toBeNull();
    expect(loginRedirectFor("/dashboard/checkouts-info", "", false)).toBeNull();
  });

  it("lets a signed-in shopper straight through", () => {
    expect(loginRedirectFor("/dashboard/checkout", "", true)).toBeNull();
    expect(loginRedirectFor("/admin", "", true)).toBeNull();
  });
});
