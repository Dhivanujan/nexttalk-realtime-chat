/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e7fff3",
          100: "#c6f7e3",
          200: "#95eccb",
          300: "#5fd9ad",
          400: "#38c98f",
          500: "#25d366",
          600: "#1ea957",
          700: "#178346",
          800: "#0f5f33",
          900: "#0a3f23"
        },
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
          200: "#e2e8f0"
        }
      },
      fontFamily: {
        display: ["Unbounded", "Space Grotesk", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"]
      },
      boxShadow: {
        glass: "0 18px 30px -12px rgba(15, 23, 42, 0.2)",
        glow: "0 10px 30px rgba(37, 211, 102, 0.25)"
      },
      borderRadius: {
        xl: "22px"
      }
    }
  },
  plugins: []
};
