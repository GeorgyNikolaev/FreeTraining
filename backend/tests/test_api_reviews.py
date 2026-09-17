from sqlalchemy import select

from app.models import CourseReview, QuizAttempt

REVIEWS = "/api/courses/demo-course/reviews"


async def complete_two_modules(client, session, user_id):
    for path in (
        "01-basics/01-first-lesson",
        "01-basics/02-second-lesson",
        "02-advanced/01-third-lesson",
    ):
        await client.post(f"/api/progress/lessons/demo-course/{path}")
    session.add(
        QuizAttempt(
            user_id=user_id,
            course_id="demo-course",
            scope="module",
            module_id="01-basics",
            total_questions=1,
            correct_count=1,
            score_percent=100,
            passed=True,
        )
    )
    await session.commit()


async def test_guest_cannot_review(client, session):
    guest_id = "guest:" + "g" * 32
    client.cookies.set("ft_guest", guest_id)
    await complete_two_modules(client, session, guest_id)

    data = (await client.get(REVIEWS)).json()
    assert (data["is_authenticated"], data["can_review"]) == (False, False)
    assert data["modules_completed"] == 2
    assert (await client.put(f"{REVIEWS}/me", json={"rating": 5})).status_code == 401
    assert (await client.delete(f"{REVIEWS}/me")).status_code == 401


async def test_review_lifecycle(client, session, user_id):
    denied = await client.put(f"{REVIEWS}/me", json={"rating": 5})
    assert denied.status_code == 403
    assert (await client.get(REVIEWS)).json()["can_review"] is False

    await complete_two_modules(client, session, user_id)
    session.add(CourseReview(user_id="other", course_id="demo-course", rating=2))
    await session.commit()

    assert (await client.put(f"{REVIEWS}/me", json={"rating": 5, "text": "  "})).status_code == 200
    saved = await client.put(f"{REVIEWS}/me", json={"rating": 4, "text": " Хорошо "})
    assert saved.json()["text"] == "Хорошо"

    rows = (await session.execute(select(CourseReview))).scalars().all()
    assert len(rows) == 2

    data = (await client.get(REVIEWS)).json()
    assert data["can_review"] is True
    assert data["my_review"]["rating"] == 4
    assert data["rating_average"] == 3.0
    mine = next(review for review in data["reviews"] if review["is_mine"])
    other = next(review for review in data["reviews"] if not review["is_mine"])
    assert mine["author_progress_percent"] > 0
    assert mine["author_name"] == "Анна"
    assert other["author_name"] is None
    assert other["author_progress_percent"] == 0

    summary = (await client.get("/api/courses")).json()[0]
    assert (summary["rating_average"], summary["rating_count"]) == (3.0, 2)

    assert (await client.delete(f"{REVIEWS}/me")).status_code == 200
    assert (await client.delete(f"{REVIEWS}/me")).status_code == 404


async def test_invalid_rating_is_rejected(client, session, user_id):
    await complete_two_modules(client, session, user_id)

    for rating in (0, 6, 4.5):
        response = await client.put(f"{REVIEWS}/me", json={"rating": rating})
        assert response.status_code == 422
