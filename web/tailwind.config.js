/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3f0e8",
        ink: "#1c1915",
        muted: "#4a453c",
        line: "#ddd6c8",
        card: "#fbfaf6",
        pine: "#1e4d3a",
        "pine-dark": "#16382b",
        mist: "#e5efe8",
        cream: "#f7f4ee",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Source Sans 3", "sans-serif"],
        serif: ["var(--font-serif)", "Source Serif 4", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
