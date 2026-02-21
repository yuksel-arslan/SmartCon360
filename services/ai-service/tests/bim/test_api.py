"""Tests for the BIM QTO API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestBIMHealthEndpoint:
    """Tests for the /api/v1/bim/health endpoint."""

    def test_health_returns_ok(self, client: TestClient) -> None:
        resp = client.get("/api/v1/bim/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["module"] == "bim-qto"
        assert "ifc_parsing" in data["capabilities"]
        assert "quantity_extraction" in data["capabilities"]
        assert "uniclass_classification" in data["capabilities"]


class TestBIMUploadEndpoint:
    """Tests for the /api/v1/bim/upload endpoint."""

    def test_upload_no_file(self, client: TestClient) -> None:
        resp = client.post("/api/v1/bim/upload")
        assert resp.status_code == 422

    def test_upload_invalid_extension(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/bim/upload",
            files={"file": ("test.dwg", b"invalid data", "application/octet-stream")},
        )
        assert resp.status_code == 400

    def test_upload_empty_file(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/bim/upload",
            files={"file": ("test.ifc", b"", "application/octet-stream")},
        )
        assert resp.status_code == 400

    def test_upload_valid_ifc(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/bim/upload",
            files={"file": ("test.ifc", b"ISO-10303-21;", "application/octet-stream")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "job_id" in data
        assert data["file_name"] == "test.ifc"
        assert data["status"] == "pending"


class TestBIMJobsEndpoint:
    """Tests for the /api/v1/bim/jobs endpoints."""

    def test_list_jobs_empty(self, client: TestClient) -> None:
        resp = client.get("/api/v1/bim/jobs")
        assert resp.status_code == 200

    def test_get_job_not_found(self, client: TestClient) -> None:
        resp = client.get("/api/v1/bim/jobs/nonexistent-id")
        assert resp.status_code == 404

    def test_delete_job_not_found(self, client: TestClient) -> None:
        resp = client.delete("/api/v1/bim/jobs/nonexistent-id")
        assert resp.status_code == 404


class TestBIMRunEndpoint:
    """Tests for the /api/v1/bim/run endpoint."""

    def test_run_job_not_found(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/bim/run",
            json={"job_id": "nonexistent-id"},
        )
        assert resp.status_code == 404


class TestBIMResultsEndpoint:
    """Tests for the /api/v1/bim/results endpoint."""

    def test_results_job_not_found(self, client: TestClient) -> None:
        resp = client.get("/api/v1/bim/results/nonexistent-id")
        assert resp.status_code == 404
