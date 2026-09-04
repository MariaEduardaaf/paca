/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /*
         * O chão claro do site. O mesmo creme das capas e da landing
         * (#F3EDE6): com o fundo branco, blog e landing eram primos, não
         * gêmeos — este token fecha as três propriedades na mesma casa.
         */
        cream: "#F3EDE6",
        pink: {
          primary: "#FF8FB1",
          light: "#FFB5C9",
          dark: "#E5647A",
          50: "#FFF0F3",
          100: "#FFE1E9",
          200: "#FFC3D3",
          300: "#FF8FB1",
          400: "#FF6B95",
          500: "#FF4778",
          600: "#E5647A",
          700: "#CC3A5C",
          800: "#A62D4A",
          900: "#802238",
        },
        green: {
          primary: "#4ECDC4",
        },
        red: {
          primary: "#FF6B6B",
        },
        gray: {
          50: "#F8F9FA",
          100: "#F1F3F5",
          200: "#E9ECEF",
          300: "#DEE2E6",
          400: "#ADB5BD",
          500: "#868E96",
          /*
           * Degrau extra só para PLACEHOLDER em fundo claro. gray-500 dá 3,3:1
           * sobre branco (reprova em AA — placeholder é texto), e gray-600 fica
           * tão escuro que o campo parece já preenchido. #6C757D dá 4,7:1 e
           * continua com cara de dica.
           */
          550: "#6C757D",
          600: "#495057",
          700: "#343A40",
          800: "#212529",
          900: "#121212",
        },
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "system-ui", "sans-serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
