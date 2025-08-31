import type { FC } from 'react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

type CubeButtonProps = {
    icon: string;
    label: string;
    subtitle: string;
    colorKey?: 'sky' | 'emerald' | 'violet' | 'pink' | 'amber' | 'teal';
    path?: string;
};

const CubeButton: FC<CubeButtonProps> = ({ icon, label, subtitle, colorKey, path }) => {
    // PC 화면에서 버튼의 최대 너비를 제한하는 클래스 추가
    const base =
        'relative group block overflow-hidden rounded-2xl w-full aspect-square min-h-[9rem] max-w-[12rem] md:max-w-[14rem] lg:max-w-[16rem] mx-auto shadow-lg hover:shadow-xl transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

    const colorMap: Record<string, string> = {
        sky: 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500',
        emerald: 'bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600',
        violet: 'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500',
        pink: 'bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500',
        amber: 'bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500',
        teal: 'bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600'
    };

    const gradientClass = colorMap[colorKey ?? 'sky'];

    const ButtonContent = (
        <>
            <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(120%_100%_at_50%_-20%,rgba(225,225,225,.25),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition [background:conic-gradient(from_180deg_at_50%_50%,rgba(225,225,225,.0),rgba(225,225,225,.25),rgba(225,225,225,.0))] blur-xl" />
            <div className="relative z-10 h-full w-full flex flex-col items-center justify-center p-2 text-center">
                <i className={`bx ${icon} text-white text-4xl mb-2`} />
                <div className="text-white font-semibold text-base leading-tight">{label}</div>
                <div className="text-white/85 text-xs mt-1 leading-snug">{subtitle}</div>
            </div>
        </>
    );

    if (path) {
        return (
            <Link to={path} aria-label={label} className={`${base} ${gradientClass}`}>
                {ButtonContent}
            </Link>
        );
    }

    return (
        <button type="button" aria-label={label} className={`${base} ${gradientClass}`}>
            {ButtonContent}
        </button>
    );
};

export default memo(CubeButton);