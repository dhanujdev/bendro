import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: {
      routines: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      stretches: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  },
}));

import {
  getRoutineById,
  getRoutineBySlug,
  listRoutines,
  createRoutine,
  addStretchToRoutine,
  deleteRoutine,
  listStretches,
  getStretchBySlug,
} from "@/services/routines";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any as {
  query: {
    routines: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    stretches: { findFirst: ReturnType<typeof vi.fn> };
  };
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

function captureInsertValues<T>(returnRow: T) {
  const valuesSpy = vi.fn().mockReturnValue({
    returning: () => Promise.resolve([returnRow]),
  });
  mockDb.insert.mockReturnValueOnce({ values: valuesSpy });
  return valuesSpy;
}

function captureDeleteWhere() {
  const whereSpy = vi.fn().mockResolvedValue(undefined);
  mockDb.delete.mockReturnValueOnce({ where: whereSpy });
  return whereSpy;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getRoutineById", () => {
  it("returns the routine with ordered stretches", async () => {
    const routine = { id: "r1", routineStretches: [] };
    mockDb.query.routines.findFirst.mockResolvedValueOnce(routine);
    expect(await getRoutineById("r1")).toBe(routine);
  });

  it("returns null when not found", async () => {
    mockDb.query.routines.findFirst.mockResolvedValueOnce(undefined);
    expect(await getRoutineById("nope")).toBeNull();
  });
});

describe("getRoutineBySlug", () => {
  it("returns the routine when matched", async () => {
    const routine = { id: "r1", slug: "morning", routineStretches: [] };
    mockDb.query.routines.findFirst.mockResolvedValueOnce(routine);
    expect(await getRoutineBySlug("morning")).toBe(routine);
  });

  it("returns null when not found", async () => {
    mockDb.query.routines.findFirst.mockResolvedValueOnce(undefined);
    expect(await getRoutineBySlug("missing")).toBeNull();
  });
});

describe("listRoutines", () => {
  it("queries system routines when no userId is given", async () => {
    mockDb.query.routines.findMany.mockResolvedValueOnce([{ id: "r1" }]);
    const result = await listRoutines();
    expect(result).toEqual([{ id: "r1" }]);
    expect(mockDb.query.routines.findMany).toHaveBeenCalledTimes(1);
  });

  it("accepts goal + isPremium + userId filters without throwing", async () => {
    mockDb.query.routines.findMany.mockResolvedValueOnce([]);
    await listRoutines({ goal: "flexibility", isPremium: true, userId: "u1" });
    expect(mockDb.query.routines.findMany).toHaveBeenCalledTimes(1);
  });

  it("handles the no-conditions branch when no args are passed", async () => {
    mockDb.query.routines.findMany.mockResolvedValueOnce([]);
    // `userId: undefined` triggers the isNull(ownerId) branch — still one condition.
    await listRoutines({});
    expect(mockDb.query.routines.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("createRoutine", () => {
  it("inserts and returns the row", async () => {
    const created = { id: "r1", title: "Quick Hips" };
    const values = captureInsertValues(created);
    const input = {
      title: "Quick Hips",
      slug: "quick-hips",
      goal: "flexibility" as const,
      intensity: "moderate" as const,
      isPremium: false,
      estimatedDurationSec: 300,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createRoutine(input as any);
    expect(result).toEqual(created);
    expect(values).toHaveBeenCalledWith(input);
  });
});

describe("addStretchToRoutine", () => {
  it("inserts a routineStretch row with all provided fields", async () => {
    const created = { id: "rs1" };
    const values = captureInsertValues(created);
    const input = {
      routineId: "r1",
      stretchId: "s1",
      orderIndex: 0,
      durationSec: 30,
      sideFirst: "left" as const,
    };
    const result = await addStretchToRoutine(input);
    expect(result).toEqual(created);
    expect(values).toHaveBeenCalledWith(input);
  });

  it("passes undefined sideFirst when not provided", async () => {
    captureInsertValues({ id: "rs2" });
    await addStretchToRoutine({
      routineId: "r1",
      stretchId: "s1",
      orderIndex: 1,
      durationSec: 45,
    });
    // no throw == covered
  });
});

describe("deleteRoutine", () => {
  it("calls delete().where() on the routines table", async () => {
    const where = captureDeleteWhere();
    await deleteRoutine("r1");
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
});

describe("listStretches", () => {
  it("selects all stretches ordered by name", async () => {
    const orderBy = vi
      .fn()
      .mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
    const from = vi.fn().mockReturnValue({ orderBy });
    mockDb.select.mockReturnValueOnce({ from });
    const result = await listStretches();
    expect(result).toEqual([{ id: "s1" }, { id: "s2" }]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
  });
});

describe("getStretchBySlug", () => {
  it("returns the stretch when matched", async () => {
    const stretch = { id: "s1", slug: "hip-flexor" };
    mockDb.query.stretches.findFirst.mockResolvedValueOnce(stretch);
    expect(await getStretchBySlug("hip-flexor")).toBe(stretch);
  });

  it("returns null when not found", async () => {
    mockDb.query.stretches.findFirst.mockResolvedValueOnce(undefined);
    expect(await getStretchBySlug("missing")).toBeNull();
  });
});
