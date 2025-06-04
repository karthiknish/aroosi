import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-nunito-sans)", "sans-serif"],
        serif: ["var(--font-lora)", "serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#EC4899", // Softer Pink
          light: "#F9A8D4",
          dark: "#BE185D",
        },
        secondary: {
          DEFAULT: "#5F92AC", // Deeper dusty blue
          light: "#A2C4DB", // Moved this down from DEFAULT
          dark: "#3E647A", // Muted steel blue
        },
        accent: {
          DEFAULT: "#D6B27C", // Muted Gold / Warm Sand
          light: "#EDD6A4", // Pale Warm Beige
          dark: "#B28E5F", // Rich Caramel Bronze
        },
        base: {
          DEFAULT: "#F9F7F5", // Clean soft off-white
          light: "#FFFFFF",
          dark: "#E7E3DF",
        },
        neutral: {
          DEFAULT: "#4A4A4A", // Muted charcoal for text
          light: "#7A7A7A",
        },
        success: {
          DEFAULT: "#7BA17D", // Gentle Green
        },
        danger: {
          DEFAULT: "#B45E5E", // Subtle Terracotta Red
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;