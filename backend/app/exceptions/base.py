"""Custom exception hierarchy for CircuitForge."""



class AppException(Exception):
    """Base exception for all application errors."""

    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"
    status_code: int = 500

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.message
        super().__init__(self.message)


class ValidationException(AppException):
    """Invalid input data."""

    code = "VALIDATION_ERROR"
    status_code = 400

    def __init__(
        self, message: str | None = None, code: str | None = None
    ) -> None:
        if code:
            self.code = code
        super().__init__(message)


class NotFoundException(AppException):
    """Resource not found."""

    code = "NOT_FOUND"
    status_code = 404

    def __init__(self, resource: str, identifier: str) -> None:
        self.message = f"{resource} '{identifier}' not found"
        super().__init__(self.message)


class AuthorizationException(AppException):
    """Permission denied."""

    code = "FORBIDDEN"
    status_code = 403

    def __init__(self, action: str, reason: str) -> None:
        self.message = f"Cannot {action}: {reason}"
        super().__init__(self.message)


class ConflictException(AppException):
    """Concurrent modification conflict."""

    code = "CONFLICT"
    status_code = 409


class ConnectionException(AppException):
    """WebSocket/database connection issues."""

    code = "CONNECTION_ERROR"
    status_code = 503


class SimulationException(AppException):
    """Circuit simulation errors."""

    code = "SIMULATION_ERROR"
    status_code = 422

    def __init__(self, error_type: str, details: dict[str, str]) -> None:
        messages = {
            "FLOATING_INPUT": f"Floating Input: Input pin has no connection at {details.get('location', 'unknown')}",
            "OUTPUT_CONFLICT": f"Output Conflict: Multiple outputs connected to same wire at {details.get('location', 'unknown')}",
            "MISSING_POWER": f"Missing Power: Component requires VCC and Ground connections at {details.get('component', 'unknown')}",
        }
        self.code = f"SIMULATION_{error_type}"
        self.message = messages.get(error_type, f"Simulation error: {error_type}")
        super().__init__(self.message)
