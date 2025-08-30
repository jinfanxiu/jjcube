import CubeButton from '../../components/common/CubeButton/CubeButton';
import { toolboxMenuData } from '../../data/toolboxMenuData';

/**
 * @page ToolboxPage
 * @description 다양한 관리 도구로 연결되는 대시보드 페이지입니다.
 *              '빠른 기능'이라는 제목 아래에 아이콘 버튼들을 표시합니다.
 */
const ToolboxPage = () => {
    return (
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-10 w-full">
            <h2 className="text-lg sm:text-xl font-extold mb-6">빠른 기능</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {toolboxMenuData.map((cube) => (
                    <CubeButton
                        key={cube.label}
                        icon={cube.icon}
                        label={cube.label}
                        subtitle={cube.subtitle}
                        colorKey={cube.colorKey}
                        path={cube.path}
                    />
                ))}
            </div>
        </div>
    );
};

export default ToolboxPage;