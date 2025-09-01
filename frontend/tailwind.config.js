/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            keyframes: {
                indeterminate: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(400%)' }, // w-1/4 이므로 400%여야 화면을 끝까지 가로지름
                }
            },
            animation: {
                'indeterminate': 'indeterminate 1.5s ease-in-out infinite',
            }
        },
    },
    plugins: [],
}