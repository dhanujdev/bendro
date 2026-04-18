/**
 * {ComponentName} — {one-line description of what this component renders/does}.
 *
 * Replace: {ComponentName}, {Props}, {description}
 * Location: apps/web/src/components/{domain}/{ComponentName}.tsx
 *           OR apps/admin/src/components/{domain}/{ComponentName}.tsx
 *
 * Follows:
 *   - Server Component by default; add "use client" only if you need hooks/interactivity
 *   - Props typed explicitly (no `any`)
 *   - All data fetching via tRPC (api.{resource}.{procedure}.useQuery / useMutation)
 *   - Tailwind CSS only — no inline styles, no CSS modules
 *   - Accessible: aria-labels on interactive elements, role where needed
 */

// Add "use client" directive ONLY if this component uses React hooks or browser APIs.
// "use client";

import { type FC } from "react";
import { api } from "~/lib/api";   // tRPC client

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface {ComponentName}Props {
  /** {Description of required prop}. */
  workspaceId: string;
  /** {Description of optional prop}. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-components (keep co-located if < 50 lines; extract if larger)
// ---------------------------------------------------------------------------

/**
 * Loading skeleton for {ComponentName}.
 * Shown while the tRPC query is in flight.
 */
function {ComponentName}Skeleton(): JSX.Element {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading {ComponentName}">
      <div className="h-4 w-48 rounded bg-gray-200" />
      <div className="h-4 w-full rounded bg-gray-200" />
      <div className="h-4 w-3/4 rounded bg-gray-200" />
    </div>
  );
}

/**
 * Error state for {ComponentName}.
 */
function {ComponentName}Error({ message }: { message: string }): JSX.Element {
  return (
    <div role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <strong>Error:</strong> {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * {ComponentName} — {full description of what this renders}.
 *
 * Data dependencies:
 *   - api.{resource}.list — fetches {resources} for the workspace
 *
 * @param props.workspaceId - The workspace UUID (used to scope all queries).
 * @param props.className - Optional Tailwind class overrides for the root element.
 */
const {ComponentName}: FC<{ComponentName}Props> = ({ workspaceId, className }) => {
  // tRPC query — scoped to workspaceId
  const { data, isLoading, error } = api.{resource}.list.useQuery(
    { workspaceId },
    {
      staleTime: 30_000,      // 30s cache — adjust per data freshness requirement
      retry: 1,               // one retry on failure
    }
  );

  if (isLoading) return <{ComponentName}Skeleton />;
  if (error) return <{ComponentName}Error message={error.message} />;

  return (
    <div className={className} data-testid="{component-name}">
      {/* Replace with actual component content */}
      {data?.data.length === 0 ? (
        <p className="text-sm text-gray-500">No {resources} yet.</p>
      ) : (
        <ul className="space-y-2">
          {data?.data.map((item) => (
            <li key={item.id} className="rounded border border-gray-200 px-4 py-3 text-sm">
              {/* Render item fields */}
              {item.field1}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default {ComponentName};
export type { {ComponentName}Props };
