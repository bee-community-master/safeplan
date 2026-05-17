import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172026',
        muted: '#5f6b66',
        calm: '#f7f3ec',
        paper: '#fffdf9',
        line: '#e6ded2',
        teal: '#00796d',
        tealDark: '#005c54',
        tealSoft: '#e6f3f1',
        sage: '#e6f3f1',
        clay: '#00796d'
      },
      boxShadow: {
        soft: '0 18px 50px rgba(23, 32, 38, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
