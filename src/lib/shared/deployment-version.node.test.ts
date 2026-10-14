import { isNewDeployment, isStaleServerActionError } from "@/lib/shared/deployment-version";
import { describe, expect, it } from "vitest";

describe("isNewDeployment", () => {
  it("is true when the server runs a different build", () => {
    expect(isNewDeployment("abc123", "def456")).toBe(true);
  });

  it("is false for the same build", () => {
    expect(isNewDeployment("abc123", "abc123")).toBe(false);
  });

  it("is false when either id is unknown (dev / local build)", () => {
    expect(isNewDeployment("", "def456")).toBe(false);
    expect(isNewDeployment("abc123", "")).toBe(false);
    expect(isNewDeployment("abc123", null)).toBe(false);
    expect(isNewDeployment("abc123", undefined)).toBe(false);
  });
});

describe("isStaleServerActionError", () => {
  it("matches the Next.js client error for an unknown action id", () => {
    const err = new Error(
      'Server Action "00516c613a25054bd8614aefdb8854e78e91bc13a5" was not found on the server. \nRead more: https://nextjs.org/docs/messages/failed-to-find-server-action'
    );
    expect(isStaleServerActionError(err)).toBe(true);
  });

  it("matches by error name", () => {
    const err = new Error("whatever");
    err.name = "UnrecognizedActionError";
    expect(isStaleServerActionError(err)).toBe(true);
  });

  it("matches the server-side log wording", () => {
    expect(
      isStaleServerActionError(
        new Error(
          'Failed to find Server Action "00516c". This request might be from an older or newer deployment.'
        )
      )
    ).toBe(true);
  });

  it("ignores unrelated errors and non-errors", () => {
    expect(isStaleServerActionError(new Error("Request failed with status code 429"))).toBe(false);
    expect(isStaleServerActionError("was not found on the server")).toBe(false);
    expect(isStaleServerActionError(undefined)).toBe(false);
  });
});
