import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        penny: {
          cream: "#FFF3D6",
          tan: "#F5D29A",
          gold: "#F2B544",
          orange: "#E9822A",
          brown: "#4A2A1B",
          sky: "#74D1D8",
          mint: "#BFEED3",
          leaf: "#4CAF50"
        }
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,0.10)" },
      borderRadius: { xl2: "1.25rem" }
    }
  },
  plugins: []
} satisfies Config;
