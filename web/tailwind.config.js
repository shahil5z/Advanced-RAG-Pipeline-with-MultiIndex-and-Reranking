/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4f6f9",
        ink: "#101828",
        muted: "#3e4c5f",
        line: "#d5dee8",
        card: "#ffffff",
        navy: "#13293d",
        "navy-dark": "#0c1e2e",
        wash: "#e8eef5",
        accent: "#9a541f",
        steel: "#5c6b82",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Source Sans 3", "sans-serif"],
        serif: ["var(--font-serif)", "Source Serif 4", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06)",
        lift: "0 16px 40px rgba(16, 36, 56, 0.12)",
      },
    },
  },
  plugins: [],
};
