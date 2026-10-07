import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, normalizeApiError } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("api error normalization", () => {
  it("preserves a safe validation category without exposing server text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ errors: { title: ["internal detail"] } }), { status: 400 })));
    await expect(apiRequest("/test")).rejects.toMatchObject({ kind: "validation", message: expect.not.stringContaining("internal detail") });
  });

  it("uses a generic message for server failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("System.InvalidOperationException: secret", { status: 500 })));
    await expect(apiRequest("/test")).rejects.toMatchObject({ kind: "server", message: expect.not.stringContaining("secret") });
  });

  it("normalizes network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiRequest("/test")).rejects.toMatchObject({ kind: "network", message: "The backend could not be reached. Please try again." });
  });

  it("classifies known statuses consistently", () => {
    expect(normalizeApiError(404).kind).toBe("not-found");
    expect(normalizeApiError(503).kind).toBe("server");
  });
});
