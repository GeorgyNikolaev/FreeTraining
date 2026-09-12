import { Route, Routes } from "react-router";

function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

export default function App() {
  return (
    <div>
      <header role="banner">FreeTraining</header>
      <main>
        <Routes>
          <Route path="/" element={<Placeholder title="Главная" />} />
          <Route path="*" element={<Placeholder title="Страница не найдена" />} />
        </Routes>
      </main>
    </div>
  );
}
