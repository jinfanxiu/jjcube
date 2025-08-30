const FeedbackPage = () => {
    // 실제 피드백 제출 로직은 여기에 구현할 수 있습니다.
    // 예: const handleSubmit = (e) => { ... }

    return (
        <div className="flex justify-center items-start p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold leading-6 text-slate-900 dark:text-slate-100">
                        피드백 및 문의
                    </h1>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        서비스 개선을 위한 여러분의 소중한 의견을 기다립니다.
                    </p>
                </div>
                <form>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="feedback-type" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                문의 유형
                            </label>
                            <select
                                id="feedback-type"
                                name="feedback-type"
                                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                                <option>기능 제안</option>
                                <option>오류 신고</option>
                                <option>디자인 개선</option>
                                <option>기타 문의</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="feedback-content" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                내용
                            </label>
                            <textarea
                                id="feedback-content"
                                name="feedback-content"
                                rows={6}
                                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="자세한 내용을 입력해주세요."
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:ring-offset-slate-800"
                        >
                            제출하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackPage;