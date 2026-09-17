from app.models import LessonProgress, QuizAttempt


async def test_catalogue_lists_courses(client):
    response = await client.get("/api/courses")

    assert response.status_code == 200
    courses = response.json()
    assert len(courses) == 1
    assert courses[0]["id"] == "demo-course"
    assert courses[0]["title"] == "Демонстрационный курс"
    assert courses[0]["module_count"] == 2
    assert courses[0]["lesson_count"] == 3
    assert courses[0]["progress_percent"] == 0
    assert courses[0]["status"] == "not_started"
    assert courses[0]["resume"] is None
    assert courses[0]["prerequisites"] == ["Базовый Python", "HTTP и REST"]


async def test_catalogue_shows_progress(client, session, user_id):
    session.add(
        LessonProgress(
            user_id=user_id,
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    response = await client.get("/api/courses")

    assert response.json()[0]["progress_percent"] == 20
    assert response.json()[0]["status"] == "in_progress"


async def test_course_detail_returns_tree(client):
    response = await client.get("/api/courses/demo-course")

    assert response.status_code == 200
    course = response.json()
    assert course["title"] == "Демонстрационный курс"
    assert course["has_cheatsheet"] is True
    assert course["has_glossary"] is False
    assert course["has_exam"] is True
    assert [module["id"] for module in course["modules"]] == ["01-basics", "02-advanced"]
    assert course["modules"][0]["lessons"][0]["title"] == "Первый урок"
    assert course["modules"][0]["has_quiz"] is True
    assert course["modules"][1]["has_quiz"] is False


async def test_course_detail_marks_completed_lesson(client, session, user_id):
    session.add(
        LessonProgress(
            user_id=user_id,
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    response = await client.get("/api/courses/demo-course")
    lessons = response.json()["modules"][0]["lessons"]

    assert lessons[0]["completed"] is True
    assert lessons[1]["completed"] is False


async def test_course_detail_shows_quiz_result(client, session, user_id):
    session.add(
        QuizAttempt(
            user_id=user_id,
            course_id="demo-course",
            scope="module",
            module_id="01-basics",
            total_questions=2,
            correct_count=2,
            score_percent=100,
            passed=True,
            answers=[],
        )
    )
    await session.commit()

    module = (await client.get("/api/courses/demo-course")).json()["modules"][0]

    assert module["quiz_passed"] is True
    assert module["quiz_best_score"] == 100


async def test_unknown_course_returns_404(client):
    response = await client.get("/api/courses/нет-такого-курса")

    assert response.status_code == 404
    assert response.json()["detail"] == "Курс не найден"


async def test_course_response_carries_no_quiz_content(client):
    body = (await client.get("/api/courses/demo-course")).text

    assert "correct_answer" not in body
    assert "Модуль содержит два урока" not in body
    assert "Сколько уроков в этом модуле?" not in body


async def test_course_detail_reports_prerequisites_and_homework(client):
    course = (await client.get("/api/courses/demo-course")).json()

    assert course["prerequisites"] == ["Базовый Python", "HTTP и REST"]
    assert course["modules"][0]["has_homework"] is True
    assert course["modules"][1]["has_homework"] is False
