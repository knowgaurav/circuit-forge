"""Session API endpoints."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from pydantic import BaseModel, Field

from app.core.database import db_manager
from app.exceptions.base import AppException, NotFoundException, ValidationException
from app.models.circuit import CircuitState
from app.models.session import Participant, Session
from app.services.circuit_service import CircuitService
from app.services.session_service import SessionService
from app.websocket.handler import ws_handler

router = APIRouter()


# Request/Response models
class CreateSessionResponse(BaseModel):
    """Response for session creation."""
    code: str
    participant_id: str = Field(alias="participantId")

    model_config = {"populate_by_name": True}


class JoinSessionRequest(BaseModel):
    """Request to join a session."""
    display_name: str = Field(alias="displayName", min_length=3, max_length=20)
    participant_id: Optional[str] = Field(default=None, alias="participantId")

    model_config = {"populate_by_name": True}


class JoinSessionResponse(BaseModel):
    """Response for joining a session."""
    participant: Participant


class SessionInfoResponse(BaseModel):
    """Response for session info."""
    code: str
    exists: bool
    participant_count: int = Field(alias="participantCount")

    model_config = {"populate_by_name": True}


class ImportCircuitRequest(BaseModel):
    """Request to import a circuit."""
    circuit: Dict[str, Any]


class ImportCircuitResponse(BaseModel):
    """Response for circuit import."""
    success: bool
    version: int


class ErrorResponse(BaseModel):
    """Error response."""
    error: Dict[str, str]


# Dependency to get services
def get_session_service() -> SessionService:
    """Get session service instance."""
    return SessionService(db_manager.get_database())


def get_circuit_service() -> CircuitService:
    """Get circuit service instance."""
    return CircuitService(db_manager.get_database())


# Exception handler helper
def handle_exception(e: Exception) -> None:
    """Convert app exceptions to HTTP exceptions."""
    if isinstance(e, NotFoundException):
        raise HTTPException(status_code=404, detail={"error": {"code": e.code, "message": e.message}})
    elif isinstance(e, ValidationException):
        raise HTTPException(status_code=400, detail={"error": {"code": e.code, "message": e.message}})
    elif isinstance(e, AppException):
        raise HTTPException(status_code=e.status_code, detail={"error": {"code": e.code, "message": e.message}})
    else:
        raise HTTPException(status_code=500, detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}})


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(
    session_service: SessionService = Depends(get_session_service),
) -> CreateSessionResponse:
    """Create a new collaborative session."""
    try:
        session, participant_id = await session_service.create_session()
        return CreateSessionResponse(code=session.code, participantId=participant_id)
    except Exception as e:
        handle_exception(e)


@router.get("/sessions/{code}", response_model=SessionInfoResponse)
async def get_session(
    code: str,
    session_service: SessionService = Depends(get_session_service),
) -> SessionInfoResponse:
    """Get session information."""
    try:
        exists = await session_service.session_exists(code.upper())
        if not exists:
            return SessionInfoResponse(
                code=code.upper(),
                exists=False,
                participantCount=0,
            )
        
        participants = await session_service.get_session_participants(code.upper())
        return SessionInfoResponse(
            code=code.upper(),
            exists=True,
            participantCount=len(participants),
        )
    except Exception as e:
        handle_exception(e)


@router.post("/sessions/{code}/join", response_model=JoinSessionResponse)
async def join_session(
    code: str,
    request: JoinSessionRequest,
    session_service: SessionService = Depends(get_session_service),
) -> JoinSessionResponse:
    """Join an existing session."""
    try:
        participant = await session_service.join_session(
            code.upper(),
            request.display_name,
            request.participant_id,
        )
        return JoinSessionResponse(participant=participant)
    except Exception as e:
        handle_exception(e)


@router.get("/sessions/{code}/circuit")
async def get_circuit(
    code: str,
    circuit_service: CircuitService = Depends(get_circuit_service),
    session_service: SessionService = Depends(get_session_service),
) -> Dict[str, Any]:
    """Get current circuit state."""
    try:
        # Verify session exists
        await session_service.get_session(code.upper())
        
        state = await circuit_service.get_circuit_state(code.upper())
        return state.model_dump(by_alias=True)
    except Exception as e:
        handle_exception(e)


@router.post("/sessions/{code}/export/json")
async def export_json(
    code: str,
    circuit_service: CircuitService = Depends(get_circuit_service),
    session_service: SessionService = Depends(get_session_service),
) -> Dict[str, Any]:
    """Export circuit as JSON."""
    try:
        # Verify session exists
        await session_service.get_session(code.upper())
        
        state = await circuit_service.get_circuit_state(code.upper())
        return state.model_dump(by_alias=True)
    except Exception as e:
        handle_exception(e)


@router.post("/sessions/{code}/import", response_model=ImportCircuitResponse)
async def import_circuit(
    code: str,
    request: ImportCircuitRequest,
    circuit_service: CircuitService = Depends(get_circuit_service),
    session_service: SessionService = Depends(get_session_service),
) -> ImportCircuitResponse:
    """Import circuit from JSON."""
    try:
        # Verify session exists
        await session_service.get_session(code.upper())
        
        # Validate and parse circuit state
        try:
            imported_state = CircuitState.model_validate(request.circuit)
        except Exception:
            raise ValidationException(
                message="Invalid circuit file",
                code="INVALID_CIRCUIT_FILE",
            )
        
        # For now, we'll just validate the import
        # Full import would require clearing existing state and adding all components
        return ImportCircuitResponse(success=True, version=imported_state.version)
    except Exception as e:
        handle_exception(e)


# WebSocket endpoint
@router.websocket("/ws/{code}/{participant_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    code: str,
    participant_id: str,
) -> None:
    """WebSocket endpoint for real-time collaboration."""
    await ws_handler.handle_connection(websocket, code.upper(), participant_id)
