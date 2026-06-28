import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          DEFAULT: "#0D1B4B",
          light: "#1e2f6b",
          dark: "#060d26",
        },
        gold: {
          DEFAULT: "#E8A500",
          light: "#ffbf1a",
          dark: "#b38000",
        },
        brand: {
          red: "#D32F2F",
          green: "#2E7D32",
          orange: "#ED6C02",
          blue: "#0288D1",
        },
        surface: "#F8F9FA",
        card: "#FFFFFF",
        divider: "#E0E0E0",
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'sans-serif'],
        gujarati: ['var(--font-gujarati)', 'sans-serif'],
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.08)",
        premium: "0 10px 30px -10px rgba(13, 27, 75, 0.15)",
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
      }
    },
  },
  plugins: [],
};
export default config;
