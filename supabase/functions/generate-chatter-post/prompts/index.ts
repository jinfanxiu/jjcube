import { beautyPrompt } from './beauty.ts';
import { certificateReviewPrompt } from './certificateReview.ts';
import { beautyPromoPostPrompt } from './beautyPromoPost.ts';

export const prompts: { [key: string]: { system: string; model?: string } } = {
    beauty: beautyPrompt,
    certificateReview: certificateReviewPrompt,
    beautyPromoPost: beautyPromoPostPrompt,
};