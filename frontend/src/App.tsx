import { Route, Routes } from "react-router";

import { Layout } from "./components/Layout";

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Placeholder title="Главная" />} />
        <Route path="*" element={<Placeholder title="Страница не найдена" />} />
      </Routes>
    </Layout>
  );
}
