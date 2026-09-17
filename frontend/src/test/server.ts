import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import {
  attempts,
  contentHealth,
  courseDetail,
  courseReviews,
  courseSummary,
  homeworkDetail,
  lessonDetail,
  pageDetail,
  progressExport,
  quizPublic,
  quizResult,
} from "./mocks";

export const handlers = [
  http.get("/api/courses", () => HttpResponse.json([courseSummary])),
  http.get("/api/courses/:course", () => HttpResponse.json(courseDetail)),
  http.get("/api/courses/:course/lessons/:module/:lesson", () =>
    HttpResponse.json(lessonDetail),
  ),
  http.get("/api/courses/:course/homework/:module", () =>
    HttpResponse.json(homeworkDetail),
  ),
  http.get("/api/courses/:course/reviews", () => HttpResponse.json(courseReviews)),
  http.get("/api/courses/:course/pages/:page", () => HttpResponse.json(pageDetail)),
  http.get("/api/courses/:course/quizzes/:module", () => HttpResponse.json(quizPublic)),
  http.get("/api/courses/:course/exam", () => HttpResponse.json(quizPublic)),
  http.post("/api/quizzes/submit", () => HttpResponse.json(quizResult)),
  http.post("/api/progress/lessons/:course/:module/:lesson", () =>
    HttpResponse.json({
      course_id: "python-basics",
      module_id: "01-introduction",
      lesson_id: "01-what-is-python",
      completed: true,
      completed_at: "2026-09-12T10:00:00Z",
    }),
  ),
  http.put("/api/progress/position/:course", () =>
    HttpResponse.json({
      course_id: "python-basics",
      module_id: "01-introduction",
      lesson_id: "01-what-is-python",
      updated_at: "2026-09-12T10:00:00Z",
    }),
  ),
  http.get("/api/progress/attempts/:course", () => HttpResponse.json(attempts)),
  http.get("/api/progress/export", () => HttpResponse.json(progressExport)),
  http.delete("/api/progress/courses/:course", () =>
    HttpResponse.json({ status: "ok" }),
  ),
  http.get("/api/health/content", () => HttpResponse.json(contentHealth)),
];

export const server = setupServer(...handlers);
