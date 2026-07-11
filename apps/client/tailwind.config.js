/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // CLAUDE.md Bölüm 6 — tema tokenları
      colors: {
        bg: "#0d0d10",
        panel: "#16161c",
        gold: "#c9a227",
        bordeaux: "#8b1e2d",
        info: "#6366f1",
        ink: "#e8e6e1",
        muted: "#9b988f",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
