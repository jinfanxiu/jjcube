import type { FC } from 'react';

const ImagePlaceholder: FC = () => {
    return (
        <div className="my-6 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-600 bg-gray-900 p-8 text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="text-gray-500" viewBox="0 0 16 16">
                <path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
                <path d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2zM12 3a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3z"/>
                <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
            </svg>
            <div className="text-lg font-semibold">
                사진 삽입 위치
            </div>
            <p className="text-sm text-gray-500">
                이곳에 이미지가 표시됩니다.
            </p>
        </div>
    );
};

export default ImagePlaceholder;