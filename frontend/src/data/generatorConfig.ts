export interface GeneratorConfig {
    id: string;
    label: string;
    pageTitle: string;
    topic: 'beauty' | 'certificateReview' | 'beautyPromoPost' | string;
    categoryName: string;
    description: string;
    enableComments: boolean; // 댓글 기능 활성화 여부 플래그 추가
}

export const generatorConfigs: GeneratorConfig[] = [
    {
        id: 'chatterPost',
        label: '뷰티 잡담 게시글',
        pageTitle: '뷰티 잡담 게시글 & 댓글 생성기',
        topic: 'beauty',
        categoryName: '[자유수다방]',
        description: '일상적인 뷰티 관련 주제로 자유롭게 소통하는 게시글을 생성합니다.',
        enableComments: true,
    },
    {
        id: 'certificateReview',
        label: '자격증 합격 후기',
        pageTitle: '자격증 합격 후기 & 댓글 생성기',
        topic: 'certificateReview',
        categoryName: '[합격후기]',
        description: '두피 및 피부 자격증 합격 경험을 공유하고 다른 사람들에게 동기를 부여하는 후기를 생성합니다.',
        enableComments: true,
    },
    {
        id: 'beautyPromoPost',
        label: '수강생 모집 광고',
        pageTitle: '수강생 모집 광고 생성기', // "& 댓글" 문구 제거
        topic: 'beautyPromoPost',
        categoryName: '[수강생모집]',
        description: '수강생 모집을 홍보하는 매력적인 광고 게시글을 생성합니다.',
        enableComments: false, // 댓글 기능 비활성화
    },
];