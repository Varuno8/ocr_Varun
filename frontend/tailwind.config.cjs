/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-light': '#60A5FA',
        background: '#F3F4F6',
        card: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        muted: '#6B7280',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
