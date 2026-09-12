from sqlalchemy import select

from app.models import QuizAttempt


async def test_module_quiz_hides_correct_answers(client):
    response = await client.get("/api/courses/demo-course/quizzes/01-basics")

    assert response.status_code == 200
    quiz = response.json()
    assert quiz["pass_score"] == 50
    assert quiz["scope"] == "module"
    assert quiz["module_id"] == "01-basics"
    assert len(quiz["questions"]) == 2
    assert quiz["questions"][0]["question"] == "Сколько уроков в этом модуле?"
    assert quiz["questions"][0]["multiple"] is False
    assert quiz["questions"][1]["multiple"] is True
    assert "answer" not in quiz["questions"][0]
    assert "explanation" not in quiz["questions"][0]


async def test_module_without_quiz_returns_404(client):
    response = await client.get("/api/courses/demo-course/quizzes/02-advanced")

    assert response.status_code == 404
    assert response.json()["detail"] == "Тест не найден"


async def test_exam_is_returned(client):
    response = await client.get("/api/courses/demo-course/exam")

    assert response.status_code == 200
    assert response.json()["scope"] == "exam"
    assert response.json()["pass_score"] == 80


async def test_submit_saves_attempt_and_returns_review(client, session):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["2"], ["Это тест", "Это модуль"]],
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["total_questions"] == 2
    assert result["correct_count"] == 2
    assert result["score_percent"] == 100
    assert result["passed"] is True
    assert result["results"][0]["is_correct"] is True
    assert result["results"][0]["correct_answer"] == ["2"]
    assert result["results"][0]["explanation"] == "Модуль содержит два урока."
    assert result["attempt_id"] > 0

    rows = (await session.execute(select(QuizAttempt))).scalars().all()
    assert len(rows) == 1
    assert rows[0].scope == "module"
    assert rows[0].module_id == "01-basics"
    assert rows[0].answers[0]["question"] == "Сколько уроков в этом модуле?"


async def test_failed_attempt_is_saved_too(client, session):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["1"], ["Это урок"]],
        },
    )

    assert response.json()["passed"] is False
    rows = (await session.execute(select(QuizAttempt))).scalars().all()
    assert len(rows) == 1
    assert rows[0].passed is False


async def test_repeated_attempts_accumulate(client, session):
    payload = {
        "course_id": "demo-course",
        "scope": "module",
        "module_id": "01-basics",
        "answers": [["2"], ["Это тест", "Это модуль"]],
    }
    await client.post("/api/quizzes/submit", json=payload)
    await client.post("/api/quizzes/submit", json=payload)

    rows = (await session.execute(select(QuizAttempt))).scalars().all()

    assert len(rows) == 2


async def test_exam_submission(client, session):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "exam",
            "module_id": None,
            "answers": [["Демонстрационный"]],
        },
    )

    assert response.json()["passed"] is True
    rows = (await session.execute(select(QuizAttempt))).scalars().all()
    assert rows[0].scope == "exam"
    assert rows[0].module_id is None


async def test_wrong_number_of_answers_returns_422(client):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["2"]],
        },
    )

    assert response.status_code == 422
    assert "число ответов" in response.json()["detail"]


async def test_submit_with_path_traversal_course_id_returns_404(client):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "../../../../tmp",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["что угодно"]],
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Курс не найден"


async def test_submit_to_missing_quiz_returns_404(client):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "02-advanced",
            "answers": [["что угодно"]],
        },
    )

    assert response.status_code == 404
