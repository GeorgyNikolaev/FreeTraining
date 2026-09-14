import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Новый экран открывается сверху.
 *
 * Браузер сохраняет прокрутку при смене адреса внутри одного приложения,
 * поэтому переход из подвала урока на следующий урок открывал бы его на
 * середине. Ничего не рисует — только сбрасывает прокрутку.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return null;
}
