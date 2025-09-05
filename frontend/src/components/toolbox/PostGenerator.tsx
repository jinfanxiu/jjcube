import type { FC } from 'react';
import type { CustomOption } from '../../data/generatorConfig';
import { ProgressBar, PostSkeletonLoader } from './PostGenerator/SkeletonLoaders';
import { usePostGenerator } from './PostGenerator/usePostGenerator';
import { PostDisplay } from './PostGenerator/PostDisplay';
import { PostGeneratorHeader } from './PostGenerator/PostGeneratorHeader';
import { CustomOptions } from './PostGenerator/CustomOptions';

interface PostGeneratorProps {
    pageTitle: string;
    topic: string;
    categoryName: string;
    enableComments: boolean;
    customOptions?: CustomOption[];
}

const PostGenerator: FC<PostGeneratorProps> = ({ pageTitle, topic, categoryName, enableComments, customOptions }) => {
    const hookResult = usePostGenerator({ topic, customOptions });
    const {
        isPostLoading,
        isCommentsLoading,
        error,
        generatedContent,
    } = hookResult;

    const isLoading = isPostLoading || isCommentsLoading;

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full font-sans border border-gray-700">
            <PostGeneratorHeader
                pageTitle={pageTitle}
                isPostLoading={isPostLoading}
                isLoading={isLoading}
                handleGeneratePost={hookResult.handleGeneratePost}
            />

            {customOptions && customOptions.length > 0 && (
                <CustomOptions
                    customOptions={customOptions}
                    customParams={hookResult.customParams}
                    handleCustomParamChange={hookResult.handleCustomParamChange}
                />
            )}

            <div className="bg-gray-700 rounded-lg shadow-inner min-h-[400px] p-6">
                {error && <p className="text-red-400 text-center mb-4">오류: {error}</p>}

                {isLoading && (
                    <div className="mb-6">
                        <ProgressBar />
                    </div>
                )}

                {isPostLoading ? (
                    <PostSkeletonLoader />
                ) : generatedContent ? (
                    <PostDisplay
                        {...hookResult}
                        categoryName={categoryName}
                        enableComments={enableComments}
                        isLoading={isLoading}
                    />
                ) : (
                    <div className="text-center text-gray-400 flex items-center justify-center h-full">
                        <p>'새 본문 생성' 버튼을 클릭하여 시작하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostGenerator;