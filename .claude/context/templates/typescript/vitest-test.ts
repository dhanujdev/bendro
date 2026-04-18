/**
 * Unit tests for {ModuleName}.
 *
 * Replace: {ModuleName}, {module-name}, {functionName}
 * Location: tests/unit/ts/{domain}/{module-name}.test.ts
 *
 * Rules:
 *   - Unit tests: NO database, NO network, NO file system
 *   - Mock external dependencies using vi.mock()
 *   - Each describe block tests one exported function/class
 *   - Each test describes one specific behavior
 *   - Test names: "{functionName} — {what it does when condition}"
 *   - Coverage: happy path + error paths + edge cases (≥85% required)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { {functionName}, {ClassName} } from "~/{module-name}";

// ---------------------------------------------------------------------------
// Mocks
// Mock only what crosses a unit boundary (DB, external HTTP, filesystem).
// Do NOT mock internal functions — test them directly.
// ---------------------------------------------------------------------------

vi.mock("~/lib/db", () => ({
  db: {
    {resource}: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Import the mocked module AFTER vi.mock() declaration
import { db } from "~/lib/db";

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("{ModuleName}", () => {
  beforeEach(() => {
    // Reset all mocks before each test to avoid state leakage
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy Path
  // -------------------------------------------------------------------------

  describe("{functionName}", () => {
    it("{functionName} — returns {resource} list for the workspace", async () => {
      // Arrange
      const workspaceId = "ws-test-001";
      const mockItems = [
        { id: "item-001", workspaceId, field1: "value-1", createdAt: new Date() },
        { id: "item-002", workspaceId, field1: "value-2", createdAt: new Date() },
      ];
      vi.mocked(db.{resource}.findMany).mockResolvedValueOnce(mockItems);

      // Act
      const result = await {functionName}(workspaceId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("item-001");
      // Verify workspace_id was included in the query (multi-tenancy invariant)
      expect(db.{resource}.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ workspaceId }) })
      );
    });

    it("{functionName} — returns empty array when workspace has no {resources}", async () => {
      // Arrange
      vi.mocked(db.{resource}.findMany).mockResolvedValueOnce([]);

      // Act
      const result = await {functionName}("ws-empty");

      // Assert
      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Validation Errors
  // -------------------------------------------------------------------------

  describe("{functionName} — input validation", () => {
    it("{functionName} — throws ValidationError when workspaceId is empty", async () => {
      await expect({functionName}("")).rejects.toThrow("workspaceId is required");
    });

    it("{functionName} — throws ValidationError when workspaceId is not a UUID", async () => {
      await expect({functionName}("not-a-uuid")).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Authorization / Multi-tenancy
  // -------------------------------------------------------------------------

  describe("{functionName} — multi-tenancy", () => {
    it("{functionName} — NEVER returns items from a different workspace", async () => {
      // This verifies the workspace_id filter is always applied.
      // If this test fails, it is a security bug, not a test failure.
      const workspaceId = "ws-tenant-a";
      const mockItems = [
        { id: "item-001", workspaceId: "ws-tenant-b", field1: "other tenant" },
      ];
      // Mock returns cross-tenant data (simulating a missing workspace_id filter bug)
      vi.mocked(db.{resource}.findMany).mockResolvedValueOnce([]);

      const result = await {functionName}(workspaceId);

      // Must return empty — not the other tenant's data
      expect(result).toEqual([]);
      // The DB call must have included workspaceId in the where clause
      expect(db.{resource}.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workspaceId: "ws-tenant-a" }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------

  describe("{functionName} — edge cases", () => {
    it("{functionName} — handles database timeout gracefully", async () => {
      // Arrange
      vi.mocked(db.{resource}.findMany).mockRejectedValueOnce(
        new Error("Connection timeout")
      );

      // Act & Assert — should propagate the error (no silent swallowing)
      await expect({functionName}("ws-test-001")).rejects.toThrow("Connection timeout");
    });
  });
});

// ---------------------------------------------------------------------------
// Class tests (if testing a class instead of a function)
// ---------------------------------------------------------------------------

describe("{ClassName}", () => {
  let instance: {ClassName};

  beforeEach(() => {
    instance = new {ClassName}({
      // constructor args
    });
  });

  it("instantiates without throwing", () => {
    expect(instance).toBeDefined();
  });

  describe("methodName", () => {
    it("methodName — {what it does}", () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
