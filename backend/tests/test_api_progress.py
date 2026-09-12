from sqlalchemy import select

from app.models import LastPosition, LessonProgress, QuizAttempt


async def test_mark_lesson_completed(client, session):
    response = await client.post(
        "/api/progress/lessons/demo-course/01-basics/01-first-lesson"
    )

    assert response.status_code == 200
    assert response.json()["completed"] is True

    rows = (await session.execute(select(LessonProgress))).scalars().all()
    assert len(rows) == 1


async def test_marking_twice_does_not_duplicate(client, session):
    await client.post("/api/progress/lessons/demo-course/01-basics/01-first-lesson")
    await client.post("/api/progress/lessons/demo-course/01-basics/01-first-lesson")

    rows = (await session.execute(select(LessonProgress))).scalars().all()

    assert len(rows) == 1


async def test_marking_unknown_lesson_returns_404(client):
    response = await client.post("/api/progress/lessons/demo-course/01-basics/нет-такого")

    assert response.status_code == 404


async def test_save_position(client, session):
    response = await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "01-basics", "lesson_id": "02-second-lesson"},
    )

    assert response.status_code == 200
    rows = (await session.execute(select(LastPosition))).scalars().all()
    assert len(rows) == 1
    assert rows[0].lesson_id == "02-second-lesson"


async def test_position_is_overwritten_not_duplicated(client, session):
    await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "01-basics", "lesson_id": "01-first-lesson"},
    )
    await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "02-advanced", "lesson_id": "01-third-lesson"},
    )

    rows = (await session.execute(select(LastPosition))).scalars().all()

    assert len(rows) == 1
    assert rows[0].module_id == "02-advanced"


async def test_attempts_history_is_newest_first(client):
    payload = {
        "course_id": "demo-course",
        "scope": "module",
        "module_id": "01-basics",
        "answers": [["1"], ["Это урок"]],
    }
    await client.post("/api/quizzes/submit", json=payload)
    payload["answers"] = [["2"], ["Это тест", "Это модуль"]]
    await client.post("/api/quizzes/submit", json=payload)

    attempts = (await client.get("/api/progress/attempts/demo-course")).json()

    assert len(attempts) == 2
    assert attempts[0]["score_percent"] == 100
    assert attempts[1]["score_percent"] == 0
    assert attempts[0]["results"][0]["question"] == "Сколько уроков в этом модуле?"


async def test_reset_course_progress(client, session):
    await client.post("/api/progress/lessons/demo-course/01-basics/01-first-lesson")
    await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "01-basics", "lesson_id": "01-first-lesson"},
    )
    await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["2"], ["Это тест", "Это модуль"]],
        },
    )

    response = await client.delete("/api/progress/courses/demo-course")

    assert response.status_code == 200
    assert (await session.execute(select(LessonProgress))).scalars().all() == []
    assert (await session.execute(select(QuizAttempt))).scalars().all() == []
    assert (await session.execute(select(LastPosition))).scalars().all() == []


async def test_export_contains_all_sections(client):
    await client.post("/api/progress/lessons/demo-course/01-basics/01-first-lesson")

    export = (await client.get("/api/progress/export")).json()

    assert export["user_id"] == "local"
    assert len(export["lessons"]) == 1
    assert export["lessons"][0]["course_id"] == "demo-course"
    assert export["attempts"] == []
    assert export["positions"] == []
    assert "exported_at" in export
