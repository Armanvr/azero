import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        surface3: "var(--surface3)",
        border: "var(--border)",
        border2: "var(--border2)",
        gold: "var(--gold)",
        "gold-light": "var(--gold-light)",
        "gold-dim": "var(--gold-dim)",
        purple: "var(--purple)",
        "purple-dim": "var(--purple-dim)",
        blue: "var(--blue)",
        green: "var(--green)",
        red: "var(--red)",
        text: "var(--text)",
        "text-dim": "var(--text-dim)",
        "text-muted": "var(--text-muted)"
      },
      fontFamily: {
        rajdhani: ["Rajdhani", "sans-serif"],
        exo: ["'Exo 2'", "sans-serif"]
      },
      fontSize: {
        xs: ["10px", { lineHeight: "1.4" }],      // Labels, métadonnées
        sm: ["12px", { lineHeight: "1.5" }],      // Texte secondaire
        base: ["16px", { lineHeight: "1.5" }],    // Texte principal (défaut)
        md: ["18px", { lineHeight: "1.5" }],      // Sous-titres
        lg: ["20px", { lineHeight: "1.4" }],      // Titres
        xl: ["24px", { lineHeight: "1.3" }],      // Grands titres
        "2xl": ["32px", { lineHeight: "1.2" }],   // Hero titres
      }
    }
  },
  plugins: []
};

export default config;
