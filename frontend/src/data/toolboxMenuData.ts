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
        icon: 'bx-spreadsheet',
        label: '구글 시트 연동',
        subtitle: '시트 데이터를 관리합니다',
        colorKey: 'emerald',
        path: '/toolbox/google-sheet'
    },
    {
        icon: 'bx-calendar-event',
        label: '예약 관리',
        subtitle: '상담 예약을 확인합니다',
        colorKey: 'sky',
        path: '/toolbox/reservations'
    },
    {
        icon: 'bx-user-voice',
        label: '수강생 관리',
        subtitle: '수강생 정보를 관리합니다',
        colorKey: 'violet',
        path: '/toolbox/students'
    },
    {
        icon: 'bx-message-dots',
        label: '알림톡 관리',
        subtitle: '알림톡 템플릿을 설정합니다',
        colorKey: 'pink',
        path: '/toolbox/notification-talk'
    }
];