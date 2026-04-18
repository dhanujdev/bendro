import { describe, it, expect } from "vitest";
import {
  ERROR_CODES,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http";

describe("errorResponse", () => {
  it("maps codes to standard HTTP statuses", async () => {
    const cases: Array<[keyof typeof ERROR_CODES, number]> = [
      ["VALIDATION_ERROR", 400],
      ["INVALID_JSON", 400],
      ["NOT_FOUND", 404],
      ["UNAUTHENTICATED", 401],
      ["FORBIDDEN", 403],
      ["CONFLICT", 409],
      ["RATE_LIMITED", 429],
      ["INTERNAL", 500],
    ];
    for (const [code, status] of cases) {
      const res = errorResponse(ERROR_CODES[code], "x");
      expect(res.status).toBe(status);
    }
  });

  it("allows an explicit status override", () => {
    const res = errorResponse(ERROR_CODES.VALIDATION_ERROR, "x", {
      status: 418,
    });
    expect(res.status).toBe(418);
  });

  it("includes details when provided", async () => {
    const res = errorResponse(ERROR_CODES.VALIDATION_ERROR, "bad", {
      details: [{ path: ["x"], message: "required" }],
    });
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("bad");
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it("omits the details field when not provided", async () => {
    const res = errorResponse(ERROR_CODES.NOT_FOUND, "gone");
    const body = await res.json();
    expect(body.error.details).toBeUndefined();
  });
});

describe("jsonResponse", () => {
  it("returns 200 by default", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("honors a custom status", async () => {
    const res = jsonResponse({ id: "x" }, { status: 201 });
    expect(res.status).toBe(201);
  });
});

describe("readJsonBody", () => {
  it("returns {ok: true, body} on valid JSON", async () => {
    const req = new Request("http://x/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x: 1 }),
    });
    const result = await readJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toEqual({ x: 1 });
  });

  it("returns {ok: false, response} with INVALID_JSON on malformed input", async () => {
    const req = new Request("http://x/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    const result = await readJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe("INVALID_JSON");
    }
  });
});
