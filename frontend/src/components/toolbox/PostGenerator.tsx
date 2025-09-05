import { useState, Fragment } from 'react';
import type { FC } from 'react';
import { supabase } from '../../supabaseClient';
import ImagePlaceholder from '../common/ImagePlaceholder';

interface Comment {
    nickname: string;
    commentText: string;
    replyTo?: string | null;
}

interface PostGeneratorProps {
    pageTitle: string;
    topic: string;
    categoryName: string;
    enableComments: boolean;
}

const ProgressBar: FC = () => (
    <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
        <div className="w-1/4 h-full bg-indigo-500 rounded-full animate-indeterminate"></div>
    </div>
);

const PostSkeletonLoader: FC = () => (
    <div className="animate-pulse">
        <div className="h-3 w-1/4 bg-gray-200 rounded mb-4"></div>
        <div className="h-8 w-3/4 bg-gray-300 rounded mb-4"></div>
        <div className="flex items-center space-x-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-gray-200"></div>
            <div className="h-4 w-1/5 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
    </div>
);

const CommentsSkeletonLoader: FC = () => (
    <div className="mt-6 space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                </div>
                <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-1/4 bg-gray-200 rounded"></div>
                    <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                </div>
            </div>
        ))}
    </div>
);


const PostGenerator: FC<PostGeneratorProps> = ({ pageTitle, topic, categoryName, enableComments }) => {
    const [isPostLoading, setIsPostLoading] = useState(false);
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sourceArticleId, setSourceArticleId] = useState<number | null>(null);
    const [sourceTable, setSourceTable] = useState<string | null>(null);

    const [generatedTitle, setGeneratedTitle] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [generatedComments, setGeneratedComments] = useState<Comment[]>([]);
    const [generatedAuthor, setGeneratedAuthor] = useState('');

    const [isPostLiked, setIsPostLiked] = useState(false);
    const [postCopyText, setPostCopyText] = useState('본문 복사');
    const [copiedCommentIndex, setCopiedCommentIndex] = useState<number | null>(null);

    const handleGeneratePost = async () => {
        setIsPostLoading(true);
        setError(null);
        setGeneratedTitle('');
        setGeneratedContent('');
        setGeneratedComments([]);
        setSourceArticleId(null);
        setSourceTable(null);
        setGeneratedAuthor('');
        setIsPostLiked(false);
        setPostCopyText('본문 복사');

        try {
            const { data, error } = await supabase.functions.invoke('generate-chatter-post', {
                body: { topic },
            });

            if (error) throw error;

            if (data.generatedArticle) {
                setSourceArticleId(data.sourceArticleId);
                setSourceTable(data.sourceTable);
                setGeneratedAuthor(data.generatedArticle.author);
                setGeneratedTitle(data.generatedArticle.title);
                setGeneratedContent(data.generatedArticle.content);
            } else {
                throw new Error("서버로부터 유효한 데이터를 받지 못했습니다.");
            }

        } catch (e: any) {
            console.error("본문 생성 오류:", e);
            const errorMessage = e.context?.json ? (await e.context.json()).message : e.message;
            setError(errorMessage || '알 수 없는 오류');
        } finally {
            setIsPostLoading(false);
        }
    };

    const handleGenerateComments = async () => {
        if (!sourceArticleId || !generatedContent || !sourceTable) return;
        setIsCommentsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.functions.invoke('generate-comments', {
                body: {
                    sourceArticleId,
                    generatedContent,
                    sourceTable,
                },
            });

            if (error) throw error;

            setGeneratedComments(data.comments || []);
        } catch (e: any) {
            console.error("댓글 생성 오류:", e);
            const errorMessage = e.context?.json ? (await e.context.json()).message : e.message;
            setError(errorMessage || '알 수 없는 오류');
        } finally {
            setIsCommentsLoading(false);
        }
    };

    const handleLikeClick = () => setIsPostLiked(!isPostLiked);

    const handleCopyPost = () => {
        const postText = `${generatedTitle}\n\n${generatedContent}`;
        navigator.clipboard.writeText(postText).then(() => {
            setPostCopyText('복사 완료!');
            setTimeout(() => setPostCopyText('본문 복사'), 2000);
        });
    };

    const handleCopySingleComment = (commentText: string, index: number) => {
        navigator.clipboard.writeText(commentText).then(() => {
            setCopiedCommentIndex(index);
            setTimeout(() => setCopiedCommentIndex(null), 2000);
        });
    };

    const isLoading = isPostLoading || isCommentsLoading;

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full font-sans border border-gray-700">
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

            <div className="bg-gray-700 rounded-lg shadow-inner min-h-[400px] p-6">
                {error && <p className="text-red-400 text-center mb-4">오류: {error}</p>}

                {(isPostLoading || isCommentsLoading) && (
                    <div className="mb-6">
                        <ProgressBar />
                    </div>
                )}

                {isPostLoading ? (
                    <PostSkeletonLoader />
                ) : generatedContent ? (
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