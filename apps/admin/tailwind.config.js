/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          800: '#381403',
          855: '#2E1002',
          900: '#210E04',
          950: '#120702',
        },
        stone: {
          800: '#381403',
          900: '#210E04',
          950: '#120702',
        },
        primary: {
          50: 'var(--primary-50, #FFF8F0)',
          100: 'var(--primary-100, #FDF0E6)',
          200: 'var(--primary-200, #F5D9C4)',
          300: 'var(--primary-300, #E6B998)',
          405: 'var(--primary-405, #C28052)',
          400: 'var(--primary-400, #D49B70)',
          500: 'var(--primary-500, #A65D2E)',
          600: 'var(--primary-600, #8C471E)',
          655: 'var(--primary-655, #733615)',
          750: 'var(--primary-750, #471C06)',
          755: 'var(--primary-755, #381403)',
          700: 'var(--primary-700, #5C270C)',
          800: 'var(--primary-800, #2E1002)',
          900: 'var(--primary-900, #210E04)',
          950: 'var(--primary-950, #120702)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', '"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
