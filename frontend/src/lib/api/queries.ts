import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { ApiError, apiFetch } from "./client";
import type {
  AttemptSummary,
  ContentHealth,
  CourseDetail,
  CourseReviews,
  CourseSummary,
  HomeworkDetail,
  LessonDetail,
  PageDetail,
  ProgressExport,
  QuizPublic,
  QuizResult,
  QuizSubmission,
  ReviewInput,
  ReviewOut,
} from "./types";

export const queryKeys = {
  courses: ["courses"] as const,
  course: (courseId: string) => ["courses", courseId] as const,
  lesson: (courseId: string, moduleId: string, lessonId: string) =>
    ["courses", courseId, "lessons", moduleId, lessonId] as const,
  homework: (courseId: string, moduleId: string) =>
    ["courses", courseId, "homework", moduleId] as const,
  page: (courseId: string, page: string) => ["courses", courseId, "pages", page] as const,
  moduleQuiz: (courseId: string, moduleId: string) =>
    ["courses", courseId, "quizzes", moduleId] as const,
  exam: (courseId: string) => ["courses", courseId, "exam"] as const,
  attempts: (courseId: string) => ["attempts", courseId] as const,
  reviews: (courseId: string) => ["courses", courseId, "reviews"] as const,
  health: ["health"] as const,
};

export function useCourses(): UseQueryResult<CourseSummary[], ApiError> {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => apiFetch<CourseSummary[]>("/api/courses"),
  });
}

export function useCourse(courseId: string): UseQueryResult<CourseDetail, ApiError> {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => apiFetch<CourseDetail>(`/api/courses/${courseId}`),
  });
}

export function useLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
): UseQueryResult<LessonDetail, ApiError> {
  return useQuery({
    queryKey: queryKeys.lesson(courseId, moduleId, lessonId),
    queryFn: () =>
      apiFetch<LessonDetail>(
        `/api/courses/${courseId}/lessons/${moduleId}/${lessonId}`,
      ),
  });
}

export function useHomework(
  courseId: string,
  moduleId: string,
): UseQueryResult<HomeworkDetail, ApiError> {
  return useQuery({
    queryKey: queryKeys.homework(courseId, moduleId),
    queryFn: () =>
      apiFetch<HomeworkDetail>(`/api/courses/${courseId}/homework/${moduleId}`),
  });
}

export function usePage(
  courseId: string,
  page: string,
  enabled = true,
): UseQueryResult<PageDetail, ApiError> {
  return useQuery({
    queryKey: queryKeys.page(courseId, page),
    queryFn: () => apiFetch<PageDetail>(`/api/courses/${courseId}/pages/${page}`),
    enabled,
  });
}

export function useModuleQuiz(
  courseId: string,
  moduleId: string,
  enabled = true,
): UseQueryResult<QuizPublic, ApiError> {
  return useQuery({
    queryKey: queryKeys.moduleQuiz(courseId, moduleId),
    queryFn: () => apiFetch<QuizPublic>(`/api/courses/${courseId}/quizzes/${moduleId}`),
    enabled,
  });
}

export function useExam(
  courseId: string,
  enabled = true,
): UseQueryResult<QuizPublic, ApiError> {
  return useQuery({
    queryKey: queryKeys.exam(courseId),
    queryFn: () => apiFetch<QuizPublic>(`/api/courses/${courseId}/exam`),
    enabled,
  });
}

export function useAttempts(
  courseId: string,
): UseQueryResult<AttemptSummary[], ApiError> {
  return useQuery({
    queryKey: queryKeys.attempts(courseId),
    queryFn: () => apiFetch<AttemptSummary[]>(`/api/progress/attempts/${courseId}`),
  });
}

export function useContentHealth(): UseQueryResult<ContentHealth, ApiError> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiFetch<ContentHealth>("/api/health/content"),
  });
}

export function useCompleteLesson(courseId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      apiFetch<{ completed: boolean }>(
        `/api/progress/lessons/${courseId}/${moduleId}/${lessonId}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.courses });
      void client.invalidateQueries({ queryKey: queryKeys.course(courseId) });
    },
  });
}

export function useSavePosition(courseId: string) {
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      apiFetch<unknown>(`/api/progress/position/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({ module_id: moduleId, lesson_id: lessonId }),
      }),
  });
}

export function useSubmitQuiz(courseId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (submission: QuizSubmission) =>
      apiFetch<QuizResult>("/api/quizzes/submit", {
        method: "POST",
        body: JSON.stringify(submission),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.courses });
      void client.invalidateQueries({ queryKey: queryKeys.course(courseId) });
      void client.invalidateQueries({ queryKey: queryKeys.attempts(courseId) });
    },
  });
}

export function useExportProgress() {
  return useMutation({
    mutationFn: () => apiFetch<ProgressExport>("/api/progress/export"),
  });
}

export function useResetCourse(courseId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<unknown>(`/api/progress/courses/${courseId}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.courses });
      void client.invalidateQueries({ queryKey: queryKeys.course(courseId) });
      void client.invalidateQueries({ queryKey: queryKeys.attempts(courseId) });
    },
  });
}

export function useReviews(
  courseId: string,
  enabled = true,
): UseQueryResult<CourseReviews, ApiError> {
  return useQuery({
    queryKey: queryKeys.reviews(courseId),
    queryFn: () => apiFetch<CourseReviews>(`/api/courses/${courseId}/reviews`),
    enabled,
  });
}

function useInvalidateReviews(courseId: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.courses, exact: true });
    void client.invalidateQueries({ queryKey: queryKeys.course(courseId), exact: true });
    void client.invalidateQueries({ queryKey: queryKeys.reviews(courseId) });
  };
}

export function useSaveReview(courseId: string) {
  const invalidate = useInvalidateReviews(courseId);

  return useMutation({
    mutationFn: (review: ReviewInput) =>
      apiFetch<ReviewOut>(`/api/courses/${courseId}/reviews/me`, {
        method: "PUT",
        body: JSON.stringify(review),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteReview(courseId: string) {
  const invalidate = useInvalidateReviews(courseId);

  return useMutation({
    mutationFn: () =>
      apiFetch<unknown>(`/api/courses/${courseId}/reviews/me`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
