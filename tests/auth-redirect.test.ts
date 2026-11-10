import { describe, expect, it } from "vitest";

import { DEFAULT_REDIRECT, safeCallbackUrl } from "@/lib/auth-redirect";

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
