import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        panel: "#121212",
        rail: "#181818",
        line: "#262626",
        line2: "#333333",
        gold: "#D4AF37",
        golddim: "#8A7223",
        goldwash: "rgba(212,175,55,0.10)",
        chalk: "#F4F4F4",
        muted: "#8C8C8C",
        dim: "#5E5E5E",
        good: "#4FB477",
        warn: "#E0A82E",
        bad: "#D9584B",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        head: ["var(--font-head)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 30px rgba(0,0,0,0.5)",
        lift: "0 18px 50px rgba(0,0,0,0.65)",
      },
      borderRadius: { xs: "3px" },
    },
  },
  plugins: [],
};
export default config;
