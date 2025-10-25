/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Legacy colors for backward compatibility
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: '#100a43',
        secondary: '#7b6bf7',
        tertiary: '#dcacff',
        violet: {
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },

        // New Global Brand Colors
        'primary-purple': 'var(--color-primary-purple)',
        'purple-hover': 'var(--color-purple-hover)',
        'purple-dark': 'var(--color-purple-dark)',
        'haze-blue-bg': 'var(--color-haze-blue-bg)',

        // Text Colors
        'rain-charcoal': 'var(--color-text-primary)',
        'gray-text': 'var(--color-text-secondary)',

        // Social Proof Colors
        'blue-smb': 'var(--color-blue-smb)',
        'green-freelancer': 'var(--color-green-freelancer)',

        // Utility Colors
        'border-gray': 'var(--color-border-gray)',
        'border-gray-alpha': 'var(--color-border-gray-alpha)',
        'dry-sage': 'var(--color-dry-sage)',
        'fog-lilac': 'var(--color-fog-lilac)',
        'green-accent': 'var(--color-green-accent)',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      maxWidth: {
        '9xl': '96rem',
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
      },
      screens: {
        'xs': '475px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}