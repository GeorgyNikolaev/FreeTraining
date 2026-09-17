from app.models import LessonProgress


async def test_lesson_returns_content_and_title(client):
    response = await client.get(
        "/api/courses/demo-course/lessons/01-basics/01-first-lesson"
    )

    assert response.status_code == 200
    lesson = response.json()
    assert lesson["title"] == "Первый урок"
    assert "Текст первого урока" in lesson["content"]
    assert lesson["completed"] is False


async def test_lesson_navigation_links(client):
    lesson = (
        await client.get("/api/courses/demo-course/lessons/01-basics/02-second-lesson")
    ).json()

    assert lesson["prev"]["kind"] == "lesson"
    assert lesson["prev"]["lesson_id"] == "01-first-lesson"
    assert lesson["next"]["kind"] == "homework"
    assert lesson["next"]["module_id"] == "01-basics"


async def test_last_lesson_leads_to_exam(client):
    lesson = (
        await client.get("/api/courses/demo-course/lessons/02-advanced/01-third-lesson")
    ).json()

    assert lesson["next"]["kind"] == "exam"


async def test_lesson_marked_completed(client, session, user_id):
    session.add(
        LessonProgress(
            user_id=user_id,
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    lesson = (
        await client.get("/api/courses/demo-course/lessons/01-basics/01-first-lesson")
    ).json()

    assert lesson["completed"] is True


async def test_unknown_lesson_returns_404(client):
    response = await client.get("/api/courses/demo-course/lessons/01-basics/нет-такого")

    assert response.status_code == 404
    assert response.json()["detail"] == "Урок не найден"


async def test_cheatsheet_page(client):
    response = await client.get("/api/courses/demo-course/pages/cheatsheet")

    assert response.status_code == 200
    assert response.json()["title"] == "Шпаргалка"
    assert "Краткая выжимка" in response.json()["content"]


async def test_missing_page_returns_404(client):
    response = await client.get("/api/courses/demo-course/pages/glossary")

    assert response.status_code == 404
    assert response.json()["detail"] == "Страница не найдена"


async def test_unknown_page_name_returns_404(client):
    response = await client.get("/api/courses/demo-course/pages/что-угодно")

    assert response.status_code == 404


async def test_homework_returns_content_and_navigation(client):
    response = await client.get("/api/courses/demo-course/homework/01-basics")

    assert response.status_code == 200
    homework = response.json()
    assert homework["title"] == "Домашнее задание к основам"
    assert homework["module_title"] == "Основы"
    assert "Напишите короткий конспект" in homework["content"]
    assert homework["prev"]["lesson_id"] == "02-second-lesson"
    assert homework["next"]["kind"] == "quiz"


async def test_homework_of_module_without_one_is_404(client):
    response = await client.get("/api/courses/demo-course/homework/02-advanced")

    assert response.status_code == 404
