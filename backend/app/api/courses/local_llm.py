"""Local-LLM routes: test the tunnel connection and list available models.

Why this module exists separately
---------------------------------
Self-hosted models (Ollama, LM Studio, vLLM) are reached through a tunnel
authenticated by a bridge token rather than a cloud API key, so they have
their own request shapes and don't go through ``CourseService``. These two
routes talk directly to :class:`LocalLLMStrategy`.

Routes
------
* ``POST /courses/test-local-connection`` — "Say OK" round-trip to confirm the
  tunnel URL + bridge token work.
* ``POST /courses/local-models``          — list the models the server has
  loaded (so the UI can populate a dropdown).

``fetch_local_models`` never raises to the client: on error it returns
``success=False`` with a human-readable message, since a missing/loading
server is an expected, recoverable condition for the UI.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.logger import get_logger
from app.models.course import TestConnectionResponse
from app.services.llm_providers import LocalLLMStrategy

from ._shared import handle_exception

logger = get_logger()

router = APIRouter()


class TestLocalConnectionRequest(BaseModel):
    """Request to test local LLM connection."""
    base_url: str = Field(alias="baseUrl")
    token: str
    model: str

    model_config = {"populate_by_name": True}


class FetchLocalModelsRequest(BaseModel):
    """Request to fetch models from local LLM."""
    base_url: str = Field(alias="baseUrl")
    token: str

    model_config = {"populate_by_name": True}


class FetchLocalModelsResponse(BaseModel):
    """Response for fetching local models."""
    success: bool
    models: list[str] | None = None
    message: str | None = None


@router.post("/courses/test-local-connection", response_model=TestConnectionResponse)
async def test_local_connection(request: TestLocalConnectionRequest) -> TestConnectionResponse:
    """Test connection to local LLM via tunnel.

    Uses the bridge token for authentication.
    """
    try:
        local_provider = LocalLLMStrategy()
        result = await local_provider.test_connection(
            base_url=request.base_url,
            bridge_token=request.token,
            model=request.model,
        )
        return TestConnectionResponse(
            success=result["success"],
            message=result.get("message", ""),
            error=result.get("error"),
        )
    except Exception as e:
        handle_exception(e)
        raise


@router.post("/courses/local-models", response_model=FetchLocalModelsResponse)
async def fetch_local_models(request: FetchLocalModelsRequest) -> FetchLocalModelsResponse:
    """Fetch available models from local LLM server.

    Uses the bridge token for authentication.
    """
    try:
        local_provider = LocalLLMStrategy()
        models = await local_provider.list_models(
            base_url=request.base_url,
            bridge_token=request.token,
        )
        if models:
            return FetchLocalModelsResponse(success=True, models=models)
        else:
            return FetchLocalModelsResponse(
                success=False,
                message="No models found. Make sure your LLM server is running and has models loaded.",
            )
    except Exception as e:
        logger.error(f"Failed to fetch local models: {e}")
        return FetchLocalModelsResponse(
            success=False,
            message=str(e),
        )
