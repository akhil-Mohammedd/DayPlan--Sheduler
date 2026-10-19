/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Instrument Sans', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'ui-monospace', 'monospace'],
        displayAlt: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        cardForeground: 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        popoverForeground: 'hsl(var(--popover-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        glass: 'var(--radius-container)',
      },
      boxShadow: {
        card: '0 1px 0 0 hsl(var(--foreground) / 0.02)',
        glass: 'var(--elevation-glass)',
        glow: 'var(--elevation-glow)',
      },
      animation: {
        rise: 'transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 280ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
};

