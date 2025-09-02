import type { FC } from 'react';
import PostGenerator from '../../components/toolbox/PostGenerator';

const CertificateReviewGeneratorPage: FC = () => {
    return (
        <PostGenerator
            pageTitle="자격증 합격 후기 & 댓글 생성기"
            topic="certificateReview"
            categoryName="[합격후기]"
        />
    );
};

export default CertificateReviewGeneratorPage;