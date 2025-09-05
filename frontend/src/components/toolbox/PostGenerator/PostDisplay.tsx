import { Fragment } from 'react';
import type { FC } from 'react';
import ImagePlaceholder from '../../common/ImagePlaceholder';
import { CommentsSkeletonLoader } from './SkeletonLoaders';

interface Comment {
    nickname: string;
    commentText: string;
    replyTo?: string | null;
}

interface PostDisplayProps {
    categoryName: string;
    generatedTitle: string;
    generatedAuthor: string;
    generatedContent: string;
    generatedComments: Comment[];
    enableComments: boolean;
    isPostLiked: boolean;
    postCopyText: string;
    copiedCommentIndex: number | null;
    isCommentsLoading: boolean;
    isLoading: boolean;
    handleLikeClick: () => void;
    handleCopyPost: () => void;
    handleGenerateComments: () => void;
    handleCopySingleComment: (commentText: string, index: number) => void;
}


export const PostDisplay: FC<PostDisplayProps> = ({
                                                      categoryName,
                                                      generatedTitle,
                                                      generatedAuthor,
                                                      generatedContent,
                                                      generatedComments,
                                                      enableComments,
                                                      isPostLiked,
                                                      postCopyText,
                                                      copiedCommentIndex,
                                                      isCommentsLoading,
                                                      isLoading,
                                                      handleLikeClick,
                                                      handleCopyPost,
                                                      handleGenerateComments,
                                                      handleCopySingleComment,
                                                  }) => {
    return (
        <article>
            <header className="mb-4">
                <div>
                    <span className="text-indigo-400 font-bold text-sm">{categoryName}</span>
                </div>
                <h1 className="text-2xl font-extrabold text-white mt-2">{generatedTitle}</h1>
                <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-gray-600"></div>
                        <span className="font-semibold text-gray-200">{generatedAuthor}</span>
                    </div>
                    {enableComments && (
                        <div className="text-sm text-gray-400">
                            <span>댓글 {generatedComments.length}</span>
                        </div>
                    )}
                </div>
            </header>
            <hr className="my-4 border-gray-600" />
            <div className="prose prose-lg max-w-none text-gray-300 prose-invert whitespace-pre-wrap mb-6">
                {generatedContent.split('[사진 삽입 위치]').map((text, index, arr) => (
                    <Fragment key={index}>
                        {text}
                        {index < arr.length - 1 && <ImagePlaceholder />}
                    </Fragment>
                ))}
            </div>

            <footer className="border-t border-gray-600 pt-4 flex justify-between items-center text-gray-400">
                <div className="flex space-x-4">
                    <button onClick={handleLikeClick} className={`flex items-center space-x-1 transition-colors ${isPostLiked ? 'text-red-500' : 'hover:text-red-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
                        </svg>
                        <span>좋아요</span>
                        <span>{isPostLiked ? 1 : 0}</span>
                    </button>
                    {enableComments && (
                        <div className="flex items-center space-x-1">
                            <span>💬</span>
                            <span>댓글</span>
                            <span>{generatedComments.length}</span>
                        </div>
                    )}
                </div>
                <div className="flex space-x-4 text-sm">
                    <button onClick={handleCopyPost} className="bg-gray-600 text-gray-100 text-xs font-bold py-1 px-3 rounded-md hover:bg-gray-500">
                        {postCopyText}
                    </button>
                </div>
            </footer>

            {enableComments && (
                <>
                    <hr className="my-6 border-gray-600" />

                    <div className="mt-4">
                        <button
                            onClick={handleGenerateComments}
                            disabled={!generatedContent || isLoading}
                            className="w-full bg-teal-500 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isCommentsLoading ? '댓글 생성 중...' : '댓글 생성하기'}
                        </button>

                        {isCommentsLoading ? (
                            <CommentsSkeletonLoader />
                        ) : (
                            <div className="mt-6 space-y-4">
                                {generatedComments.map((comment, index) => (
                                    <div key={`${comment.nickname}-${index}`} className={`flex items-start space-x-3 ${comment.replyTo ? 'ml-8' : ''}`}>
                                        <div className="flex-shrink-0">
                                            <div title={comment.nickname} className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 font-bold text-sm">
                                                {comment.nickname.substring(0, 1)}
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-gray-800 rounded-lg p-3 relative">
                                            <p className="font-semibold text-sm text-gray-200">{comment.nickname}</p>
                                            {comment.replyTo && (
                                                <p className="text-xs text-indigo-400 font-medium">@{comment.replyTo}에게 답글</p>
                                            )}
                                            <p className="text-sm text-gray-300 whitespace-pre-wrap mt-1">{comment.commentText}</p>

                                            <button
                                                onClick={() => handleCopySingleComment(comment.commentText, index)}
                                                className="absolute top-2 right-2 bg-gray-600 text-gray-200 text-xs font-bold py-1 px-2 rounded-md hover:bg-gray-500"
                                            >
                                                {copiedCommentIndex === index ? '복사 완료!' : '복사'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </article>
    );
};