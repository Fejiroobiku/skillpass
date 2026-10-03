export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#EEF8F7',
          100: '#D5EFEC',
          200: '#AEDFDA',
          300: '#7FCBC4',
          500: '#1A9A92',
          600: '#13807A',
          700: '#0F6B66',
          800: '#0E5652',
          900: '#0B4441',
        },
        ink: {
          DEFAULT: '#16242B',
          muted: '#56666D',
          subtle: '#859398',
        },
        line: '#E3E9EA',
        canvas: '#F5F8F8',
        ok: { 50: '#ECF8F0', 200: '#BFE6CC', 600: '#1F8A4C', 700: '#17693A' },
        warn: { 50: '#FFF6E5', 200: '#F7D9A3', 600: '#B86E00', 700: '#8F5500' },
        bad: { 50: '#FDEEEE', 200: '#F3C4C1', 600: '#C2362F', 700: '#9A2A24' },
      },
    },
  },
}
