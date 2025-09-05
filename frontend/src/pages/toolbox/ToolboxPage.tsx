import type { FC } from 'react';
import CubeButton from '../../components/common/CubeButton/CubeButton';

const tools = [
    {
        icon: 'bxs-edit-alt',
        label: '게시글/후기 생성',
        subtitle: 'AI로 글쓰기',
        colorKey: 'sky',
        path: '/toolbox/post-generator',
    },
    {
        icon: 'bxs-image',
        label: '이미지 미러링',
        subtitle: '사진 변환',
        colorKey: 'emerald',
        path: '/toolbox/mirror-image',
    },
    // 새로운 툴을 여기에 추가할 수 있습니다.
    // {
    //   icon: 'bxs-file-find',
    //   label: '새로운 툴',
    //   subtitle: '준비 중',
    //   colorKey: 'violet',
    //   path: '/toolbox/new-tool',
    // },
];

const ToolboxPage: FC = () => {
    return (
        <div className="flex-grow bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
                        AI 툴박스
                    </h1>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                        필요한 AI 도구를 선택하여 작업을 시작하세요.
                    </p>
                </header>

                <main>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
                        {tools.map((tool) => (
                            <CubeButton
                                key={tool.label}
                                icon={tool.icon}
                                label={tool.label}
                                subtitle={tool.subtitle}
                                colorKey={tool.colorKey as any}
                                path={tool.path}
                            />
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ToolboxPage;