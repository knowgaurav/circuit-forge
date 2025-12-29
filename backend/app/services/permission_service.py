"""Permission management service."""

from datetime import datetime
from typing import Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.exceptions.base import AuthorizationException, NotFoundException
from app.models.session import EditRequest, EditRequestStatus, Participant, Role
from app.repositories.participant_repository import ParticipantRepository
from app.repositories.session_repository import SessionRepository


class PermissionService:
    """Service for managing edit permissions and requests."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        """Initialize permission service."""
        self._session_repo = SessionRepository(database)
        self._participant_repo = ParticipantRepository(database)
        self._database = database
        # In-memory store for pending edit requests (per session)
        self._edit_requests: Dict[str, Dict[str, EditRequest]] = {}

    def can_edit(self, participant: Participant) -> bool:
        """Check if a participant has edit permission."""
        return participant.can_edit

    async def check_edit_permission(
        self, session_code: str, participant_id: str
    ) -> bool:
        """
        Check if a participant can edit the circuit.
        
        Raises AuthorizationException if not permitted.
        """
        participant = await self._participant_repo.find_by_id(
            session_code, participant_id
        )
        if participant is None:
            raise NotFoundException("Participant", participant_id)
        
        if not participant.can_edit:
            raise AuthorizationException(
                "edit circuit",
                "You do not have edit permission. Request access from the teacher.",
            )
        return True

    async def request_edit_access(
        self, session_code: str, participant_id: str
    ) -> EditRequest:
        """
        Create an edit access request from a student.
        
        Returns the created EditRequest.
        """
        participant = await self._participant_repo.find_by_id(
            session_code, participant_id
        )
        if participant is None:
            raise NotFoundException("Participant", participant_id)
        
        if participant.can_edit:
            raise AuthorizationException(
                "request edit access",
                "You already have edit permission.",
            )
        
        if participant.role == Role.TEACHER:
            raise AuthorizationException(
                "request edit access",
                "Teachers already have edit permission.",
            )
        
        # Check if there's already a pending request
        session_requests = self._edit_requests.get(session_code, {})
        existing = session_requests.get(participant_id)
        if existing and existing.status == EditRequestStatus.PENDING:
            return existing
        
        # Create new request
        request = EditRequest(
            participantId=participant_id,
            displayName=participant.display_name,
            requestedAt=datetime.utcnow(),
            status=EditRequestStatus.PENDING,
        )
        
        if session_code not in self._edit_requests:
            self._edit_requests[session_code] = {}
        self._edit_requests[session_code][participant_id] = request
        
        return request

    async def get_pending_requests(self, session_code: str) -> List[EditRequest]:
        """Get all pending edit requests for a session."""
        session_requests = self._edit_requests.get(session_code, {})
        return [
            req for req in session_requests.values()
            if req.status == EditRequestStatus.PENDING
        ]

    async def approve_edit_request(
        self,
        session_code: str,
        teacher_id: str,
        student_id: str,
    ) -> bool:
        """
        Approve an edit request from a student.
        
        Args:
            session_code: Session code
            teacher_id: ID of the teacher approving
            student_id: ID of the student being approved
            
        Returns:
            True if approved successfully
        """
        # Verify teacher has permission
        teacher = await self._participant_repo.find_by_id(session_code, teacher_id)
        if teacher is None:
            raise NotFoundException("Participant", teacher_id)
        
        if teacher.role != Role.TEACHER:
            raise AuthorizationException(
                "approve edit request",
                "Only teachers can approve edit requests.",
            )
        
        # Find and update the request
        session_requests = self._edit_requests.get(session_code, {})
        request = session_requests.get(student_id)
        
        if request is None or request.status != EditRequestStatus.PENDING:
            raise NotFoundException("Edit request", student_id)
        
        # Update request status
        request.status = EditRequestStatus.APPROVED
        
        # Grant edit permission
        await self._participant_repo.update_can_edit(session_code, student_id, True)
        
        return True

    async def deny_edit_request(
        self,
        session_code: str,
        teacher_id: str,
        student_id: str,
    ) -> bool:
        """
        Deny an edit request from a student.
        
        Args:
            session_code: Session code
            teacher_id: ID of the teacher denying
            student_id: ID of the student being denied
            
        Returns:
            True if denied successfully
        """
        # Verify teacher has permission
        teacher = await self._participant_repo.find_by_id(session_code, teacher_id)
        if teacher is None:
            raise NotFoundException("Participant", teacher_id)
        
        if teacher.role != Role.TEACHER:
            raise AuthorizationException(
                "deny edit request",
                "Only teachers can deny edit requests.",
            )
        
        # Find and update the request
        session_requests = self._edit_requests.get(session_code, {})
        request = session_requests.get(student_id)
        
        if request is None or request.status != EditRequestStatus.PENDING:
            raise NotFoundException("Edit request", student_id)
        
        # Update request status
        request.status = EditRequestStatus.DENIED
        
        return True

    async def revoke_edit_permission(
        self,
        session_code: str,
        teacher_id: str,
        student_id: str,
    ) -> bool:
        """
        Revoke edit permission from a student.
        
        Args:
            session_code: Session code
            teacher_id: ID of the teacher revoking
            student_id: ID of the student losing permission
            
        Returns:
            True if revoked successfully
        """
        # Verify teacher has permission
        teacher = await self._participant_repo.find_by_id(session_code, teacher_id)
        if teacher is None:
            raise NotFoundException("Participant", teacher_id)
        
        if teacher.role != Role.TEACHER:
            raise AuthorizationException(
                "revoke edit permission",
                "Only teachers can revoke edit permissions.",
            )
        
        # Verify student exists and has edit permission
        student = await self._participant_repo.find_by_id(session_code, student_id)
        if student is None:
            raise NotFoundException("Participant", student_id)
        
        if student.role == Role.TEACHER:
            raise AuthorizationException(
                "revoke edit permission",
                "Cannot revoke edit permission from a teacher.",
            )
        
        # Revoke permission
        await self._participant_repo.update_can_edit(session_code, student_id, False)
        
        # Clear any existing request
        session_requests = self._edit_requests.get(session_code, {})
        if student_id in session_requests:
            del session_requests[student_id]
        
        return True

    def cleanup_session_requests(self, session_code: str) -> None:
        """Clean up edit requests when a session is deleted."""
        if session_code in self._edit_requests:
            del self._edit_requests[session_code]
