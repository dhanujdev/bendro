"""{ResourceName}Repository — Database access for {resource_name} records.

All queries enforce workspace_id isolation (multi-tenancy invariant).
No business logic here — only data access.

See docs/ADR/0015-repository-pattern-db-access.md.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = structlog.get_logger(__name__)


@dataclass
class {ResourceName}Record:
    """{DOCSTRING: Data class representing a {resource_name} row}.

    Attributes:
        id: Primary key UUID.
        workspace_id: Owning workspace UUID (multi-tenancy key).
        {field_1}: {description}.
        created_at: Record creation timestamp.
    """

    id: str
    workspace_id: str
    field_1: str
    created_at: datetime

    def dict(self) -> dict:
        """Convert to dict for response serialization."""
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "field_1": self.field_1,
            "created_at": self.created_at.isoformat(),
        }


class {ResourceName}Repository:
    """{DOCSTRING: Repository for {resource_name} DB access}.

    All methods require workspace_id to enforce multi-tenancy.
    No method accesses data across workspace boundaries.

    Args:
        db: Async SQLAlchemy session injected via FastAPI dependency.
    """

    def __init__(self, db: AsyncSession) -> None:
        """Initialize with an injected database session.

        Args:
            db: Async SQLAlchemy session.
        """
        self.db = db

    async def list_by_workspace(
        self,
        workspace_id: str,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> list[{ResourceName}Record]:
        """List {resource_name} records for a workspace.

        Args:
            workspace_id: Workspace UUID — only records for this workspace returned.
            limit: Maximum number of records to return (default 50, max 200).
            offset: Pagination offset.

        Returns:
            List of {ResourceName}Record ordered by created_at descending.
        """
        limit = min(limit, 200)  # Enforce max page size

        result = await self.db.execute(
            text(
                """
                SELECT id, workspace_id, field_1, created_at
                FROM {table_name}
                WHERE workspace_id = :workspace_id
                  AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            {"workspace_id": workspace_id, "limit": limit, "offset": offset},
        )
        rows = result.mappings().all()
        return [{ResourceName}Record(**dict(row)) for row in rows]

    async def get_by_id(
        self,
        workspace_id: str,
        record_id: str,
    ) -> Optional[{ResourceName}Record]:
        """Get a single {resource_name} record by ID within a workspace.

        Workspace scoping prevents cross-tenant access — returns None
        if the ID exists but belongs to a different workspace.

        Args:
            workspace_id: Workspace UUID (from JWT tenantId claim).
            record_id: The {resource_name} UUID to look up.

        Returns:
            {ResourceName}Record if found in this workspace, None otherwise.
        """
        result = await self.db.execute(
            text(
                """
                SELECT id, workspace_id, field_1, created_at
                FROM {table_name}
                WHERE id = :id
                  AND workspace_id = :workspace_id
                  AND deleted_at IS NULL
                """
            ),
            {"id": record_id, "workspace_id": workspace_id},
        )
        row = result.mappings().first()
        if row is None:
            return None
        return {ResourceName}Record(**dict(row))

    async def create(
        self,
        workspace_id: str,
        user_id: str,
        field_1: str,
    ) -> {ResourceName}Record:
        """Insert a new {resource_name} record.

        Args:
            workspace_id: Owning workspace UUID.
            user_id: Creating user UUID.
            field_1: {description}.

        Returns:
            The newly created {ResourceName}Record.
        """
        record_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        await self.db.execute(
            text(
                """
                INSERT INTO {table_name} (id, workspace_id, user_id, field_1, created_at)
                VALUES (:id, :workspace_id, :user_id, :field_1, :created_at)
                """
            ),
            {
                "id": record_id,
                "workspace_id": workspace_id,
                "user_id": user_id,
                "field_1": field_1,
                "created_at": now,
            },
        )
        await self.db.commit()

        logger.info(
            "{resource_name}_created",
            workspace_id=workspace_id,
            record_id=record_id,
        )

        return {ResourceName}Record(
            id=record_id,
            workspace_id=workspace_id,
            field_1=field_1,
            created_at=now,
        )

    async def soft_delete(
        self,
        workspace_id: str,
        record_id: str,
    ) -> bool:
        """Soft-delete a {resource_name} record (sets deleted_at).

        Args:
            workspace_id: Workspace UUID (enforces ownership).
            record_id: The {resource_name} UUID to soft-delete.

        Returns:
            True if the record was found and soft-deleted, False otherwise.
        """
        result = await self.db.execute(
            text(
                """
                UPDATE {table_name}
                SET deleted_at = :now
                WHERE id = :id
                  AND workspace_id = :workspace_id
                  AND deleted_at IS NULL
                RETURNING id
                """
            ),
            {"id": record_id, "workspace_id": workspace_id, "now": datetime.now(timezone.utc)},
        )
        await self.db.commit()
        return result.first() is not None
