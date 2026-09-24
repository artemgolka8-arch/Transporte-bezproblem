import type { Config } from "tailwindcss";

// Позволяет использовать CSS-переменные вместе с прозрачностью Tailwind
// (например bg-bg/50), сохраняя все существующие классы без изменений.
function withOpacity(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Доп. точка останова для самых узких телефонов (iPhone SE и т.п.)
      screens: {
        xs: "400px",
      },
      colors: {
        bg: withOpacity("--color-bg"),
        bg2: withOpacity("--color-bg2"),
        panel: withOpacity("--color-panel"),
        panel2: withOpacity("--color-panel2"),
        line: withOpacity("--color-line"),
        ink: withOpacity("--color-ink"),
        muted: withOpacity("--color-muted"),
        faint: withOpacity("--color-faint"),
        mint: withOpacity("--color-mint"),
        mintDim: withOpacity("--color-mint-dim"),
        amber: withOpacity("--color-amber"),
        amberDim: withOpacity("--color-amber-dim"),
        violet: withOpacity("--color-violet"),
        violetDim: withOpacity("--color-violet-dim"),
        cyan: withOpacity("--color-cyan"),
        cyanDim: withOpacity("--color-cyan-dim"),
        coral: withOpacity("--color-coral"),
        coralDim: withOpacity("--color-coral-dim"),
        danger: withOpacity("--color-danger"),
      },
      fontFamily: {
        display: ["var(--font-body)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        // Деловые, еле заметные тени — без свечения
        glowCyan: "0 1px 2px rgba(15,23,42,0.14)",
        glowMint: "0 1px 2px rgba(15,23,42,0.14)",
        glowAmber: "0 1px 2px rgba(15,23,42,0.14)",
        glowViolet: "0 1px 2px rgba(15,23,42,0.14)",
        glowCoral: "0 1px 2px rgba(15,23,42,0.14)",
        panel: "0 1px 2px rgba(15,23,42,0.05), 0 1px 1px rgba(15,23,42,0.03)",
        panelLg: "0 12px 32px -12px rgba(15,23,42,0.25), 0 2px 6px rgba(15,23,42,0.06)",
        card: "0 1px 3px rgba(15,23,42,0.07)",
        brand: "0 1px 2px rgba(15,23,42,0.14)",
      },
      keyframes: {
        pulseBeacon: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(1.12)" },
        },
        scan: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
        floatKey: {
          "0%, 100%": { transform: "rotate(-4deg) translateY(0px)" },
          "50%": { transform: "rotate(4deg) translateY(-2px)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseBeacon: "pulseBeacon 1.8s ease-in-out infinite",
        scan: "none",
        floatKey: "none",
        rise: "rise 0.2s ease-out both",
      },
      backgroundImage: {
        // Декоративные фоны отключены (деловой стиль); имена оставлены, чтобы не ломать классы
        grid: "none",
        scanline: "none",
        brandRadial: "none",
        brandGradient: "linear-gradient(rgb(var(--color-cyan)), rgb(var(--color-cyan)))",
        brandText: "linear-gradient(rgb(var(--color-cyan)), rgb(var(--color-cyan)))",
      },
      backgroundSize: {
        gridcell: "36px 36px",
      },
    },
  },
  plugins: [],
};
export default config;
