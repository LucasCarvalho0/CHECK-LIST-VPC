import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { nissan: { DEFAULT: '#C3002F', dark: '#8f0022' } },
    },
  },
  plugins: [],
};
export default config;
