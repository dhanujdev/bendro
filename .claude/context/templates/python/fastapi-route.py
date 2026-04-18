"""{RESOURCE_NAME} route handlers.

Endpoints:
    GET  /api/v1/workspaces/{workspace_id}/{resources}              List {resources}
    POST /api/v1/workspaces/{workspace_id}/{resources}              Create a {resource}
    GET  /api/v1/workspaces/{workspace_id}/{resources}/{resource_id} Get a {resource}
    DELETE /api/v1/workspaces/{workspace_id}/{resources}/{resource_id} Delete a {resource}

All endpoints:
    - Require valid JWT via JWTMiddleware (no explicit auth check needed here)
    - Enforce workspace_id via get_workspace_context dependency
    - Use {ResourceName}Service for business logic
    - Return the standard ApiResponse envelope
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..dependencies.auth import WorkspaceContext, get_workspace_context, require_role
from ..dependencies.database import get_db
from ..repositories.{resource_name}_repository import {ResourceName}Repository
from ..schemas.common import ApiResponse, Meta
from ..services.{resource_name}_service import {ResourceName}Service

logger = structlog.get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class Create{ResourceName}Request(BaseModel):
    """{DOCSTRING: Describe the fields required to create a {ResourceName}}.

    Attributes:
        {field_1}: {description}.
        {field_2}: {description}.
    """

    field_1: str
    field_2: str


class {ResourceName}Data(BaseModel):
    """{DOCSTRING: Describes the {ResourceName} data returned in API responses}.

    Attributes:
        id: The {resource_name} UUID.
        workspace_id: The owning workspace UUID.
        {field_1}: {description}.
    """

    id: str
    workspace_id: str
    field_1: str
    created_at: str


# Type aliases
{ResourceName}Response = ApiResponse[{ResourceName}Data]
{ResourceName}ListResponse = ApiResponse[list[{ResourceName}Data]]


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------


@router.get(
    "/workspaces/{workspace_id}/{resources}",
    response_model={ResourceName}ListResponse,
    summary="List {resources} for a workspace",
)
async def list_{resources}(
    ctx: WorkspaceContext = Depends(get_workspace_context),
    db=Depends(get_db),
) -> {ResourceName}ListResponse:
    """List all {resources} for the authenticated workspace.

    Args:
        ctx: Workspace context extracted from JWT (enforces workspace_id).
        db: Async SQLAlchemy session.

    Returns:
        {ResourceName}ListResponse with list of {resource_name} records.
    """
    repo = {ResourceName}Repository(db)
    service = {ResourceName}Service(repo)

    items = await service.list_for_workspace(workspace_id=ctx.workspace_id)

    return {ResourceName}ListResponse(
        data=[{ResourceName}Data(**item.dict()) for item in items],
        meta=Meta(
            requestId=ctx.request_id,
            timestamp=datetime.now(timezone.utc),
            version="1",
        ),
    )


@router.post(
    "/workspaces/{workspace_id}/{resources}",
    response_model={ResourceName}Response,
    status_code=201,
    summary="Create a {resource_name}",
)
async def create_{resource_name}(
    body: Create{ResourceName}Request,
    ctx: WorkspaceContext = Depends(require_role("WORKSPACE_MEMBER")),
    db=Depends(get_db),
) -> {ResourceName}Response:
    """Create a new {resource_name} in the authenticated workspace.

    Args:
        body: Create{ResourceName}Request with required fields.
        ctx: Workspace context (requires WORKSPACE_MEMBER role minimum).
        db: Async SQLAlchemy session.

    Returns:
        {ResourceName}Response with the created {resource_name} data.

    Raises:
        HTTPException: 422 if validation fails.
        HTTPException: 409 if a conflicting {resource_name} already exists.
    """
    repo = {ResourceName}Repository(db)
    service = {ResourceName}Service(repo)

    item = await service.create(
        workspace_id=ctx.workspace_id,
        user_id=ctx.user_id,
        **body.dict(),
    )

    logger.info(
        "{resource_name}_created",
        workspace_id=ctx.workspace_id,
        user_id=ctx.user_id,
        {resource_name}_id=item.id,
    )

    return {ResourceName}Response(
        data={ResourceName}Data(**item.dict()),
        meta=Meta(
            requestId=ctx.request_id,
            timestamp=datetime.now(timezone.utc),
            version="1",
        ),
    )
