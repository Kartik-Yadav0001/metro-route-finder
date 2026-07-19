export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        panel: 'rgba(12, 20, 36, 0.72)',
        accent: '#ff7a59',
        accent2: '#22c55e',
      },
      boxShadow: {
        glow: '0 20px 80px rgba(255, 122, 89, 0.18)',
      },
    },
  },
  plugins: [],
};
