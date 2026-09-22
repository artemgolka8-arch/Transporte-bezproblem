import { SHARK_FIN_PATH, BRAND_GRADIENT_STOPS } from "@/lib/brand";

// Векторная иконка-плавник. Один и тот же <path>, что и в favicon (см. app/icon.tsx),
// поэтому значок в интерфейсе и во вкладке браузера — один и тот же знак.
// SVG вместо картинки: на любом экране и в любом размере остаётся чётким.
function SharkFinMark({ size = 28 }: { size?: number }) {
  const gradientId = "sharkFinGradient";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[0_2px_6px_rgba(15,148,137,0.35)]"
    >
      <defs>
        <linearGradient id={gradientId} x1="10" y1="90" x2="70" y2="10" gradientUnits="userSpaceOnUse">
          {BRAND_GRADIENT_STOPS.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <path d={SHARK_FIN_PATH} fill={`url(#${gradientId})`} />
    </svg>
  );
}

/**
 * Логотип в одну строку: плавник + «BezProblem Sharks».
 * Используется в узких местах — сайдбар, верхняя панель.
 */
export function Logo({
  markSize = 28,
  textClassName = "text-lg",
  className = "",
}: {
  markSize?: number;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SharkFinMark size={markSize} />
      <span className={`font-display font-bold leading-none tracking-tight text-ink ${textClassName}`}>
        BezProblem <span className="text-gradient-brand">Sharks</span>
      </span>
    </span>
  );
}

/**
 * Логотип в две строки: плавник над названием, «Sharks» — акцентным градиентом.
 * Используется там, где логотип — центральный элемент экрана (страница входа).
 */
export function LogoStacked({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <SharkFinMark size={44} />
      <span className="font-display text-2xl font-bold leading-none tracking-tight text-ink">
        BezProblem
      </span>
      <span className="font-display text-base font-bold uppercase leading-none tracking-[0.14em] text-gradient-brand">
        Sharks
      </span>
    </span>
  );
}
