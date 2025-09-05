import { beautyPromptConfig } from './beauty.ts';
import { certificateReviewPromptConfig } from './certificateReview.ts';
import { beautyPromoPostPromptConfig } from './beautyPromoPost.ts';

interface PromptConfig {
    apiType: 'chat' | 'responses';
    model: string;
    system?: string;
    params: { [key: string]: any };
}

export const prompts: { [key: string]: PromptConfig } = {
    beauty: beautyPromptConfig,
    certificateReview: certificateReviewPromptConfig,
    beautyPromoPost: beautyPromoPostPromptConfig,
};