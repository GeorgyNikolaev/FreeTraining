import { Route, Routes } from "react-router";

import { Layout } from "./components/Layout";
import { CoursePage } from "./pages/CoursePage";
import { DesignPage } from "./pages/DesignPage";
import { HomePage } from "./pages/HomePage";
import { LessonPage } from "./pages/LessonPage";
import { QuizPage } from "./pages/QuizPage";

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="/courses/:courseId" element={<CoursePage />} />
        <Route path="/courses/:courseId/exam" element={<QuizPage scope="exam" />} />
        <Route
          path="/courses/:courseId/:moduleId/quiz"
          element={<QuizPage scope="module" />}
        />
        <Route path="/courses/:courseId/:moduleId/:lessonId" element={<LessonPage />} />
        <Route path="*" element={<Placeholder title="Страница не найдена" />} />
      </Routes>
    </Layout>
  );
}
