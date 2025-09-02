type CubeButtonType = {
    icon: string;
    label: string;
    subtitle: string;
    colorKey: 'sky' | 'emerald' | 'violet' | 'pink' | 'amber' | 'teal';
    path: string;
};

// 툴박스 메뉴 데이터
export const toolboxMenuData: readonly CubeButtonType[] = [
    {
        icon: 'bx-bot',
        label: '미러 이미지 생성',
        subtitle: '1장의 사진을 여러각도 이미지로',
        colorKey: 'emerald',
        path: '/toolbox/mirror-image'
    },
    {
        icon: 'bxs-conversation',
        label: '게시글 & 댓글 생성기',
        subtitle: 'AI로 진짜같은 게시글을 생성',
        colorKey: 'violet',
        path: '/toolbox/chatter-post-generator'
    },
    {
        icon: 'bxs-badge-check',
        label: '자격증 후기 & 댓글 생성기',
        subtitle: 'AI로 합격 후기 게시글을 생성',
        colorKey: 'sky',
        path: '/toolbox/certificate-review-generator'
    },
    // {
    //     icon: 'bx-calendar-event',
    //     label: '예약 관리',
    //     subtitle: '상담 예약을 확인합니다',
    //     colorKey: 'sky',
    //     path: '/toolbox/reservations'
    // },
    // {
    //     icon: 'bx-user-voice',
    //     label: '수강생 관리',
    //     subtitle: '수강생 정보를 관리합니다',
    //     colorKey: 'violet',
    //     path: '/toolbox/students'
    // },
    // {
    //     icon: 'bx-message-dots',
    //     label: '알림톡 관리',
    //     subtitle: '알림톡 템플릿을 설정합니다',
    //     colorKey: 'pink',
    //     path: '/toolbox/notification-talk'
    // }
];