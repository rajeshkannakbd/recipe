/** @type {import('tailwindcss').Config} */
module.exports = {
   darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        recipe: {
          background: "#F7F8F3",
          primary: "#1F7655",
          primaryDark: "#15563F",
          dark: "#17231E",
          muted: "#68736D",
          border: "#E5E8E3",
          soft: "#E7F1EA",
        },
        category: {
          breakfast: "#F8D99E",
          main: "#CDE2D4",
          biryani: "#F4C5B8",
          snacks: "#F9E6A3",
          desserts: "#E5CBEA",
          soups: "#C7DCE7",
        },
      },
      borderRadius: {
        card: "24px",
      },
    },
  },
  plugins: [],
};
