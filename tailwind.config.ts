import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F4F8FC",
        bg2: "#FFFFFF",
        panel: "#FFFFFF",
        panel2: "#EAF2FB",
        line: "#D7E4F3",
        ink: "#0F2545",
        muted: "#5B73A5",
        faint: "#8CA0BF",
        mint: "#12B76A",
        mintDim: "#DDF6E9",
        amber: "#DC8A0E",
        amberDim: "#FBEED9",
        violet: "#5B5FEE",
        violetDim: "#E6E6FD",
        cyan: "#1274E0",
        cyanDim: "#E1EEFC",
        danger: "#E23B5C",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        glowCyan: "0 0 20px rgba(18,116,224,0.18)",
        glowMint: "0 0 20px rgba(18,183,106,0.18)",
        glowAmber: "0 0 20px rgba(220,138,14,0.18)",
        glowViolet: "0 0 20px rgba(91,95,238,0.18)",
        panel: "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 28px -18px rgba(15,37,69,0.18)",
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
        grid: "linear-gradient(rgba(15,37,69,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,37,69,0.045) 1px, transparent 1px)",
        scanline:
          "linear-gradient(90deg, transparent, rgba(18,116,224,0.45), transparent)",
      },
      backgroundSize: {
        gridcell: "36px 36px",
      },
    },
  },
  plugins: [],
};
export default config;
