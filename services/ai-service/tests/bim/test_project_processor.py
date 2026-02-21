"""Tests for the ProjectProcessor."""

from __future__ import annotations

import pytest

from src.modules.bim.application.project_processor import (
    JobStatus,
    ProjectProcessor,
    ProjectProcessorError,
)


class TestProjectProcessor:
    """Tests for file upload and job management."""

    def test_save_upload_valid(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        content = b"ISO-10303-21;\nHEADER;\n"
        job = processor.save_upload(content, "test.ifc", project_id="proj-1")

        assert job.job_id is not None
        assert job.file_name == "test.ifc"
        assert job.project_id == "proj-1"
        assert job.status == JobStatus.PENDING

    def test_save_upload_invalid_extension(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        with pytest.raises(ProjectProcessorError, match="Invalid file type"):
            processor.save_upload(b"data", "test.dwg")

    def test_save_upload_empty_file(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        with pytest.raises(ProjectProcessorError, match="Empty file"):
            processor.save_upload(b"", "test.ifc")

    def test_get_job(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        job = processor.save_upload(b"data", "test.ifc")
        retrieved = processor.get_job(job.job_id)
        assert retrieved is not None
        assert retrieved.job_id == job.job_id

    def test_get_nonexistent_job(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        assert processor.get_job("nonexistent") is None

    def test_list_jobs(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        processor.save_upload(b"data1", "test1.ifc")
        processor.save_upload(b"data2", "test2.ifc")
        jobs = processor.list_jobs()
        assert len(jobs) == 2

    def test_cleanup_job(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        job = processor.save_upload(b"data", "test.ifc")
        assert processor.cleanup_job(job.job_id) is True
        assert processor.get_job(job.job_id) is None

    def test_cleanup_nonexistent_job(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        assert processor.cleanup_job("nonexistent") is False

    def test_cleanup_all(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        processor.save_upload(b"data1", "test1.ifc")
        processor.save_upload(b"data2", "test2.ifc")
        count = processor.cleanup_all()
        assert count == 2
        assert processor.list_jobs() == []

    def test_run_job_not_found(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        with pytest.raises(ProjectProcessorError, match="Job not found"):
            processor.run_job("nonexistent")

    def test_job_to_dict(self, tmp_path) -> None:
        processor = ProjectProcessor(upload_dir=tmp_path)
        job = processor.save_upload(b"data", "test.ifc", project_id="proj-1")
        d = job.to_dict()
        assert d["job_id"] == job.job_id
        assert d["status"] == "pending"
        assert d["project_id"] == "proj-1"
        assert d["file_name"] == "test.ifc"
        assert d["created_at"] is not None
