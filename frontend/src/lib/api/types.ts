import type { components } from "./schema";

type Schemas = components["schemas"];

export type CourseSummary = Schemas["CourseSummary"];
export type CourseDetail = Schemas["CourseDetail"];
export type ModuleDetail = Schemas["ModuleDetail"];
export type LessonRef = Schemas["LessonRef"];
export type LessonDetail = Schemas["LessonDetail"];
export type StepLink = Schemas["StepLink"];
export type PageDetail = Schemas["PageDetail"];
export type QuizPublic = Schemas["QuizPublic"];
export type QuizQuestionPublic = Schemas["QuizQuestionPublic"];
export type QuizSubmission = Schemas["QuizSubmission"];
export type QuizResult = Schemas["QuizResult"];
export type QuestionResult = Schemas["QuestionResult"];
export type AttemptSummary = Schemas["AttemptSummary"];
export type ContentHealth = Schemas["ContentHealth"];
export type ContentErrorOut = Schemas["ContentErrorOut"];
export type ResumePosition = Schemas["ResumePosition"];
