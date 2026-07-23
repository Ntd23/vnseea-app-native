/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './App.{js,jsx,ts,tsx}',
      './index.{js,jsx,ts,tsx}',
      './src/**/*.{js,jsx,ts,tsx}',
    ],
    presets: [require('nativewind/preset')],
    theme: {
      extend: {
        colors: {
          brand: {
            DEFAULT: '#B91C1C',
            pressed: '#991B1B',
            soft: 'rgba(185, 28, 28, 0.08)',
            'soft-pressed': 'rgba(185, 28, 28, 0.14)',
            subtle: 'rgba(185, 28, 28, 0.08)',
            border: 'rgba(185, 28, 28, 0.18)',
            on: '#FFFFFF',
            'on-muted': '#FEE2E2',
            'border-on': 'rgba(255, 255, 255, 0.25)',
            shadow: 'rgba(153, 27, 27, 0.24)',
          },
          info: {
            DEFAULT: '#3B82F6',
            soft: '#EFF6FF',
            border: '#BFDBFE',
            muted: '#DBEAFE',
          },
          success: {
            DEFAULT: '#16A34A',
            soft: '#F0FDF4',
            border: '#BBF7D0',
          },
          warning: {
            DEFAULT: '#F59E0B',
            soft: '#FFFBEB',
            border: '#FDE68A',
          },
          destructive: {
            DEFAULT: '#DC2626',
            soft: '#FEF2F2',
            border: '#FECACA',
          },
        },
      },
    },
    plugins: [],
  };
