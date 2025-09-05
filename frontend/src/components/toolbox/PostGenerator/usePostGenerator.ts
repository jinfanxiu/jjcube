import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import type { CustomOption } from '../../../data/generatorConfig';

interface Comment {
    nickname: string;
    commentText: string;
    replyTo?: string | null;
}

interface UsePostGeneratorProps {
    topic: string;
    customOptions?: CustomOption[];
}

export const usePostGenerator = ({ topic, customOptions }: UsePostGeneratorProps) => {
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

    const [customParams, setCustomParams] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const initialParams: { [key: string]: string } = {};
        if (customOptions) {
            customOptions.forEach(option => {
                if (option.values.length > 0) {
                    initialParams[option.paramKey] = option.values[0];
                }
            });
        }
        setCustomParams(initialParams);
        setGeneratedContent('');
        setGeneratedTitle('');
        setGeneratedAuthor('');
        setGeneratedComments([]);
        setError(null);
    }, [topic, customOptions]);

    const handleCustomParamChange = (paramKey: string, value: string) => {
        setCustomParams(prevParams => ({
            ...prevParams,
            [paramKey]: value
        }));
    };

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
                body: {
                    topic,
                    ...customParams
                },
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

    return {
        isPostLoading,
        isCommentsLoading,
        error,
        generatedTitle,
        generatedContent,
        generatedComments,
        generatedAuthor,
        isPostLiked,
        postCopyText,
        copiedCommentIndex,
        customParams,
        handleCustomParamChange,
        handleGeneratePost,
        handleGenerateComments,
        handleLikeClick,
        handleCopyPost,
        handleCopySingleComment,
    };
};