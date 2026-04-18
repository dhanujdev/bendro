/**
 * {ResourceName} tRPC router.
 *
 * Procedures:
 *   list    — List all {resources} for the authenticated workspace
 *   getById — Get a single {resource} by ID
 *   create  — Create a new {resource}
 *   delete  — Soft-delete a {resource}
 *
 * All procedures:
 *   - Require authentication (via protectedProcedure)
 *   - Scope all queries to ctx.session.user.workspaceId (multi-tenancy)
 *   - Return the standard response shape { data, meta }
 *
 * Replace: {ResourceName}, {resource}, {resources}, {FieldSchema}
 * Location: packages/shared/src/routers/{resource}.router.ts
 * See: docs/specs/openapi/v1/{resource}.yaml for the contract
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";

// ---------------------------------------------------------------------------
// Input schemas (mirror the OpenAPI contract)
// ---------------------------------------------------------------------------

const Create{ResourceName}Schema = z.object({
  /** {Description of field1}. */
  field1: z.string().min(1).max(255),
  /** {Description of field2 — optional with default}. */
  field2: z.string().optional(),
});

const {ResourceName}IdSchema = z.object({
  id: z.string().uuid("Must be a valid UUID"),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const {resource}Router = router({
  /**
   * List all {resources} for the authenticated workspace.
   *
   * @returns Array of {ResourceName} records ordered by createdAt descending.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { workspaceId } = ctx.session.user;

    const items = await ctx.db.{resource}.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: items,
      meta: {
        requestId: ctx.requestId,
        timestamp: new Date().toISOString(),
        version: "1",
      },
    };
  }),

  /**
   * Get a single {resource} by ID within the authenticated workspace.
   * Returns NOT_FOUND (not FORBIDDEN) for cross-tenant IDs — prevents enumeration.
   *
   * @param input.id - The {resource} UUID.
   * @throws TRPCError NOT_FOUND if the {resource} does not exist in this workspace.
   */
  getById: protectedProcedure
    .input({ResourceName}IdSchema)
    .query(async ({ ctx, input }) => {
      const { workspaceId } = ctx.session.user;

      const item = await ctx.db.{resource}.findFirst({
        where: {
          id: input.id,
          workspaceId,   // ← workspace scope enforced here (multi-tenancy invariant)
          deletedAt: null,
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `{ResourceName} ${input.id} not found`,
        });
      }

      return {
        data: item,
        meta: {
          requestId: ctx.requestId,
          timestamp: new Date().toISOString(),
          version: "1",
        },
      };
    }),

  /**
   * Create a new {resource} in the authenticated workspace.
   * Requires WORKSPACE_MEMBER role or above.
   *
   * @param input - Create{ResourceName}Schema fields.
   * @returns The newly created {ResourceName}.
   */
  create: protectedProcedure
    .input(Create{ResourceName}Schema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, userId } = ctx.session.user;

      // Role check — minimum WORKSPACE_MEMBER
      if (!["WORKSPACE_OWNER", "WORKSPACE_MEMBER"].includes(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to create a {resource}",
        });
      }

      const item = await ctx.db.{resource}.create({
        data: {
          workspaceId,
          createdBy: userId,
          field1: input.field1,
          field2: input.field2 ?? null,
        },
      });

      return {
        data: item,
        meta: {
          requestId: ctx.requestId,
          timestamp: new Date().toISOString(),
          version: "1",
        },
      };
    }),

  /**
   * Soft-delete a {resource} by setting deletedAt.
   * Only the workspace owner or the creator may delete.
   *
   * @param input.id - The {resource} UUID to delete.
   * @throws TRPCError NOT_FOUND if not found in this workspace.
   * @throws TRPCError FORBIDDEN if the caller lacks delete permission.
   */
  delete: protectedProcedure
    .input({ResourceName}IdSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, userId, role } = ctx.session.user;

      const item = await ctx.db.{resource}.findFirst({
        where: { id: input.id, workspaceId, deletedAt: null },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "{ResourceName} not found" });
      }

      // Only owner or creator may delete
      const canDelete = role === "WORKSPACE_OWNER" || item.createdBy === userId;
      if (!canDelete) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this {resource}" });
      }

      await ctx.db.{resource}.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { data: { id: input.id }, meta: { requestId: ctx.requestId, timestamp: new Date().toISOString(), version: "1" } };
    }),
});
