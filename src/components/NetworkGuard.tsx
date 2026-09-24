"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

// Защита от обрыва сети. Если запрос к нашему API не дошёл (нет интернета, сервер
// перезапускается), браузер бросает исключение, и кнопка «Сохранить» остаётся
// «зависшей» в состоянии загрузки. Здесь такие сбои превращаются в обычный ответ
// 503 с понятным текстом — формы показывают ошибку и снова становятся активными.
export function NetworkGuard() {
  const { t } = useTranslation();
  const messageRef = useRef(t("network_error"));
  messageRef.current = t("network_error");

  useEffect(() => {
    const w = window as Window & { __fleetFetchPatched?: boolean };
    if (w.__fleetFetchPatched) return;
    w.__fleetFetchPatched = true;
    const original = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        return await original(input, init);
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const sameOriginApi = url.startsWith("/api/") || url.startsWith(`${location.origin}/api/`);
        if (aborted || !sameOriginApi) throw err;
        return new Response(JSON.stringify({ error: messageRef.current }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
    };
  }, []);

  return null;
}
