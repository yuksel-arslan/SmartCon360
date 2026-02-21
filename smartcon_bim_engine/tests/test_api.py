"""Unit tests for BIM Intelligence Engine API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestHealthEndpoint:
    def test_root_health(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "smartcon-bim-engine"
        assert data["layer"] == 1

    def test_bim_health(self, client: TestClient) -> None:
        response = client.get("/api/v1/bim/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "ifc_parsing" in data["capabilities"]
        assert "element_graph" in data["capabilities"]
        assert "wbs_generation" in data["capabilities"]
        assert "lbs_generation" in data["capabilities"]
        assert "zone_generation" in data["capabilities"]
        assert "cost_binding" in data["capabilities"]


class TestUploadEndpoint:
    def test_upload_non_ifc_rejected(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/bim/upload",
            files={"file": ("model.obj", b"dummy content", "application/octet-stream")},
        )
        assert response.status_code == 400
        assert "Only .ifc files" in response.json()["detail"]

    def test_upload_no_file(self, client: TestClient) -> None:
        response = client.post("/api/v1/bim/upload")
        assert response.status_code == 422


class TestProcessEndpoint:
    def test_process_unknown_project(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/bim/process",
            json={"project_id": "nonexistent-project"},
        )
        assert response.status_code == 404

    def test_get_unknown_project(self, client: TestClient) -> None:
        response = client.get("/api/v1/bim/nonexistent-project")
        assert response.status_code == 404
