from sqlalchemy import select

from app.models import LastPosition, LessonProgress, QuizAttempt
from tests.conftest import register_user

LESSON = "/api/progress/lessons/demo-course/01-basics"
QUIZ = {
    "course_id": "demo-course",
    "scope": "module",
    "module_id": "01-basics",
    "answers": [["2"], ["Это тест", "Это модуль"]],
}


async def make_guest_progress(client) -> str:
    assert client.cookies.get("ft_guest") is None
    await client.post(f"{LESSON}/01-first-lesson")
    await client.post("/api/quizzes/submit", json=QUIZ)
    guest_id = client.cookies.get("ft_guest")
    assert guest_id and guest_id.startswith("guest:")
    return guest_id


async def rows(session, model, user_id):
    return (await session.execute(select(model).where(model.user_id == user_id))).scalars().all()


async def test_reading_does_not_create_guest(client):
    await client.get("/api/courses")
    assert client.cookies.get("ft_guest") is None


async def test_registration_merges_guest_progress(client, session):
    guest_id = await make_guest_progress(client)

    data = await register_user(client)
    user_id = data["user"]["id"]

    assert data["guest_progress"] is None
    assert client.cookies.get("ft_guest") is None
    assert await rows(session, LessonProgress, guest_id) == []
    assert len(await rows(session, LessonProgress, user_id)) == 1
    assert len(await rows(session, QuizAttempt, user_id)) == 1
    course = (await client.get("/api/courses/demo-course")).json()
    assert course["modules"][0]["lessons"][0]["completed"] is True


async def test_login_asks_before_merging(client, session):
    await register_user(client)
    client.headers.pop("Authorization")
    await client.post("/api/auth/logout")

    guest_id = await make_guest_progress(client)
    login = await client.post(
        "/api/auth/login", json={"email": "anna@example.com", "password": "correct-horse"}
    )
    body = login.json()
    user_id = body["user"]["id"]
    assert body["guest_progress"] == {"courses": 1, "lessons": 1, "attempts": 1}
    assert len(await rows(session, LessonProgress, guest_id)) == 1

    client.headers["Authorization"] = f"Bearer {body['access_token']}"
    me = (await client.get("/api/auth/me")).json()
    assert me["guest_progress"]["lessons"] == 1

    assert (await client.post("/api/auth/guest/merge")).status_code == 200
    assert client.cookies.get("ft_guest") is None
    assert len(await rows(session, LessonProgress, user_id)) == 1
    assert (await client.get("/api/auth/me")).json()["guest_progress"] is None


async def test_discard_deletes_guest_progress(client, session):
    await register_user(client)
    token = client.headers.pop("Authorization")
    guest_id = await make_guest_progress(client)
    client.headers["Authorization"] = token

    assert (await client.post("/api/auth/guest/discard")).status_code == 200
    assert await rows(session, LessonProgress, guest_id) == []
    assert await rows(session, QuizAttempt, guest_id) == []


async def test_merge_keeps_earliest_lesson_and_latest_position(client, session):
    data = await register_user(client)
    user_id = data["user"]["id"]
    token = client.headers.pop("Authorization")

    await client.post(f"{LESSON}/01-first-lesson")
    await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "02-advanced", "lesson_id": "01-third-lesson"},
    )
    guest_id = client.cookies.get("ft_guest")

    client.headers["Authorization"] = token
    await client.post(f"{LESSON}/01-first-lesson")
    await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "01-basics", "lesson_id": "01-first-lesson"},
    )

    guest_lesson = (await rows(session, LessonProgress, guest_id))[0].completed_at
    assert (await client.post("/api/auth/guest/merge")).status_code == 200
    session.expire_all()

    lessons = await rows(session, LessonProgress, user_id)
    assert len(lessons) == 1
    assert lessons[0].completed_at == guest_lesson
    positions = await rows(session, LastPosition, user_id)
    assert len(positions) == 1
    assert positions[0].module_id == "01-basics"
