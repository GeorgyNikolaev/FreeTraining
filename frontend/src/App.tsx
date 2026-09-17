import { Route, Routes } from "react-router";

import { Layout } from "./components/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import { GuestProgressDialog } from "./features/auth/GuestProgressDialog";
import { useAuth } from "./lib/auth/AuthProvider";
import { CoursePage } from "./pages/CoursePage";
import { DesignPage } from "./pages/DesignPage";
import { HealthPage } from "./pages/HealthPage";
import { HomePage } from "./pages/HomePage";
import { HomeworkPage } from "./pages/HomeworkPage";
import { LessonPage } from "./pages/LessonPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { QuizPage } from "./pages/QuizPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResultsPage } from "./pages/ResultsPage";

export default function App() {
  const auth = useAuth();

  return (
    <Layout>
      <ScrollToTop />
      {/* Пока неизвестно, кто вошёл, страницы не рисуются: иначе мигнёт прогресс гостя */}
      {auth.status === "loading" ? null : (
        <>
          <GuestProgressDialog />
          <AppRoutes />
        </>
      )}
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="/courses/:courseId" element={<CoursePage />} />
      <Route path="/courses/:courseId/results" element={<ResultsPage />} />
      <Route path="/courses/:courseId/exam" element={<QuizPage scope="exam" />} />
      <Route
        path="/courses/:courseId/:moduleId/quiz"
        element={<QuizPage scope="module" />}
      />
      <Route
        path="/courses/:courseId/:moduleId/homework"
        element={<HomeworkPage />}
      />
      <Route path="/courses/:courseId/:moduleId/:lessonId" element={<LessonPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
