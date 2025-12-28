/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"]
      },
      colors: {
        primary: "#e50914",
        accent: "#fbbf24"
      },
      boxShadow: {
        glow: "0 0 30px rgba(229, 9, 20, 0.35)"
      }
    }
  },
  plugins: []
};
