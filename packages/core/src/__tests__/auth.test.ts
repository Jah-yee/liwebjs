import { describe, it, expect } from "vitest";
import { validateAuth } from "../auth";

describe("validateAuth — auth disabled", () => {
  it("allows all connections when no secret set", () => {
    const result = validateAuth({}, {});
    expect(result.valid).toBe(true);
    expect(result.user).toBeNull();
  });
});

describe("validateAuth — auth enabled", () => {
  const options = { secret: "supersecret" };

  it("rejects missing payload", () => {
    expect(validateAuth(null, options).valid).toBe(false);
    expect(validateAuth(undefined, options).valid).toBe(false);
    expect(validateAuth("string", options).valid).toBe(false);
  });

  it("rejects wrong secret", () => {
    const result = validateAuth({ secret: "wrongsecret" }, options);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("accepts correct secret", () => {
    const result = validateAuth({ secret: "supersecret" }, options);
    expect(result.valid).toBe(true);
  });

  it("returns null user when no secure object provided", () => {
    const result = validateAuth({ secret: "supersecret" }, options);
    expect(result.user).toBeNull();
  });

  it("returns user from secure object", () => {
    const result = validateAuth(
      {
        secret: "supersecret",
        secure: { id: "user_101", name: "Sumeet", role: "admin" },
      },
      options,
    );
    expect(result.valid).toBe(true);
    expect(result.user).toEqual({
      id: "user_101",
      name: "Sumeet",
      role: "admin",
    });
  });

  it("includes reason on failure", () => {
    const result = validateAuth({ secret: "bad" }, options);
    expect(result.reason).toBe("invalid secret");
  });

  it("includes reason for missing auth payload", () => {
    const result = validateAuth({}, options);
    expect(result.reason).toBe("missing auth payload");
  });
});