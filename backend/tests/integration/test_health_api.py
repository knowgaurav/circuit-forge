"""Integration tests for Health API endpoint."""

from fastapi.testclient import TestClient

from app.main import app


class TestHealthEndpoint:
    """Tests for GET /health endpoint."""

    def test_health_returns_200_and_healthy_status(self):
        """Test GET /health returns 200 with healthy status."""
        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
