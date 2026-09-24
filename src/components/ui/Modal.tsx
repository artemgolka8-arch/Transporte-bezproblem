"use client";

import { useEffect, useRef } from "react";

// Стек открытых окон: Esc закрывает только верхнее, а прокрутка страницы блокируется,
// пока открыто хотя бы одно окно.
const stack: symbol[] = [];
let savedOverflow: string | null = null;

/**
 * Единое модальное окно: затемнённый фон, центрирование без обрезки сверху
 * (если окно выше экрана — оно прокручивается), закрытие по Esc, блокировка
 * прокрутки страницы под окном, атрибуты доступности.
 *
 * backdropClose — закрывать по клику на фон. Для форм с вводом данных выключено
 * (чтобы случайный клик не стирал набранное), для окон просмотра включено.
 */
export function Modal({
  onClose,
  children,
  backdropClose = false,
  labelledBy,
  sheet = false,
}: {
  onClose?: () => void;
  children: React.ReactNode;
  backdropClose?: boolean;
  labelledBy?: string;
  /** Длинные формы на телефоне: окно превращается в шторку снизу с
   *  независимым скроллом середины — см. .modal-sheet-* классы в globals.css.
   *  На десктопе выглядит как обычное центрированное окно. */
  sheet?: boolean;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = Symbol("modal");
    stack.push(id);
    if (stack.length === 1) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && stack[stack.length - 1] === id) {
        e.stopPropagation();
        onCloseRef.current?.();
      }
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) {
        document.body.style.overflow = savedOverflow ?? "";
        savedOverflow = null;
      }
    };
  }, []);

  return (
    <div
      className={`modal-overlay${sheet ? " modal-overlay--sheet" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(e) => {
        if (backdropClose && e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      {children}
    </div>
  );
}
