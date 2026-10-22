/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "paper": "rgb(var(--c-paper) / <alpha-value>)",
        "ink": "rgb(var(--c-ink) / <alpha-value>)",
        "muted": "rgb(var(--c-muted) / <alpha-value>)",
        "line": "rgb(var(--c-line) / <alpha-value>)",
        "card": "rgb(var(--c-card) / <alpha-value>)",
        "navy": "rgb(var(--c-navy) / <alpha-value>)",
        "navy-dark": "rgb(var(--c-navy-dark) / <alpha-value>)",
        "wash": "rgb(var(--c-wash) / <alpha-value>)",
        "accent": "rgb(var(--c-accent) / <alpha-value>)",
        "steel": "rgb(var(--c-steel) / <alpha-value>)",
        "teal": "rgb(var(--c-teal) / <alpha-value>)",
        "violet": "rgb(var(--c-violet) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Source Sans 3", "sans-serif"],
        serif: ["var(--font-serif)", "Source Serif 4", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--c-shadow) / 0.08), 0 4px 14px rgb(var(--c-shadow) / 0.06)",
        lift: "0 18px 44px rgb(var(--c-shadow) / 0.18)",
      },
    },
  },
  plugins: [],
};
