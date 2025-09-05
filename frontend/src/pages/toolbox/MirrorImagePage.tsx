import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { supabase } from '../../supabaseClient';

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

const MirrorImagePage = () => {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
    const [generatedImageSrc, setGeneratedImageSrc] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [variationLevel, setVariationLevel] = useState<number>(1);
    const [imageCredits, setImageCredits] = useState<number | null>(null);

    useEffect(() => {
        const fetchUserCredits = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('get-user-credits');

                if (error) {
                    throw error;
                }

                if (data.error) {
                    throw new Error(data.error);
                }

                setImageCredits(data.credits);

            } catch (e: any) {
                console.error("크레딧 정보를 가져오는 데 실패했습니다:", e);
                // 사용자에게 크레딧 정보를 보여주지 못하더라도 페이지 기능은 유지되도록 null 대신 오류 메시지를 표시하지는 않습니다.
            }
        };

        fetchUserCredits();
    }, []);


    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (originalImageSrc) {
            URL.revokeObjectURL(originalImageSrc);
        }
        setGeneratedImageSrc(null);
        setError(null);

        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setOriginalFile(file);
            setOriginalImageSrc(URL.createObjectURL(file));
        } else {
            setOriginalFile(null);
            setOriginalImageSrc(null);
            setError('유효한 이미지 파일을 선택해주세요 (예: JPEG, PNG).');
        }
    };

    const processImage = async () => {
        if (!originalFile) {
            setError('먼저 이미지 파일을 선택해주세요.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setGeneratedImageSrc(null);

        try {
            const imageBase64 = await fileToBase64(originalFile);
            const mimeType = originalFile.type;

            const { data, error } = await supabase.functions.invoke('mirror-image', {
                body: { imageBase64, mimeType, variationLevel },
            });

            if (error) {
                throw error;
            }

            if (data.error) {
                throw new Error(data.error);
            }

            const newImageSrc = `data:${data.mimeType};base64,${data.imageBase64}`;
            setGeneratedImageSrc(newImageSrc);
            setImageCredits(data.remainingCredits);

        } catch (e: any) {
            console.error("이미지 생성 중 오류 발생:", e);

            if (e.context && typeof e.context.json === 'function') {
                try {
                    const errorJson = await e.context.json();
                    if (errorJson.error) {
                        setError(errorJson.error);
                    } else {
                        setError("알 수 없는 오류가 발생했습니다.");
                    }
                } catch (jsonError) {
                    setError(e.message || "이미지 처리 중 오류가 발생했습니다.");
                }
            } else {
                setError(e.message || "알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadImage = () => {
        if (!generatedImageSrc) return;
        const link = document.createElement('a');
        link.href = generatedImageSrc;
        link.download = `mirror_image_level${variationLevel}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container mx-auto p-4 sm:p-8 max-w-5xl">
            <header className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    🖼️ 미러 이미지 생성
                </h1>
                <p className="text-md sm:text-lg text-gray-600 dark:text-gray-300">
                    1장의 사진으로 <strong className="text-blue-700">여러 각도에서 찍은 사진을 생성</strong>합니다. 또한 <strong className="text-blue-700">같은 느낌 다른 사진</strong>을 생성합니다.
                </p>
            </header>

            <div className="text-center mb-8">
                <div className="inline-flex items-center text-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-5 rounded-full shadow-md border border-gray-200 dark:border-gray-600">
                    <span role="img" aria-label="ticket" className="mr-2 text-xl">🎟️</span>
                    <span>오늘 남은 크레딧:</span>
                    <span className="ml-2 font-bold text-2xl text-emerald-500 dark:text-emerald-400 w-10 text-left">
                         {imageCredits !== null ? imageCredits : '...'}
                     </span>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">1. 원본 이미지 업로드</h2>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                        <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-300 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800 transition-all duration-200"
                            disabled={isProcessing}
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">2. 변화 정도 선택</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[1, 2, 3].map((level) => (
                            <div key={level}>
                                <input
                                    type="radio"
                                    name="variationLevel"
                                    id={`level${level}`}
                                    value={level}
                                    checked={variationLevel === level}
                                    onChange={() => setVariationLevel(level)}
                                    className="sr-only peer"
                                    disabled={isProcessing}
                                />
                                <label
                                    htmlFor={`level${level}`}
                                    className="flex flex-col p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer peer-checked:border-emerald-500 peer-checked:shadow-md transition-all duration-200"
                                >
                                    <span className="font-bold text-lg text-gray-800 dark:text-white">레벨 {level}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {level === 1 && "사진 각도 변경 + 더 멀리서 촬영"}
                                        {level === 2 && "사진 각도 변경"}
                                        {level === 3 && "같은 느낌 다른 사진"}
                                    </span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={processImage}
                        disabled={!originalFile || isProcessing}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-4 px-10 rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    >
                        {isProcessing ? '✨ 이미지 생성 중...' : '🚀 생성 시작'}
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl text-center">
                        <p className="text-red-600 dark:text-red-400 font-medium">❌ {error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-center mb-4 text-gray-800 dark:text-white">원본 이미지</h3>
                        {originalImageSrc ? <img src={originalImageSrc} alt="Original" className="w-full rounded-lg shadow-md" /> : <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg"><p className="text-gray-500">이미지를 업로드하세요</p></div>}
                    </div>
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-center mb-4 text-gray-800 dark:text-white">생성된 이미지</h3>
                        {isProcessing ? (<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500"></div></div>) : generatedImageSrc ? (
                            <div className="space-y-4">
                                <img src={generatedImageSrc} alt="Generated" className="w-full rounded-lg shadow-md" />
                                <button onClick={downloadImage} className="w-full bg-gradient-to-r from-blue-500 to-teal-500 text-white font-semibold py-3 px-4 rounded-lg">📥 다운로드</button>
                            </div>
                        ) : (<div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg"><p className="text-gray-500">결과가 여기에 표시됩니다</p></div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MirrorImagePage;