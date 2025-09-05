import type { FC } from 'react';

interface PostGeneratorHeaderProps {
    pageTitle: string;
    isPostLoading: boolean;
    isLoading: boolean;
    handleGeneratePost: () => void;
}

export const PostGeneratorHeader: FC<PostGeneratorHeaderProps> = ({
                                                                      pageTitle,
                                                                      isPostLoading,
                                                                      isLoading,
                                                                      handleGeneratePost
                                                                  }) => {
    return (
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">{pageTitle}</h2>
            <button
                onClick={handleGeneratePost}
                disabled={isLoading}
                className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-500"
            >
                {isPostLoading ? '본문 생성 중...' : '새 본문 생성'}
            </button>
        </div>
    );
};