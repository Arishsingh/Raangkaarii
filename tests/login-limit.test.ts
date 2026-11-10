import { describe, expect, it } from "vitest";

import { clientIp, MAX_FAILURES_PER_EMAIL, MAX_FAILURES_PER_IP } from "@/lib/login-limit";

const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

describe("login limit settings", () => {
  it("locks an address after 5 misses and an IP after 20", () => {
    expect(MAX_FAILURES_PER_EMAIL).toBe(5);
    expect(MAX_FAILURES_PER_IP).toBe(20);
  });

  it("reads the client IP from the first x-forwarded-for entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a shared bucket", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(req({}))).toBe("unknown");
    expect(clientIp(undefined)).toBe("unknown");
  });
});
