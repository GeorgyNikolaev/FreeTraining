import type {
  AttemptSummary,
  ContentHealth,
  CourseDetail,
  CourseSummary,
  LessonDetail,
  PageDetail,
  ProgressExport,
  QuizPublic,
  QuizResult,
} from "../lib/api/types";

export const courseSummary: CourseSummary = {
  id: "python-basics",
  title: "Основы Python",
  description: "Синтаксис, типы данных и функции с нуля.",
  tags: ["python", "backend"],
  level: "beginner",
  module_count: 2,
  lesson_count: 3,
  progress_percent: 0,
  status: "not_started",
  resume: null,
};

export const courseInProgress: CourseSummary = {
  ...courseSummary,
  progress_percent: 33,
  status: "in_progress",
  resume: {
    module_id: "02-syntax",
    lesson_id: "01-variables",
    lesson_title: "Переменные и типы данных",
  },
};

// Пройденный курс: бэкенд хранит место остановки и признак прохождения
// независимо, поэтому у завершённого курса запись resume может остаться.
export const courseCompletedWithResume: CourseSummary = {
  ...courseSummary,
  progress_percent: 100,
  status: "completed",
  resume: {
    module_id: "02-syntax",
    lesson_id: "01-variables",
    lesson_title: "Переменные и типы данных",
  },
};

// У обоих модулей есть тест модуля (has_quiz: true), поэтому запросы вида
// «найти ссылку на тест модуля» (например, по имени «Тест модуля») дают два
// совпадения — уточняйте область поиска (within/индекс), а не берите первое.
export const courseDetail: CourseDetail = {
  ...courseSummary,
  modules: [
    {
      id: "01-introduction",
      title: "Введение",
      lessons: [
        { id: "01-what-is-python", title: "Что такое Python", completed: true },
        { id: "02-installation", title: "Установка и запуск", completed: false },
      ],
      has_quiz: true,
      quiz_passed: false,
      quiz_best_score: null,
    },
    {
      id: "02-syntax",
      title: "Переменные и типы",
      lessons: [
        { id: "01-variables", title: "Переменные и типы данных", completed: false },
      ],
      has_quiz: true,
      quiz_passed: true,
      quiz_best_score: 100,
    },
  ],
  has_cheatsheet: true,
  has_glossary: true,
  has_exam: true,
  exam_passed: false,
  exam_best_score: null,
  progress_percent: 33,
  status: "in_progress",
};

export const lessonDetail: LessonDetail = {
  course_id: "python-basics",
  module_id: "01-introduction",
  lesson_id: "01-what-is-python",
  title: "Что такое Python",
  content: "# Что такое Python\n\nЯзык программирования общего назначения.",
  completed: false,
  prev: null,
  next: {
    kind: "lesson",
    module_id: "01-introduction",
    lesson_id: "02-installation",
    title: "Установка и запуск",
  },
};

export const lastLessonDetail: LessonDetail = {
  ...lessonDetail,
  lesson_id: "02-installation",
  title: "Установка и запуск",
  content: "# Установка и запуск\n\nПроверить версию.",
  prev: {
    kind: "lesson",
    module_id: "01-introduction",
    lesson_id: "01-what-is-python",
    title: "Что такое Python",
  },
  next: {
    kind: "quiz",
    module_id: "01-introduction",
    lesson_id: null,
    title: "Тест модуля: Введение",
  },
};

export const pageDetail: PageDetail = {
  course_id: "python-basics",
  page: "cheatsheet",
  title: "Шпаргалка по основам Python",
  content: "# Шпаргалка по основам Python\n\nКоротко о главном.",
};

export const quizPublic: QuizPublic = {
  course_id: "python-basics",
  scope: "module",
  module_id: "01-introduction",
  title: "Тест модуля: Введение",
  pass_score: 70,
  questions: [
    {
      index: 0,
      question: "Чем в Python выделяются блоки кода?",
      options: ["Фигурными скобками", "Отступами", "Ключевым словом end"],
      multiple: false,
    },
    {
      index: 1,
      question: "Что верно про Python?",
      options: ["Интерпретируемый язык", "Язык общего назначения", "Требует сборки"],
      multiple: true,
    },
  ],
};

export const quizResult: QuizResult = {
  attempt_id: 1,
  course_id: "python-basics",
  scope: "module",
  module_id: "01-introduction",
  total_questions: 2,
  correct_count: 1,
  score_percent: 50,
  passed: false,
  pass_score: 70,
  created_at: "2026-09-12T10:00:00Z",
  results: [
    {
      question: "Чем в Python выделяются блоки кода?",
      options: ["Фигурными скобками", "Отступами", "Ключевым словом end"],
      selected: ["Отступами"],
      correct_answer: ["Отступами"],
      is_correct: true,
      explanation: "Отступ — часть синтаксиса.",
    },
    {
      question: "Что верно про Python?",
      options: ["Интерпретируемый язык", "Язык общего назначения", "Требует сборки"],
      selected: ["Требует сборки"],
      correct_answer: ["Интерпретируемый язык", "Язык общего назначения"],
      is_correct: false,
      explanation: "Отдельный шаг сборки не требуется.",
    },
  ],
};

export const attempts: AttemptSummary[] = [
  {
    id: 2,
    course_id: "python-basics",
    scope: "module",
    module_id: "01-introduction",
    total_questions: 2,
    correct_count: 2,
    score_percent: 100,
    passed: true,
    created_at: "2026-09-12T12:00:00Z",
    results: quizResult.results,
  },
  {
    id: 1,
    course_id: "python-basics",
    scope: "module",
    module_id: "01-introduction",
    total_questions: 2,
    correct_count: 1,
    score_percent: 50,
    passed: false,
    created_at: "2026-09-12T10:00:00Z",
    results: quizResult.results,
  },
];

export const contentHealth: ContentHealth = {
  ok: true,
  course_count: 1,
  errors: [],
  warnings: [],
};

export const progressExport: ProgressExport = {
  user_id: "local-user",
  exported_at: "2026-09-13T09:00:00Z",
  lessons: [
    {
      course_id: "python-basics",
      module_id: "01-introduction",
      lesson_id: "01-what-is-python",
      completed: true,
      completed_at: "2026-09-12T10:00:00Z",
    },
  ],
  attempts,
  positions: [
    {
      course_id: "python-basics",
      module_id: "02-syntax",
      lesson_id: "01-variables",
      updated_at: "2026-09-12T10:00:00Z",
    },
  ],
};
