import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0E17",
        bg2: "#0D1220",
        panel: "#121A2C",
        panel2: "#182136",
        line: "#232E47",
        ink: "#E8ECF5",
        muted: "#8792AC",
        faint: "#5A657F",
        mint: "#3DDC97",
        mintDim: "#1F4F3D",
        amber: "#FFB454",
        amberDim: "#4D3A1C",
        violet: "#7C83FD",
        violetDim: "#2C2E5C",
        cyan: "#00E5FF",
        cyanDim: "#0A3A45",
        danger: "#FF5C7A",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        glowCyan: "0 0 24px rgba(0,229,255,0.25)",
        glowMint: "0 0 24px rgba(61,220,151,0.3)",
        glowAmber: "0 0 24px rgba(255,180,84,0.3)",
        glowViolet: "0 0 24px rgba(124,131,253,0.3)",
        panel: "0 1px 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
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
        grid: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        scanline:
          "linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)",
      },
      backgroundSize: {
        gridcell: "36px 36px",
      },
    },
  },
  plugins: [],
};
export default config;
