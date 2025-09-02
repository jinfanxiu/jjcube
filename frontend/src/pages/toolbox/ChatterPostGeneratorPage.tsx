import type { FC } from 'react';
import PostGenerator from '../../components/toolbox/PostGenerator';

const ChatterPostGeneratorPage: FC = () => {
    return (
        <PostGenerator
            pageTitle="뷰티 게시글 & 댓글 생성기"
            topic="beauty"
            categoryName="[자유수다방]"
        />
    );
};

export default ChatterPostGeneratorPage;
