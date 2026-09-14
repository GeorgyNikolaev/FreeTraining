import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { ScrollToTop } from "./ScrollToTop";

function renderTwoPages() {
  return render(
    <MemoryRouter initialEntries={["/first"]}>
      <ScrollToTop />
      <Routes>
        <Route path="/first" element={<Link to="/second">дальше</Link>} />
        <Route path="/second" element={<p>второй экран</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScrollToTop", () => {
  it("сбрасывает прокрутку при переходе на другой адрес", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const user = userEvent.setup();

    const { getByRole } = renderTwoPages();
    scrollTo.mockClear();

    await user.click(getByRole("link", { name: "дальше" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
    scrollTo.mockRestore();
  });
});
