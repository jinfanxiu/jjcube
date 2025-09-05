export interface CustomOption {
    paramKey: string;
    label: string;
    values: string[];
}

export interface GeneratorConfig {
    id: string;
    label: string;
    pageTitle: string;
    topic: string;
    categoryName: string;
    description: string;
    enableComments: boolean;
    customOptions?: CustomOption[];
}

export const generatorConfigs: GeneratorConfig[] = [
    {
        id: 'chatterPost',
        label: '뷰티 잡담 게시글',
        pageTitle: '뷰티 잡담 게시글 생성',
        topic: 'beauty',
        categoryName: '[자유수다방]',
        description: '일상적인 뷰티 관련 주제로 자유롭게 소통하는 게시글을 생성합니다.',
        enableComments: true,
    },
    {
        id: 'certificateReview',
        label: '자격증 합격 후기',
        pageTitle: '자격증 합격 후기 생성',
        topic: 'certificateReview',
        categoryName: '[합격후기]',
        description: '두피 및 피부 자격증 합격 경험을 공유하고 다른 사람들에게 동기를 부여하는 후기를 생성합니다.',
        enableComments: true,
    },
    {
        id: 'beautyPromoPost',
        label: '수강생 모집 광고',
        pageTitle: '수강생 모집글 광고 생성',
        topic: 'beautyPromoPost',
        categoryName: '[수강생모집]',
        description: '수강생 모집을 홍보하는 매력적인 광고 게시글을 생성합니다.',
        enableComments: false,
        customOptions: [
            {
                paramKey: 'brandName',
                label: '브랜드명 선택',
                values: ['제이제이뷰티아카데미', '숲칼프', '스킨핏헤드스파'],
            },
        ],
    },
];