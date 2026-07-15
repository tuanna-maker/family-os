/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: "rgb(var(--brand) / <alpha-value>)",
        pink: "rgb(var(--pink) / <alpha-value>)",
        navy: "rgb(var(--navy) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        emergency: "rgb(var(--emergency) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / 0.14)",
        input: "rgb(var(--border) / 0.14)",
        ring: "rgb(var(--brand) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--emergency) / <alpha-value>)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / 0.06)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--muted) / 0.06)",
          foreground: "rgb(var(--foreground) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
