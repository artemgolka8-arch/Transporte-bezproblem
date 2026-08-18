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
        danger: withOpacity("--color-danger"),
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        glowCyan: "0 0 24px rgba(15,148,137,0.22)",
        glowMint: "0 0 20px rgba(16,168,110,0.18)",
        glowAmber: "0 0 20px rgba(202,122,15,0.18)",
        glowViolet: "0 0 20px rgba(99,91,214,0.18)",
        panel: "0 1px 0 rgba(255,255,255,0.7) inset, 0 16px 36px -20px rgba(9,32,38,0.20)",
        panelLg: "0 1px 0 rgba(255,255,255,0.7) inset, 0 28px 60px -24px rgba(9,32,38,0.28)",
        card: "0 1px 0 rgba(255,255,255,0.6) inset, 0 10px 24px -16px rgba(9,32,38,0.16)",
        brand: "0 18px 40px -18px rgba(15,148,137,0.45)",
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
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseBeacon: "pulseBeacon 1.8s ease-in-out infinite",
        scan: "scan 3s linear infinite",
        floatKey: "floatKey 3.2s ease-in-out infinite",
        rise: "rise 0.45s ease both",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(12,34,45,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(12,34,45,0.05) 1px, transparent 1px)",
        scanline:
          "linear-gradient(90deg, transparent, rgba(20,166,153,0.55), transparent)",
        brandRadial:
          "radial-gradient(circle at 15% -10%, rgba(20,166,153,0.16), transparent 45%), radial-gradient(circle at 85% 0%, rgba(99,91,214,0.10), transparent 42%), radial-gradient(circle at 50% 120%, rgba(20,166,153,0.10), transparent 50%)",
        brandGradient: "linear-gradient(135deg, #0F9489 0%, #14b8a6 45%, #635BD6 130%)",
        brandText: "linear-gradient(120deg, #0F9489 0%, #17BFB2 55%, #635BD6 130%)",
      },
      backgroundSize: {
        gridcell: "36px 36px",
      },
    },
  },
  plugins: [],
};
export default config;
