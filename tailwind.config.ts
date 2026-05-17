import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172026',
        calm: '#f6f3ee',
        sage: '#dfe8df',
        clay: '#b9765a'
      }
    }
  },
  plugins: []
};

export default config;
