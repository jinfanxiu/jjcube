import type { FC } from 'react';

export const ProgressBar: FC = () => (
    <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
        <div className="w-1/4 h-full bg-indigo-500 rounded-full animate-indeterminate"></div>
    </div>
);

export const PostSkeletonLoader: FC = () => (
    <div className="animate-pulse">
        <div className="h-3 w-1/4 bg-gray-200 rounded mb-4"></div>
        <div className="h-8 w-3/4 bg-gray-300 rounded mb-4"></div>
        <div className="flex items-center space-x-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-gray-200"></div>
            <div className="h-4 w-1/5 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
    </div>
);

export const CommentsSkeletonLoader: FC = () => (
    <div className="mt-6 space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                </div>
                <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-1/4 bg-gray-200 rounded"></div>
                    <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                </div>
            </div>
        ))}
    </div>
);