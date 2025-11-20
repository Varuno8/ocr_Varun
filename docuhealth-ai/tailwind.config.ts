import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                brand: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    950: '#082f49',
                },
                cf: { // Clinical Futurism
                    bg: '#0A0F1C',
                    surface: {
                        DEFAULT: '#1A1F2E',
                        hover: '#2A3245',
                        glass: 'rgba(26, 31, 46, 0.6)',
                    },
                    accent: {
                        teal: '#00D4AA',
                        blue: '#0099FF',
                        amber: '#FFB800',
                        coral: '#FF6B8B',
                    },
                    text: {
                        primary: '#FFFFFF',
                        secondary: '#94A3B8',
                        muted: '#64748B',
                    },
                    grid: '#2A3245',
                }
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
                mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'plasma': 'linear-gradient(135deg, #00D4AA 0%, #0099FF 100%)',
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    from: { opacity: "0", transform: "translateY(10px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "slide-in-right": {
                    from: { opacity: "0", transform: "translateX(20px)" },
                    to: { opacity: "1", transform: "translateX(0)" },
                },
                "pulse-glow": {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 212, 170, 0.5)' },
                    '50%': { opacity: '0.8', boxShadow: '0 0 10px rgba(0, 212, 170, 0.2)' },
                },
                "float": {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                "scan-line": {
                    '0%': { top: '0%' },
                    '100%': { top: '100%' },
                }
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.4s ease-out forwards",
                "slide-in-right": "slide-in-right 0.4s ease-out forwards",
                "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 6s ease-in-out infinite",
                "scan-line": "scan-line 2s linear infinite",
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 20px rgba(0, 212, 170, 0.15)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }
        },
    },
    plugins: [require("tailwindcss-animate")],
};
export default config;
