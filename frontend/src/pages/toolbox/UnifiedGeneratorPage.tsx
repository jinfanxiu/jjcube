import { useState } from 'react';
import type { FC } from 'react';
import PostGenerator from '../../components/toolbox/PostGenerator';
import { generatorConfigs } from '../../data/generatorConfig';

const UnifiedGeneratorPage: FC = () => {
    const [selectedGeneratorId, setSelectedGeneratorId] = useState<string>(generatorConfigs[0].id);

    const selectedConfig = generatorConfigs.find(config => config.id === selectedGeneratorId);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
                <div className="flex flex-col md:flex-row-reverse md:space-x-reverse md:space-x-8">

                    <div className="md:w-1/3 mb-8 md:mb-0">
                        <div className="bg-gray-800 p-6 rounded-lg shadow-xl h-full border border-gray-700">
                            <h3 className="text-2xl font-bold mb-6 text-indigo-400">🥳 생성할 콘텐츠 선택</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
                                {generatorConfigs.map((config) => (
                                    <div key={config.id}>
                                        <input
                                            type="radio"
                                            name="generator-option"
                                            id={config.id}
                                            value={config.id}
                                            checked={selectedGeneratorId === config.id}
                                            onChange={(e) => setSelectedGeneratorId(e.target.value)}
                                            className="sr-only peer"
                                        />
                                        <label
                                            htmlFor={config.id}
                                            className="flex flex-col items-start justify-center p-5 h-full border-2 border-gray-600 rounded-lg cursor-pointer
                                 peer-checked:border-indigo-500 peer-checked:bg-indigo-900 peer-checked:bg-opacity-30
                                 hover:border-indigo-400 transition-all duration-200"
                                        >
                                            <span className="text-xl font-bold text-gray-100">{config.label}</span>
                                            <span className="text-sm text-gray-400 mt-2 text-left">{config.description}</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="md:w-2/3">
                        {selectedConfig ? (
                            <PostGenerator
                                key={selectedConfig.id}
                                pageTitle={selectedConfig.pageTitle}
                                topic={selectedConfig.topic}
                                categoryName={selectedConfig.categoryName}
                                enableComments={selectedConfig.enableComments}
                            />
                        ) : (
                            <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center text-gray-400 h-full flex items-center justify-center border border-gray-700">
                                생성할 콘텐츠 종류를 선택해주세요.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedGeneratorPage;