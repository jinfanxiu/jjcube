import type { FC } from 'react';
import type { CustomOption } from '../../../data/generatorConfig';

interface CustomOptionsProps {
    customOptions: CustomOption[];
    customParams: { [key: string]: string };
    handleCustomParamChange: (paramKey: string, value: string) => void;
}

export const CustomOptions: FC<CustomOptionsProps> = ({ customOptions, customParams, handleCustomParamChange }) => {
    return (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
            {customOptions.map((option) => (
                <div key={option.paramKey}>
                    <label className="text-lg font-semibold text-gray-200 mb-3 block">{option.label}</label>
                    <div className="flex flex-wrap gap-3">
                        {option.values.map((value) => (
                            <div key={value}>
                                <input
                                    type="radio"
                                    id={`${option.paramKey}-${value}`}
                                    name={option.paramKey}
                                    value={value}
                                    checked={customParams[option.paramKey] === value}
                                    onChange={() => handleCustomParamChange(option.paramKey, value)}
                                    className="sr-only peer"
                                />
                                <label
                                    htmlFor={`${option.paramKey}-${value}`}
                                    className="block cursor-pointer select-none rounded-lg border border-gray-600 p-2 px-4 text-center text-sm font-medium
                                     peer-checked:bg-indigo-500 peer-checked:border-indigo-500 peer-checked:text-white
                                     hover:bg-gray-700 transition-colors"
                                >
                                    {value}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};