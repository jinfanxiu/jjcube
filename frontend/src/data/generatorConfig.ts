export interface GeneratorConfig {
    id: string;
    label: string;
    pageTitle: string;
    topic: 'beauty' | 'certificateReview' | string;
    categoryName: string;
    description: string; // 설명 필드 추가
}

export const generatorConfigs: GeneratorConfig[] = [
    {
        id: 'chatterPost',
        label: '뷰티 잡담 게시글',
        pageTitle: '뷰티 잡담 게시글 & 댓글 생성기',
        topic: 'beauty',
        categoryName: '[자유수다방]',
        description: '일상적인 뷰티 관련 주제로 자유롭게 소통하는 게시글을 생성합니다.',
    },
    {
        id: 'certificateReview',
        label: '자격증 합격 후기',
        pageTitle: '자격증 합격 후기 & 댓글 생성기',
        topic: 'certificateReview',
        categoryName: '[합격후기]',
        description: '두피 및 피부 자격증 합격 경험을 공유하고 다른 사람들에게 동기를 부여하는 후기를 생성합니다.',
    },
];