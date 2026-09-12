from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


async def test_healthy_content_reports_no_errors(client):
    response = await client.get("/api/health/content")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["course_count"] == 1
    assert body["errors"] == []


@pytest.mark.parametrize("content_dir", [FIXTURES / "broken"])
async def test_broken_content_is_reported(client, content_dir):
    response = await client.get("/api/health/content")

    body = response.json()
    assert body["ok"] is False
    assert body["course_count"] == 0
    assert len(body["errors"]) == 1
    assert body["errors"][0]["course_id"] == "broken-course"
    assert body["errors"][0]["location"] == "01-module/quiz.yaml"
    assert "отсутствует среди вариантов" in body["errors"][0]["message"]
