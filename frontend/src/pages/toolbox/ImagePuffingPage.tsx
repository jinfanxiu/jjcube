import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';

type ProcessedImage = {
    id: number;
    src: string;
    alt: string;
    originalName: string;
    uniqueHash: string;
    transformSeed: number;
};

// File 객체를 HTMLImageElement로 변환하는 헬퍼 함수
const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url); // 메모리 누수 방지
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
};

// 시드 기반 랜덤 생성기 (일관된 랜덤값 생성)
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    int(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }
}

type AdvancedTransformParams = {
    seed: number;
    crop: { x: number; y: number };
    resize: { w: number; h: number };
    skew: { x: number; y: number };
    scale: number;
    blur: number;
    jitter: number;
    channelShift: { r: number; g: number; b: number };
    watermark: { count: number; opacity: number };
    quality: number;
    color: {
        brightness: number;
        contrast: number;
        saturation: number;
        hue: number;
        gamma: number;
        temperature: number;
        tint: number;
        vibrance: number;
    };
    noise: {
        gaussian: number;
        salt: number;
        pepper: number;
    };
    geometric: {
        rotation: number;
        shear: { x: number; y: number };
        perspective: number;
    };
    frequency: {
        highPass: number;
        lowPass: number;
        bandPass: number;
    };
    metadata: {
        uniqueId: string;
        timestamp: number;
    };
};

// 가우시안 노이즈 생성
const generateGaussianNoise = (mean: number = 0, stdDev: number = 1, rng: SeededRandom): number => {
    const u1 = rng.next();
    const u2 = rng.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
};

// 에지 검출 (Sobel 필터)
const detectImageEdges = (imageData: ImageData): Uint8Array => {
    const { data, width, height } = imageData;
    const edgeMap = new Uint8Array(width * height);

    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    const kernelIdx = (ky + 1) * 3 + (kx + 1);

                    gx += gray * sobelX[kernelIdx];
                    gy += gray * sobelY[kernelIdx];
                }
            }

            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edgeMap[y * width + x] = magnitude > 30 ? 255 : 0;
        }
    }

    return edgeMap;
};

// 중요 영역 식별 (의미 보존)
const identifyImportantRegions = (
    imageData: ImageData,
    edgeMap: Uint8Array,
    rng: SeededRandom
): boolean[] => {
    const { width, height } = imageData;
    const regions = new Array(width * height).fill(false);
    // rng를 사용하여 블록 크기에 변화 추가
    const blockSize = 16 + rng.int(0, 8); // 16~23 픽셀 범위

    for (let y = 0; y < height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
            let edgeCount = 0;
            let totalIntensity = 0;

            // 블록 내 에지와 세부사항 분석
            for (let by = 0; by < blockSize && y + by < height; by++) {
                for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                    const idx = (y + by) * width + (x + bx);
                    if (edgeMap[idx] > 0) edgeCount++;

                    const pixelIdx = idx * 4;
                    const intensity = (imageData.data[pixelIdx] +
                        imageData.data[pixelIdx + 1] +
                        imageData.data[pixelIdx + 2]) / 3;
                    totalIntensity += intensity;
                }
            }

            const avgIntensity = totalIntensity / (blockSize * blockSize);
            const edgeDensity = edgeCount / (blockSize * blockSize);

            // 중요 영역 판단 (에지 밀도, 평균 밝기, 분산 고려)
            // rng를 사용하여 임계값에도 변화 추가
            const randomThreshold = 0.25 + rng.range(-0.1, 0.1); // 0.15~0.35 범위
            const isImportant = edgeDensity > 0.15 ||
                (avgIntensity > 80 && avgIntensity < 180) ||
                rng.next() < randomThreshold; // 동적 확률로 추가 보호

            if (isImportant) {
                for (let by = 0; by < blockSize && y + by < height; by++) {
                    for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                        regions[(y + by) * width + (x + bx)] = true;
                    }
                }
            }
        }
    }

    return regions;
};


// 색상 필터 중심 변형 + 극미세 픽셀 조정 (시각적 변화 최소화)
const applyAdvancedPixelTransforms = (
    imageData: ImageData,
    params: AdvancedTransformParams,
    rng: SeededRandom
): void => {
    const { data } = imageData;
    const { jitter, channelShift, noise } = params;
    const width = imageData.width;
    const height = imageData.height;

    // 적응형 강도 계산 (이미지 크기와 복잡도에 따라 조정) - 더 미세하게
    const imageComplexity = calculateImageComplexity(imageData);
    const adaptiveMultiplier = 0.15 + imageComplexity * 0.1; // 0.15~0.25 범위로 더 축소

    // 극도로 미세한 변형 강도 (육안 식별 거의 불가) - 픽셀 크기 더 축소
    const safeJitter = Math.min(1, Math.max(0.2, Math.abs(jitter) * adaptiveMultiplier * 0.1)); // 더 미세
    const safeNoise = Math.min(0.5, Math.max(0.1, Math.abs(noise.gaussian) * adaptiveMultiplier * 0.15)); // 더 미세

    // 지능형 영역 분할 (의미적 보존)
    const edgeMap = detectImageEdges(imageData);
    const importantRegions = identifyImportantRegions(imageData, edgeMap, rng);

    // 새로운 기능: 이미지 복잡도 계산
    function calculateImageComplexity(imageData: ImageData): number {
        const { data, width, height } = imageData;
        let edgeCount = 0;
        let colorVariance = 0;

        for (let i = 0; i < data.length; i += 4) {
            if (i + width * 4 < data.length) {
                // 에지 강도 계산
                const dx = Math.abs(data[i] - data[i + 4]);
                const dy = Math.abs(data[i] - data[i + width * 4]);
                if (dx + dy > 30) edgeCount++;

                // 색상 분산 계산
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const gray = (r + g + b) / 3;
                colorVariance += Math.pow(r - gray, 2) + Math.pow(g - gray, 2) + Math.pow(b - gray, 2);
            }
        }

        const totalPixels = width * height;
        const edgeDensity = edgeCount / totalPixels;
        const avgColorVariance = colorVariance / (totalPixels * 3);

        return Math.min(1.0, (edgeDensity * 2 + avgColorVariance / 10000) / 2);
    }

    // 1. 극미세 픽셀 조정 (5% 픽셀만 아주 작은 변화, 균등 분포)
    for (let i = 0; i < data.length; i += 4) {
        const origR = data[i];
        const origG = data[i + 1];
        const origB = data[i + 2];
        const origA = data[i + 3];

        // 더 넓은 범위의 픽셀 처리
        if (origR > 3 && origR < 252 && origG > 3 && origG < 252 && origB > 3 && origB < 252) {
            // 8%의 픽셀에 더 미세한 변형 (밀도 증가하되 크기 축소)
            if (rng.next() < 0.08) {
                // 극미세 지터링 (±0.2 수준으로 더 축소)
                const baseJitter = rng.range(-safeJitter, safeJitter) * 0.15; // 더 미세

                // 매우 약한 가우시안 노이즈 (더 축소)
                const gaussianR = generateGaussianNoise(0, safeNoise * 0.2, rng); // 더 미세
                const gaussianG = generateGaussianNoise(0, safeNoise * 0.2, rng);
                const gaussianB = generateGaussianNoise(0, safeNoise * 0.2, rng);

                // 매우 미세한 채널별 변형 (더 축소)
                const safeChannelR = Math.max(0.99, Math.min(1.01, channelShift.r * 0.15)); // 더 미세
                const safeChannelG = Math.max(0.99, Math.min(1.01, channelShift.g * 0.15));
                const safeChannelB = Math.max(0.99, Math.min(1.01, channelShift.b * 0.15));

                // Salt & Pepper 노이즈를 더 약하게
                let saltPepperR = 0, saltPepperG = 0, saltPepperB = 0;
                if (rng.next() < noise.salt * 0.05) { // 20배 줄임
                    saltPepperR = saltPepperG = saltPepperB = rng.next() > 0.5 ? 0.5 : -0.5; // ±0.5로 더 축소
                }

                // 최종 변형 적용 (더 극미세)
                const newR = Math.max(0, Math.min(255, (origR + baseJitter + gaussianR + saltPepperR) * safeChannelR));
                const newG = Math.max(0, Math.min(255, (origG + baseJitter + gaussianG + saltPepperG) * safeChannelG));
                const newB = Math.max(0, Math.min(255, (origB + baseJitter + gaussianB + saltPepperB) * safeChannelB));

                // 더 작은 변형만 허용 (거의 보이지 않음)
                if (Math.abs(newR - origR) < 1.5 && Math.abs(newG - origG) < 1.5 && Math.abs(newB - origB) < 1.5) {
                    data[i] = newR;
                    data[i + 1] = newG;
                    data[i + 2] = newB;
                }
            }
        }

        data[i + 3] = origA;
    }

    // 2. 극미세 블록 기반 색상 채널 미세 조정 (균등 분포) - 블록 크기 2분의 1로 축소
    const blockSize = 2 + rng.int(0, 3); // 2~5 픽셀 블록으로 축소 (기존 4~10의 2분의 1)
    for (let y = 0; y < height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
            // 균등 분포로 1.5% 확률 (밀도 약간 증가)
            const blockIndex = (Math.floor(y / blockSize) * Math.floor(width / blockSize) + Math.floor(x / blockSize));
            if (blockIndex % 67 === rng.int(0, 66)) { // 1.5% 균등 분포
                for (let by = 0; by < blockSize && y + by < height; by++) {
                    for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                        const idx = ((y + by) * width + (x + bx)) * 4;
                        if (idx < data.length - 3) {
                            // 더 미세한 채널 조정
                            const channelShift = rng.int(1, 3);
                            if (channelShift === 1) {
                                data[idx] = Math.max(0, Math.min(255, data[idx + 1] * 0.9995 + data[idx] * 0.0005)); // 더 미세
                            } else if (channelShift === 2) {
                                data[idx + 1] = Math.max(0, Math.min(255, data[idx + 2] * 0.9995 + data[idx + 1] * 0.0005)); // 더 미세
                            }
                        }
                    }
                }
            }
        }
    }

// 3. 극미세 주파수 도메인 조정 (거의 보이지 않는 수준)
    if (rng.next() < 0.3) { // 30% 확률로 감소
        // 매우 미세한 커널로 최소 변화
        const kernels = [
            [-0.01, -0.01, -0.01, -0.01, 1.04, -0.01, -0.01, -0.01, -0.01], // 극미세 고주파
            [0, -0.02, 0, -0.02, 1.04, -0.02, 0, -0.02, 0],                  // 극미세 십자형
            [-0.005, -0.01, -0.005, -0.01, 1.03, -0.01, -0.005, -0.01, -0.005], // 극미세 부드러운 강조
        ];
        const selectedKernel = kernels[rng.int(0, kernels.length - 1)];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                // 균등 분포로 1% 확률
                const pixelIndex = y * width + x;
                if (pixelIndex % 100 === rng.int(0, 99)) {
                    const centerIdx = (y * width + x) * 4;
                    for (let channel = 0; channel < 3; channel++) {
                        let sum = 0;
                        let kernelIdx = 0;
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const pixelIdx = ((y + ky) * width + (x + kx)) * 4 + channel;
                                sum += data[pixelIdx] * selectedKernel[kernelIdx++];
                            }
                        }
                        const newValue = data[centerIdx + channel] + sum * rng.range(0.005, 0.015);
                        data[centerIdx + channel] = Math.max(0, Math.min(255, newValue));
                    }
                }
            }
        }
    }

    // 4. AI 해시 방해를 위한 에지 패턴 변형
    if (rng.next() < 0.4) { // 40% 확률
        for (let y = 2; y < height - 2; y++) {
            for (let x = 2; x < width - 2; x++) {
                if (rng.next() < 0.03) { // 3% 픽셀에 적용
                    const centerIdx = (y * width + x) * 4;

                    // 주변 픽셀의 평균과 차이 계산
                    const neighbors = [
                        ((y-1) * width + x) * 4,
                        ((y+1) * width + x) * 4,
                        (y * width + (x-1)) * 4,
                        (y * width + (x+1)) * 4,
                    ];

                    for (let channel = 0; channel < 3; channel++) {
                        let avgNeighbor = 0;
                        neighbors.forEach(idx => avgNeighbor += data[idx + channel]);
                        avgNeighbor /= neighbors.length;

                        const diff = data[centerIdx + channel] - avgNeighbor;
                        if (Math.abs(diff) > 10) { // 에지 영역에서만
                            const enhancement = diff > 0 ? rng.range(1, 3) : rng.range(-3, -1);
                            data[centerIdx + channel] = Math.max(0, Math.min(255,
                                data[centerIdx + channel] + enhancement));
                        }
                    }
                }
            }
        }
    }

    // 5. 텍스처 패턴 교란 (AI 텍스처 인식 방해) - 패턴 크기 2분의 1로 축소
    if (rng.next() < 0.35) { // 35% 확률
        const patternSize = 1 + rng.int(0, 2); // 1-3 픽셀 패턴 (기존 3-6의 2분의 1)
        for (let y = 0; y < height - patternSize; y += patternSize * 2) {
            for (let x = 0; x < width - patternSize; x += patternSize * 2) {
                if (rng.next() < 0.08) { // 8% 확률로 패턴 적용
                    const pattern = rng.int(1, 4);

                    for (let py = 0; py < patternSize; py++) {
                        for (let px = 0; px < patternSize; px++) {
                            const idx = ((y + py) * width + (x + px)) * 4;
                            if (idx < data.length - 3) {
                                const modifier = pattern === 1 ? (px + py) % 2 :
                                    pattern === 2 ? (px * py) % 3 :
                                        pattern === 3 ? Math.abs(px - py) % 2 : 1;

                                const adjustment = modifier * rng.range(-2, 2);

                                // 중요 영역은 보존, 일반 영역은 강화 변형
                                const regionIdx = (y + py) * width + (x + px);
                                const protectionLevel = importantRegions[regionIdx] ? 0.5 : 1.0;

                                for (let c = 0; c < 3; c++) {
                                    data[idx + c] = Math.max(0, Math.min(255,
                                        data[idx + c] + adjustment * protectionLevel));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 6. 새로운 기능: 배치 정규화 교란 (BatchNorm 레이어 대응) - 배치 크기 2분의 1로 축소
    if (rng.next() < 0.4) { // 40% 확률
        const batchSize = 8; // 배치 크기를 2분의 1로 축소 (32→16)
        for (let batchY = 0; batchY < height; batchY += batchSize) {
            for (let batchX = 0; batchX < width; batchX += batchSize) {
                const endY = Math.min(batchY + batchSize, height);
                const endX = Math.min(batchX + batchSize, width);

                // 배치별 통계 계산 및 교란
                const batchStats = { r: { sum: 0, sumSq: 0 }, g: { sum: 0, sumSq: 0 }, b: { sum: 0, sumSq: 0 } };
                const batchPixels = (endY - batchY) * (endX - batchX);

                for (let y = batchY; y < endY; y++) {
                    for (let x = batchX; x < endX; x++) {
                        const idx = (y * width + x) * 4;
                        batchStats.r.sum += data[idx];
                        batchStats.r.sumSq += data[idx] * data[idx];
                        batchStats.g.sum += data[idx + 1];
                        batchStats.g.sumSq += data[idx + 1] * data[idx + 1];
                        batchStats.b.sum += data[idx + 2];
                        batchStats.b.sumSq += data[idx + 2] * data[idx + 2];
                    }
                }

                // 평균과 분산 교란
                const channels = ['r', 'g', 'b'] as const;
                channels.forEach((ch, chIdx) => {
                    const mean = batchStats[ch].sum / batchPixels;
                    const variance = batchStats[ch].sumSq / batchPixels - mean * mean;
                    const std = Math.sqrt(variance + 1e-8);

                    // BatchNorm 파라미터 교란
                    const gammaShift = 1 + rng.range(-0.05, 0.05);
                    const betaShift = rng.range(-2, 2);

                    // 배치 내 픽셀들에 교란 적용
                    for (let y = batchY; y < endY; y++) {
                        for (let x = batchX; x < endX; x++) {
                            const idx = (y * width + x) * 4 + chIdx;
                            const regionIdx = y * width + x;

                            if (!importantRegions[regionIdx] && rng.next() < 0.2) { // 20% 확률, 중요 영역 제외
                                const normalized = (data[idx] - mean) / std;
                                const disturbed = normalized * gammaShift + betaShift;
                                const newValue = disturbed * std + mean;

                                data[idx] = Math.max(0, Math.min(255, newValue));
                            }
                        }
                    }
                });
            }
        }
    }

    // 7. 새로운 기능: 드롭아웃 시뮬레이션 (특정 영역 무작위 교란)
    if (rng.next() < 0.3) { // 30% 확률
        const dropoutRate = 0.1 + rng.range(0, 0.15); // 10-25% 드롭아웃

        for (let i = 0; i < data.length; i += 4) {
            const pixelIdx = Math.floor(i / 4);
            const y = Math.floor(pixelIdx / width);
            const x = pixelIdx % width;

            // 중요 영역이 아닌 곳에서만 드롭아웃 적용
            if (!importantRegions[pixelIdx] && rng.next() < dropoutRate) {
                // 주변 픽셀의 평균으로 대체 (인페인팅 효과)
                const neighbors = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width && (dx !== 0 || dy !== 0)) {
                            const nIdx = (ny * width + nx) * 4;
                            neighbors.push({
                                r: data[nIdx],
                                g: data[nIdx + 1],
                                b: data[nIdx + 2]
                            });
                        }
                    }
                }

                if (neighbors.length > 0) {
                    const avgR = neighbors.reduce((sum, n) => sum + n.r, 0) / neighbors.length;
                    const avgG = neighbors.reduce((sum, n) => sum + n.g, 0) / neighbors.length;
                    const avgB = neighbors.reduce((sum, n) => sum + n.b, 0) / neighbors.length;

                    // 미세한 노이즈와 함께 평균값 적용
                    const microNoise = rng.range(-3, 3);
                    data[i] = Math.max(0, Math.min(255, avgR + microNoise));
                    data[i + 1] = Math.max(0, Math.min(255, avgG + microNoise));
                    data[i + 2] = Math.max(0, Math.min(255, avgB + microNoise));
                }
            }
        }
    }
};


// 최신 AI 모델 대응 - CLIP, Diffusion 모델 우회 추가
const applyModernAIEvasion = (
    imageData: ImageData,
    params: AdvancedTransformParams,
    rng: SeededRandom
): void => {
    const { data } = imageData;
    const width = imageData.width;
    const height = imageData.height;

    // params에서 노이즈 강도 가져오기
    const noiseStrength = params.noise.gaussian || 1.0;
    const baseIntensity = Math.min(0.1, noiseStrength * 0.02);

    // 1. CLIP 모델 우회 - 의미적 특징 미세 교란
    if (rng.next() < 0.6) { // 60% 확률
        // 객체 경계 근처에서만 변형 (의미 보존하면서 특징 교란)
        const semanticRegions = identifySemanticRegions(imageData, rng);

        for (let i = 0; i < semanticRegions.length; i++) {
            const region = semanticRegions[i];
            if (rng.next() < 0.3) { // 30% 영역에 적용
                applySemanticDisturbance(imageData, region, rng, baseIntensity);
            }
        }
    }

    // 2. Diffusion 모델 검출 우회 - 노이즈 패턴 혼합
    if (rng.next() < 0.5) { // 50% 확률
        // 생성 모델이 학습한 노이즈 패턴과 다른 패턴 주입
        const antiDiffusionNoise = generateAntiDiffusionNoise(width, height, rng);
        blendAntiDiffusionNoise(imageData, antiDiffusionNoise, baseIntensity); // params 기반 강도
    }

    // 3. 다중 스케일 특징 교란 강화 (data 배열 직접 사용)
    applyMultiScaleFeatureDisturbance(imageData, rng, data);

    function identifySemanticRegions(imageData: ImageData, rng: SeededRandom) {
        // 간단한 의미적 영역 분할 (색상 클러스터링 기반)
        const regions = [];
        const blockSize = 16 + rng.int(0, 8); // rng 사용하여 블록 크기 변화

        for (let y = 0; y < imageData.height - blockSize; y += blockSize) {
            for (let x = 0; x < imageData.width - blockSize; x += blockSize) {
                // rng를 사용하여 일부 영역만 선택적으로 처리
                if (rng.next() < 0.8) { // 80% 확률로 영역 포함
                    const avgColor = calculateBlockAverage(imageData, x, y, blockSize);
                    regions.push({ x, y, size: blockSize, color: avgColor });
                }
            }
        }

        return regions;
    }

    function calculateBlockAverage(imageData: ImageData, startX: number, startY: number, size: number) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let y = startY; y < startY + size && y < imageData.height; y++) {
            for (let x = startX; x < startX + size && x < imageData.width; x++) {
                const idx = (y * imageData.width + x) * 4;
                r += imageData.data[idx];
                g += imageData.data[idx + 1];
                b += imageData.data[idx + 2];
                count++;
            }
        }

        return { r: r/count, g: g/count, b: b/count };
    }

    function applySemanticDisturbance(imageData: ImageData, region: any, rng: SeededRandom, intensity: number) {
        // 의미를 해치지 않는 수준에서 미세 교란
        for (let y = region.y; y < region.y + region.size && y < imageData.height; y++) {
            for (let x = region.x; x < region.x + region.size && x < imageData.width; x++) {
                if (rng.next() < 0.15) { // 15% 픽셀에 적용
                    const idx = (y * imageData.width + x) * 4;

                    // 색상 영역별 적응형 노이즈 (intensity 매개변수 사용)
                    const colorIntensity = (imageData.data[idx] + imageData.data[idx+1] + imageData.data[idx+2]) / 3;
                    const baseNoise = colorIntensity > 128 ? rng.range(-2, 2) : rng.range(-3, 3);
                    const noiseAmount = baseNoise * (0.5 + intensity * 10); // intensity 반영

                    for (let c = 0; c < 3; c++) {
                        imageData.data[idx + c] = Math.max(0, Math.min(255,
                            imageData.data[idx + c] + noiseAmount
                        ));
                    }
                }
            }
        }
    }

    function generateAntiDiffusionNoise(width: number, height: number, rng: SeededRandom) {
        // Diffusion 모델의 일반적 노이즈 패턴과 반대 특성
        const noise = new Float32Array(width * height * 3);

        for (let i = 0; i < noise.length; i += 3) {
            // 가우시안 분포 대신 균등 분포 + 스파이크 패턴
            const baseNoise = rng.range(-1, 1);
            const spikePattern = rng.next() < 0.05 ? rng.range(-5, 5) : 0;

            noise[i] = baseNoise + spikePattern;     // R
            noise[i+1] = baseNoise * 0.8 + spikePattern * 0.7; // G
            noise[i+2] = baseNoise * 1.2 + spikePattern * 1.1; // B
        }

        return noise;
    }

    function blendAntiDiffusionNoise(imageData: ImageData, noise: Float32Array, strength: number) {
        for (let i = 0, noiseIdx = 0; i < imageData.data.length; i += 4, noiseIdx += 3) {
            if (noiseIdx + 2 < noise.length) {
                imageData.data[i] = Math.max(0, Math.min(255,
                    imageData.data[i] + noise[noiseIdx] * strength));
                imageData.data[i+1] = Math.max(0, Math.min(255,
                    imageData.data[i+1] + noise[noiseIdx+1] * strength));
                imageData.data[i+2] = Math.max(0, Math.min(255,
                    imageData.data[i+2] + noise[noiseIdx+2] * strength));
            }
        }
    }

    function applyMultiScaleFeatureDisturbance(imageData: ImageData, rng: SeededRandom, data: Uint8ClampedArray) {
        // 다중 스케일에서 특징점 교란
        const scales = [2, 4, 8, 16, 32];

        scales.forEach(scale => {
            if (rng.next() < 0.3) { // 각 스케일마다 30% 확률
                for (let y = 0; y < imageData.height - scale; y += scale * 2) {
                    for (let x = 0; x < imageData.width - scale; x += scale * 2) {
                        if (rng.next() < 0.08) { // 8% 확률
                            // 스케일별 특징 혼합 (data 배열 직접 사용)
                            const avgR = calculateScaleAverageFromData(data, imageData.width, x, y, scale, 0);
                            const avgG = calculateScaleAverageFromData(data, imageData.width, x, y, scale, 1);
                            const avgB = calculateScaleAverageFromData(data, imageData.width, x, y, scale, 2);

                            // 평균 기반 미세 조정
                            for (let dy = 0; dy < scale; dy++) {
                                for (let dx = 0; dx < scale; dx++) {
                                    const idx = ((y + dy) * imageData.width + (x + dx)) * 4;
                                    if (idx + 2 < data.length) {
                                        const adjustment = rng.range(-1, 1);
                                        data[idx] = Math.max(0, Math.min(255,
                                            data[idx] * 0.98 + avgR * 0.02 + adjustment));
                                        data[idx+1] = Math.max(0, Math.min(255,
                                            data[idx+1] * 0.98 + avgG * 0.02 + adjustment));
                                        data[idx+2] = Math.max(0, Math.min(255,
                                            data[idx+2] * 0.98 + avgB * 0.02 + adjustment));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    function calculateScaleAverageFromData(data: Uint8ClampedArray, width: number, startX: number, startY: number, scale: number, channel: number): number {
        let sum = 0;
        let count = 0;

        for (let y = startY; y < startY + scale; y++) {
            for (let x = startX; x < startX + scale; x++) {
                const idx = (y * width + x) * 4 + channel;
                if (idx < data.length) {
                    sum += data[idx];
                    count++;
                }
            }
        }

        return count > 0 ? sum / count : 0;
    }

};

// 기존 트랜스포머 기반 AI 검출 우회를 위한 어텐션 맵 교란
const applyTransformerEvasion = (
    imageData: ImageData,
    params: AdvancedTransformParams,
    rng: SeededRandom
): void => {
    const { data } = imageData;
    const width = imageData.width;
    const height = imageData.height;

    // 1. 패치 기반 특징 교란 (Vision Transformer 대응)
    const patchSize = 8; // ViT의 일반적인 패치 크기
    for (let py = 0; py < height - patchSize; py += patchSize) {
        for (let px = 0; px < width - patchSize; px += patchSize) {
            if (rng.next() < 0.25) { // 25% 패치에 적용
                // 패치 내부의 어텐션 가중치 시뮬레이션 및 교란
                const patchCenter = {
                    x: px + patchSize / 2,
                    y: py + patchSize / 2
                };

                for (let y = py; y < py + patchSize && y < height; y++) {
                    for (let x = px; x < px + patchSize && x < width; x++) {
                        const idx = (y * width + x) * 4;

                        // 중심으로부터의 거리 기반 가중치 (어텐션 시뮬레이션)
                        const distance = Math.sqrt(
                            Math.pow(x - patchCenter.x, 2) + Math.pow(y - patchCenter.y, 2)
                        );
                        const attention = Math.exp(-distance / (patchSize / 4));

                        // 어텐션 기반 역변형 (AI가 주목하는 부분을 미세 교란)
                        const disturbance = attention * rng.range(-3, 3);

                        for (let c = 0; c < 3; c++) {
                            data[idx + c] = Math.max(0, Math.min(255,
                                data[idx + c] + disturbance * (1 - attention * 0.5)
                            ));
                        }
                    }
                }
            }
        }
    }

    // 2. 멀티헤드 어텐션 교란 (서로 다른 특징 패턴 생성)
    const numHeads = 8; // 일반적인 어텐션 헤드 수
    for (let head = 0; head < numHeads; head++) {
        if (rng.next() < 0.15) { // 각 헤드마다 15% 확률
            const headSeed = rng.int(1, 1000000);
            const headRng = new SeededRandom(params.seed + headSeed);

            // 헤드별 고유한 패턴 생성
            const patternType = headRng.int(1, 4);
            const intensity = headRng.range(0.5, 2.0);

            for (let y = head; y < height; y += numHeads) {
                for (let x = 0; x < width; x += 4) {
                    if (headRng.next() < 0.08) {
                        const idx = (y * width + x) * 4;

                        switch(patternType) {
                            case 1: // 선형 변형
                                for (let c = 0; c < 3; c++) {
                                    data[idx + c] = Math.max(0, Math.min(255,
                                        data[idx + c] + (x / width - 0.5) * intensity
                                    ));
                                }
                                break;
                            case 2: // 방사형 변형
                                const radialDist = Math.sqrt(
                                    Math.pow(x - width/2, 2) + Math.pow(y - height/2, 2)
                                ) / Math.max(width, height);
                                for (let c = 0; c < 3; c++) {
                                    data[idx + c] = Math.max(0, Math.min(255,
                                        data[idx + c] + radialDist * intensity
                                    ));
                                }
                                break;
                            case 3: // 체크보드 패턴
                                const checkboard = ((x / 8) + (y / 8)) % 2;
                                for (let c = 0; c < 3; c++) {
                                    data[idx + c] = Math.max(0, Math.min(255,
                                        data[idx + c] + (checkboard - 0.5) * intensity
                                    ));
                                }
                                break;
                        }
                    }
                }
            }
        }
    }

    // 3. 위치 인코딩 교란 (Transformer의 위치 정보 혼란)
    for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
            if (rng.next() < 0.05) { // 5% 확률
                const idx = (y * width + x) * 4;

                // 사인/코사인 위치 인코딩과 유사한 패턴으로 교란
                const posX = x / width * 2 * Math.PI;
                const posY = y / height * 2 * Math.PI;

                const sinDisturbance = Math.sin(posX * 4 + posY * 2) * rng.range(1, 3);
                const cosDisturbance = Math.cos(posX * 2 + posY * 4) * rng.range(1, 3);

                for (let c = 0; c < 3; c++) {
                    const disturbance = c === 0 ? sinDisturbance :
                        c === 1 ? cosDisturbance :
                            (sinDisturbance + cosDisturbance) / 2;

                    data[idx + c] = Math.max(0, Math.min(255,
                        data[idx + c] + disturbance
                    ));
                }
            }
        }
    }

    // 4. 계층적 특징 교란 (서로 다른 스케일의 특징 혼합)
    const scales = [4, 8, 16, 32]; // 다중 스케일
    scales.forEach(scale => {
        if (rng.next() < 0.2) { // 각 스케일마다 20% 확률
            for (let y = 0; y < height - scale; y += scale * 2) {
                for (let x = 0; x < width - scale; x += scale * 2) {
                    if (rng.next() < 0.1) {
                        // 스케일별 특징 블렌딩
                        const sourceX = rng.int(0, width - scale);
                        const sourceY = rng.int(0, height - scale);

                        for (let dy = 0; dy < scale; dy++) {
                            for (let dx = 0; dx < scale; dx++) {
                                const targetIdx = ((y + dy) * width + (x + dx)) * 4;
                                const sourceIdx = ((sourceY + dy) * width + (sourceX + dx)) * 4;

                                const blendRatio = rng.range(0.02, 0.08); // 매우 미세한 블렌딩

                                for (let c = 0; c < 3; c++) {
                                    data[targetIdx + c] = Math.max(0, Math.min(255,
                                        data[targetIdx + c] * (1 - blendRatio) +
                                        data[sourceIdx + c] * blendRatio
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        }
    });
};

// 고급 색상 보정 함수 - 자연스러운 변형의 핵심
const applyAdvancedColorCorrection = (
    imageData: ImageData,
    colorParams: {
        gamma: number;
        vibrance: number;
        temperature: number;
        tint: number;
        exposure: number;
        highlights: number;
        shadows: number;
        whites: number;
        blacks: number;
    },
    rng: SeededRandom
): void => {
    const { data } = imageData;
    const { gamma, vibrance, temperature, tint, exposure, highlights, shadows, whites, blacks } = colorParams;

    // rng를 사용하여 색상 보정에 더 미세한 변화 추가
    const baseVariation = 0.01; // 1% 기본 변화량으로 축소

    // 색온도와 틴트를 RGB 조정값으로 변환 (rng로 더 미세 조정)
    const tempAdjustment = (temperature - 6500) / 3000 + rng.range(-0.05, 0.05) * baseVariation; // 더 미세
    const tintAdjustment = tint / 100 + rng.range(-0.025, 0.025) * baseVariation; // 더 미세

    // 색온도 RGB 매트릭스 (rng로 더 자연스러운 변화 추가)
    const tempR = 1 + tempAdjustment * 0.15 + rng.range(-0.005, 0.005); // 더 미세
    const tempG = 1 - Math.abs(tempAdjustment) * 0.05 + rng.range(-0.0025, 0.0025); // 더 미세
    const tempB = 1 - tempAdjustment * 0.2 + rng.range(-0.005, 0.005); // 더 미세

    // 틴트 조정 (rng로 더 미세 변화)
    const tintMagenta = 1 + tintAdjustment * 0.1 + rng.range(-0.0025, 0.0025); // 더 미세
    const tintGreen = 1 - tintAdjustment * 0.1 + rng.range(-0.0025, 0.0025); // 더 미세

    // rng를 사용하여 전역 색상 조정 변수들에 극미세한 변화 추가 (밝기 변화 최소화)
    const dynamicGamma = gamma + rng.range(-0.01, 0.01); // 감마 변화 더 축소 (밝기에 큰 영향)
    const dynamicExposure = exposure + rng.range(-0.005, 0.005); // 노출 변화 극도로 축소 (전체 밝기에 직접적 영향)
    const dynamicVibrance = vibrance + rng.range(-1, 1); // 더 미세

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255.0;
        let g = data[i + 1] / 255.0;
        let b = data[i + 2] / 255.0;

        // rng를 사용하여 픽셀별로 극미세한 변화 추가 (2% 픽셀에만 적용)
        const shouldApplyPixelVariation = rng.next() < 0.02;
        const pixelVariationFactor = shouldApplyPixelVariation ? 1 + rng.range(-0.005, 0.005) : 1;

        // 감마 보정 (rng로 미세 조정)
        const currentGamma = shouldApplyPixelVariation ? dynamicGamma * pixelVariationFactor : dynamicGamma;
        r = Math.pow(r, 1 / currentGamma);
        g = Math.pow(g, 1 / currentGamma);
        b = Math.pow(b, 1 / currentGamma);

        // 노출 조정 (rng로 미세 조정)
        const currentExposure = shouldApplyPixelVariation ? dynamicExposure * pixelVariationFactor : dynamicExposure;
        r = r * currentExposure;
        g = g * currentExposure;
        b = b * currentExposure;

        // 색온도 적용 (미세 변화 포함)
        r = r * tempR;
        g = g * tempG;
        b = b * tempB;

        // 틴트 적용 (미세 변화 포함)
        r = r * tintMagenta;
        g = g * tintGreen;

        // 하이라이트/섀도우 조정 (rng로 매우 미세한 임계값 변화)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const highlightThreshold = 0.7 + rng.range(-0.01, 0.01); // 더 미세
        const shadowThreshold = 0.3 + rng.range(-0.01, 0.01); // 더 미세

        if (luminance > highlightThreshold) { // 하이라이트 영역
            const factor = highlights + (shouldApplyPixelVariation ? rng.range(-0.005, 0.005) : 0); // 더 미세
            r = r * factor;
            g = g * factor;
            b = b * factor;
        } else if (luminance < shadowThreshold) { // 섀도우 영역
            const factor = shadows + (shouldApplyPixelVariation ? rng.range(-0.005, 0.005) : 0); // 더 미세
            r = r * factor;
            g = g * factor;
            b = b * factor;
        }

        // 화이트/블랙 포인트 조정 (rng로 매우 미세한 임계값 조정)
        const whiteThreshold = 0.9 + rng.range(-0.005, 0.005); // 더 미세
        const blackThreshold = 0.1 + rng.range(-0.005, 0.005); // 더 미세

        if (luminance > whiteThreshold) {
            const factor = whites + (shouldApplyPixelVariation ? rng.range(-0.003, 0.003) : 0); // 더 미세
            r = r * factor;
            g = g * factor;
            b = b * factor;
        } else if (luminance < blackThreshold) {
            const factor = blacks + (shouldApplyPixelVariation ? rng.range(-0.003, 0.003) : 0); // 더 미세
            r = r * factor;
            g = g * factor;
            b = b * factor;
        }

        // 바이브런스 조정 (채도와 달리 이미 채도가 높은 부분은 덜 증가)
        const currentVibrance = shouldApplyPixelVariation ? dynamicVibrance * pixelVariationFactor : dynamicVibrance;
        if (currentVibrance !== 100) {
            const maxChannel = Math.max(r, g, b);
            const minChannel = Math.min(r, g, b);
            const currentSaturation = maxChannel - minChannel;

            const vibranceMultiplier = (currentVibrance - 100) / 100.0;
            const saturationProtection = 1 - Math.pow(currentSaturation, 0.5);
            // rng를 사용하여 바이브런스 강도에 극미세 변화 추가
            const vibranceIntensity = 0.5 + (shouldApplyPixelVariation ? rng.range(-0.02, 0.02) : 0); // 더 미세
            const finalVibrance = 1 + (vibranceMultiplier * saturationProtection * vibranceIntensity);

            r = minChannel + (r - minChannel) * finalVibrance;
            g = minChannel + (g - minChannel) * finalVibrance;
            b = minChannel + (b - minChannel) * finalVibrance;
        }

        // rng를 사용한 최종 색상 극미세 조정 (0.5% 픽셀에만 적용)
        if (rng.next() < 0.005) {
            const finalAdjustment = rng.range(-0.003, 0.003); // 더 미세
            r = Math.max(0, Math.min(1, r + finalAdjustment));
            g = Math.max(0, Math.min(1, g + finalAdjustment));
            b = Math.max(0, Math.min(1, b + finalAdjustment));
        }

        // 범위 제한 및 적용
        data[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
    }
};

// 고유 메타데이터 생성
const generateUniqueMetadata = (seed: number): { uniqueId: string; timestamp: number } => {
    const rng = new SeededRandom(seed);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uniqueId = '';
    for (let i = 0; i < 16; i++) {
        uniqueId += chars[rng.int(0, chars.length - 1)];
    }

    return {
        uniqueId,
        timestamp: Date.now() + rng.int(-1000000, 1000000)
    };
};

// 회전 후 자동 확대 및 강화된 AI 우회 변형 함수
const applyAllAdvancedTransforms = (
    img: HTMLImageElement,
    ctx: CanvasRenderingContext2D,
    params: AdvancedTransformParams
): string => {
    const { crop, resize, watermark, quality, color, geometric } = params;
    const canvas = ctx.canvas;
    const rng = new SeededRandom(params.seed);

    // 캔버스 최적화 설정
    if ('willReadFrequently' in canvas) {
        (canvas as any).willReadFrequently = true;
    }

    // 개선된 안전 검증 함수
    const validateCanvas = (): boolean => {
        try {
            const testArea = Math.min(5, canvas.width, canvas.height);
            if (testArea <= 0) return false;

            const testData = ctx.getImageData(0, 0, testArea, testArea);
            const hasValidPixels = testData.data.some((pixel, index) =>
                index % 4 !== 3 && pixel > 10
            );
            return hasValidPixels;
        } catch {
            return false;
        }
    };

    let backupImageData: string | null = null;

    try {
        // 1. 고해상도 캔버스 초기화 (원본 크기 유지 또는 향상)
        const highResWidth = Math.max(resize.w, img.width * 0.9); // 원본의 90% 이상 유지
        const highResHeight = Math.max(resize.h, img.height * 0.9);

        canvas.width = highResWidth;
        canvas.height = highResHeight;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 고품질 렌더링 설정
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 2. 미세한 회전 각도 계산 (원본과 유사하게 유지)
        const rotationAngle = geometric.rotation * 180 / Math.PI;
        const finalRotation = Math.max(-1.5, Math.min(1.5, rotationAngle + rng.range(-0.5, 0.5)));

        // 3. 기본 이미지 먼저 그리기 (크롭 적용, 고해상도 유지)
        const cropX = Math.min(crop.x, img.width * 0.08); // 크롭 줄임
        const cropY = Math.min(crop.y, img.height * 0.08);
        const srcW = Math.max(img.width * 0.84, img.width - cropX * 2);
        const srcH = Math.max(img.height * 0.84, img.height - cropY * 2);

        ctx.drawImage(img, cropX, cropY, srcW, srcH, 0, 0, canvas.width, canvas.height);

        // 4. 회전 시 반드시 확대 적용 (여백 완전 제거)
        if (Math.abs(finalRotation) > 0.05) { // 0.05도 이상이면 회전 처리
            // 회전 각도에 따른 확대 비율 계산 (더 강화된 공식)
            const radians = Math.abs(finalRotation) * Math.PI / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            // 정사각형이 아닌 경우를 고려한 정확한 확대 비율
            const aspectRatio = canvas.width / canvas.height;
            let scaleNeeded: number;

            if (aspectRatio >= 1) { // 가로가 더 긴 경우
                scaleNeeded = (cos + sin / aspectRatio) / cos;
            } else { // 세로가 더 긴 경우
                scaleNeeded = (cos + sin * aspectRatio) / cos;
            }

            // 회전 각도가 클수록 더 많이 확대 (비례 증가)
            const rotationFactor = 1 + Math.abs(finalRotation) * 0.02; // 회전 각도에 비례
            const finalScale = Math.max(1.1, scaleNeeded * rotationFactor * 1.15); // 최소 10% 확대, 15% 추가 여유

            console.log(`회전: ${finalRotation.toFixed(2)}도, 확대비율: ${finalScale.toFixed(3)}`);

            // 캔버스 중앙점
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // 현재 캔버스 내용을 임시 저장
            const originalCanvas = document.createElement('canvas');
            const originalCtx = originalCanvas.getContext('2d', {
                willReadFrequently: true
            }) as CanvasRenderingContext2D;

            if (originalCtx) {
                originalCanvas.width = canvas.width;
                originalCanvas.height = canvas.height;

                // 고품질 설정
                originalCtx.imageSmoothingEnabled = true;
                originalCtx.imageSmoothingQuality = 'high';
                originalCtx.drawImage(canvas, 0, 0);

                // 원본 캔버스 완전 초기화
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 고품질 설정
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // 회전 + 강제 확대 적용
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(finalRotation * Math.PI / 180);
                ctx.scale(finalScale, finalScale);

                // 확대된 이미지 그리기
                ctx.drawImage(originalCanvas,
                    -canvas.width / 2, -canvas.height / 2,
                    canvas.width, canvas.height
                );

                ctx.restore();

                console.log('회전 및 확대 처리 완료');
            }
        }

        // 5. 미세한 추가 기하학적 변형 (매우 보수적)
        const skewX = Math.max(-0.01, Math.min(0.01, params.skew.x * 0.3)); // 기존보다 약하게
        const skewY = Math.max(-0.01, Math.min(0.01, params.skew.y * 0.3));

        if (Math.abs(skewX) > 0.002 || Math.abs(skewY) > 0.002) {
            const skewCanvas = document.createElement('canvas');
            const skewCtx = skewCanvas.getContext('2d', { willReadFrequently: true });

            if (skewCtx) {
                skewCanvas.width = canvas.width;
                skewCanvas.height = canvas.height;
                skewCtx.fillStyle = 'white';
                skewCtx.fillRect(0, 0, canvas.width, canvas.height);

                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                skewCtx.translate(centerX, centerY);
                skewCtx.transform(1, skewY, skewX, 1, 0, 0);
                skewCtx.translate(-centerX, -centerY);
                skewCtx.drawImage(canvas, 0, 0);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(skewCanvas, 0, 0);
            }
        }

        if (!validateCanvas()) {
            throw new Error('회전 및 확대 이미지 그리기 실패');
        }

        // 백업 생성
        backupImageData = canvas.toDataURL('image/png');

        // 3. 고품질 색상 변형 (블러 최소화, 밝기 변화 극도로 제한)
        const safeBrightness = Math.max(98, Math.min(102, color.brightness)); // 밝기 변화 범위 대폭 축소 (98-102%)
        const safeContrast = Math.max(95, Math.min(105, color.contrast)); // 대비 변화도 축소
        const safeSaturation = Math.max(90, Math.min(110, color.saturation)); // 채도 변화 축소
        const safeHue = Math.max(-5, Math.min(5, color.hue)); // 색조 변화 축소
        const safeBlur = Math.max(0.0, Math.min(0.2, params.blur)); // 블러 크게 감소

        // 고급 색상 보정을 위한 안전한 변수들 정의
        const safeGamma = Math.max(0.5, Math.min(2.0, color.gamma));
        const safeVibrance = Math.max(50, Math.min(150, color.vibrance));
        const safeTemperature = Math.max(3000, Math.min(10000, color.temperature));
        const safeTint = Math.max(-100, Math.min(100, color.tint));

        try {
            ctx.save();
            // 매우 미세한 블러만 적용 (선택적)
            const filterString = safeBlur > 0.05
                ? `brightness(${safeBrightness}%) contrast(${safeContrast}%) saturate(${safeSaturation}%) hue-rotate(${safeHue}deg) blur(${safeBlur}px)`
                : `brightness(${safeBrightness}%) contrast(${safeContrast}%) saturate(${safeSaturation}%) hue-rotate(${safeHue}deg)`;

            ctx.filter = filterString;

            const colorCanvas = document.createElement('canvas');
            const colorCtx = colorCanvas.getContext('2d', {
                willReadFrequently: true,
                alpha: false
            });
            if (colorCtx) {
                colorCanvas.width = canvas.width;
                colorCanvas.height = canvas.height;

                // 고품질 설정
                colorCtx.imageSmoothingEnabled = true;
                colorCtx.imageSmoothingQuality = 'high';
                colorCtx.drawImage(canvas, 0, 0);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(colorCanvas, 0, 0);

                // 추가 색상 보정 단계 적용 (픽셀 레벨에서)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                applyAdvancedColorCorrection(imageData, {
                    gamma: safeGamma,
                    vibrance: safeVibrance,
                    temperature: safeTemperature,
                    tint: safeTint,
                    exposure: 1 + rng.range(-0.05, 0.05), // exposure 변화 대폭 축소 (밝기 변화 최소화)
                    highlights: 1 + rng.range(-0.05, 0.05), // highlights 변화 축소 (밝은 부분 과도한 증가 방지)
                    shadows: 1 + rng.range(-0.1, 0.1), // shadows는 조금 더 허용 (어두운 부분 조정)
                    whites: 1 + rng.range(-0.03, 0.03), // whites 변화 축소 (밝은 영역 과도한 증가 방지)
                    blacks: 1 + rng.range(-0.1, 0.1) // blacks는 조금 더 허용 (어두운 영역 조정)
                }, rng);
                ctx.putImageData(imageData, 0, 0);
            }

            ctx.filter = 'none';
            ctx.restore();

            if (!validateCanvas()) {
                throw new Error('색상 변형 후 검증 실패');
            }
        } catch (colorError) {
            console.warn('색상 변형 실패, 백업 복원:', colorError);
            // 백업에서 복원
            const backupImg = new Image();
            backupImg.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(backupImg, 0, 0);
            };
            if (backupImageData) backupImg.src = backupImageData;
        }

        // 4. 고급 픽셀 변형 및 트랜스포머 우회
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // 기본 픽셀 변형 적용 (강화됨)
            applyAdvancedPixelTransforms(imageData, params, rng);

            // 트랜스포머 기반 AI 우회 추가
            applyTransformerEvasion(imageData, params, rng);

            // 최신 AI 모델 우회 추가 (CLIP, Diffusion 등)
            applyModernAIEvasion(imageData, params, rng);

            ctx.putImageData(imageData, 0, 0);

            if (!validateCanvas()) {
                throw new Error('고급 변형 검증 실패');
            }
        } catch (pixelError) {
            console.warn('고급 변형 건너뜀:', pixelError);
        }

        // 5. 추가 AI 우회 효과들
        try {
            // A. 간소화된 색상 채널 조정
            if (rng.next() < 0.5) { // 50% 확률로 적용
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // 채널별 미세 조정
                for (let i = 0; i < data.length; i += 4) {
                    if (rng.next() < 0.05) { // 5% 픽셀에 적용
                        const channelMultiplier = 0.98 + rng.range(0, 0.04);
                        data[i] = Math.max(0, Math.min(255, data[i] * channelMultiplier));
                        data[i+1] = Math.max(0, Math.min(255, data[i+1] * channelMultiplier));
                        data[i+2] = Math.max(0, Math.min(255, data[i+2] * channelMultiplier));
                    }
                }

                ctx.putImageData(imageData, 0, 0);
            }

            // B. 간소화된 영역별 변형
            if (rng.next() < 0.4) { // 40% 확률
                const regions = 5 + rng.int(0, 10); // 5-15개 영역

                for (let region = 0; region < regions; region++) {
                    const x = rng.int(0, canvas.width - 30);
                    const y = rng.int(0, canvas.height - 30);
                    const w = rng.int(10, 30);
                    const h = rng.int(10, 30);

                    const regionData = ctx.getImageData(x, y, w, h);
                    const data = regionData.data;

                    // 간단한 밝기/대비 조정만
                    const brightnessAdj = 1 + rng.range(-0.05, 0.05);
                    const contrastAdj = 1 + rng.range(-0.03, 0.03);

                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.max(0, Math.min(255, (data[i] - 128) * contrastAdj * brightnessAdj + 128));
                        data[i+1] = Math.max(0, Math.min(255, (data[i+1] - 128) * contrastAdj * brightnessAdj + 128));
                        data[i+2] = Math.max(0, Math.min(255, (data[i+2] - 128) * contrastAdj * brightnessAdj + 128));
                    }

                    ctx.putImageData(regionData, x, y);
                }
            }

        } catch (additionalError) {
            console.warn('고급 트랜스포머 우회 효과 건너뜀:', additionalError);
        }

        // 6. 극미세 균등 분포 워터마크 (거의 보이지 않음)
        if (watermark.count > 0) {
            try {
                ctx.save();
                // 극도로 미세한 마크 (거의 점 수준)
                const watermarkChars = ['⋅', '∙', '·'];

                // 균등 분포 계산 (더 많은 개수 허용)
                const gridCols = Math.floor(Math.sqrt(Math.min(watermark.count, 120))); // 최대 120개로 증가
                const gridRows = Math.ceil(Math.min(watermark.count, 120) / gridCols);
                const cellWidth = canvas.width / gridCols;
                const cellHeight = canvas.height / gridRows;

                let markCount = 0;
                for (let row = 0; row < gridRows && markCount < Math.min(watermark.count, 120); row++) {
                    for (let col = 0; col < gridCols && markCount < Math.min(watermark.count, 120); col++) {
                        // 각 셀 내에서 랜덤 위치
                        const cellCenterX = col * cellWidth + cellWidth / 2;
                        const cellCenterY = row * cellHeight + cellHeight / 2;
                        const offsetX = rng.range(-cellWidth * 0.3, cellWidth * 0.3);
                        const offsetY = rng.range(-cellHeight * 0.3, cellHeight * 0.3);

                        const x = cellCenterX + offsetX;
                        const y = cellCenterY + offsetY;

                        // 점 크기를 2분의 1로 더욱 작게 조정 (0.05-0.135px 범위로 극극미세)
                        const size = rng.range(0.05, 0.135); // 기존 0.1-0.27px의 2분의 1로 축소
                        const opacity = Math.max(0.0003, Math.min(0.003, watermark.opacity * 0.08)); // 점이 더욱 작아진 만큼 투명도도 조정
                        const char = watermarkChars[rng.int(0, watermarkChars.length - 1)];

                        ctx.font = `${size}px Arial`;
                        ctx.fillStyle = `rgba(220, 220, 220, ${opacity})`; // 조금 더 밝은 회색으로
                        ctx.fillText(char, x, y);

                        markCount++;
                    }
                }
                ctx.restore();
            } catch (watermarkError) {
                console.warn('워터마크 건너뜀:', watermarkError);
                ctx.restore();
            }
        }

        // 7. 최종 검증
        if (!validateCanvas()) {
            console.warn('최종 검증 실패, 기본 이미지로 복원');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        const finalQuality = Math.max(0.88, Math.min(0.95, quality));
        return canvas.toDataURL('image/jpeg', finalQuality);

    } catch (error) {
        console.error('변형 처리 오류:', error);

        // 완전 안전 모드로 폴백
        try {
            canvas.width = resize.w;
            canvas.height = resize.h;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 기본 이미지만 그리기
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 최소한의 AI 우회 변형
            const minimalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = minimalData.data;

            // 매우 미세한 노이즈만 추가
            for (let i = 0; i < data.length; i += 4) {
                if (rng.next() > 0.98) { // 2%만
                    const noise = rng.range(-1, 2);
                    data[i] = Math.max(0, Math.min(255, data[i] + noise));
                    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
                }
            }

            ctx.putImageData(minimalData, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.92);

        } catch (finalError) {
            console.error('최종 폴백 실패:', finalError);
            // 절대 안전 모드
            canvas.width = Math.max(300, resize.w);
            canvas.height = Math.max(300, resize.h);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.9);
        }
    }
};


const ImagePuffingPage = () => {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
    const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState('');

    useEffect(() => {
        return () => {
            if (originalImageSrc) {
                URL.revokeObjectURL(originalImageSrc);
            }
        };
    }, [originalImageSrc]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (originalImageSrc) {
            URL.revokeObjectURL(originalImageSrc);
        }
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setOriginalFile(file);
            setOriginalImageSrc(URL.createObjectURL(file));
            setProcessedImages([]);
            setError(null);
            setProgress('');
        } else {
            setOriginalFile(null);
            setOriginalImageSrc(null);
            setProcessedImages([]);
            setError('유효한 이미지 파일을 선택해주세요 (예: JPEG, PNG).');
        }
    };

    const processImage = async () => {
        if (!originalFile) {
            setError('먼저 이미지 파일을 선택해주세요.');
            return;
        }

        setIsProcessing(true);
        setProcessedImages([]);
        setError(null);
        setProgress('고급 AI 우회 시스템 초기화 중...');

        try {
            const baseImage = await loadImage(originalFile);
            const outputImages: ProcessedImage[] = [];
            const originalName = originalFile.name.split('.').slice(0, -1).join('.');
            const canvas = document.createElement('canvas');
            // Canvas2D 최적화 설정 (getImageData 경고 해결)
            if ('willReadFrequently' in canvas) {
                (canvas as any).willReadFrequently = true;
            }
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) {
                throw new Error('Canvas 2D context를 사용할 수 없습니다.');
            }

            const NUM_IMAGES = 5;
            const baseTimestamp = Date.now();

            // 각 이미지마다 완전히 고유한 시드 생성 (더 큰 차이값과 무작위성)
            const seeds = Array.from({length: NUM_IMAGES}, (_, i) => {
                const randomOffset = Math.floor(Math.random() * 999999999); // 9자리 무작위
                const imageOffset = i * 123456789; // 각 이미지마다 큰 차이
                const timeOffset = baseTimestamp % 1000000; // 시간 기반 추가 변화
                return baseTimestamp * 1000 + randomOffset + imageOffset + timeOffset;
            });

            for (let i = 0; i < NUM_IMAGES; i++) {
                setProgress(`이미지 생성 중... (${i + 1}/${NUM_IMAGES}) - 다층 보안 적용`);

                const seed = seeds[i];
                const rng = new SeededRandom(seed);
                // 시드에 이미지 인덱스와 추가 무작위성 포함
                const enhancedSeed = seed + i * 777777 + Math.floor(Math.random() * 555555);
                const uniqueMetadata = generateUniqueMetadata(enhancedSeed);

                // 변형 강도를 높인 적응형 파라미터 (1.5배~2배 증가)
                const intensityFactor = 0.5 + rng.next() * 0.4; // 0.5 ~ 0.9 (1.5배~2배 증가)
                const qualityPreservation = baseImage.width > 1000 ? 0.95 : 0.9; // 품질 극대화
                const diversityBoost = 1.0 + (i * 0.15); // 각 이미지마다 더 뚜렷한 차이 (3배 증가)

                // 향상된 변형 강도 (전체적으로 1.5배~2배 증가)
                const finalIntensity = intensityFactor * qualityPreservation * (0.8 + rng.range(0, 0.4)); // 2배 증가

                const params: AdvancedTransformParams = {
                    seed,
                    crop: {
                        x: rng.int(2, 8), // 크롭 축소
                        y: rng.int(2, 8)
                    },
                    resize: {
                        w: Math.max(350, baseImage.width + rng.int(-20, 20)), // 크기 변화 축소
                        h: Math.max(350, baseImage.height + rng.int(-20, 20))
                    },
                    skew: {
                        x: rng.range(-0.05, 0.05) * finalIntensity * 0.6, // 기존 대비 2배
                        y: rng.range(-0.05, 0.05) * finalIntensity * 0.6
                    },
                    scale: 0.98 + rng.range(0, 0.04) * finalIntensity, // 스케일 변화 축소
                    blur: 0.0, // 블러 완전 제거로 선명도 유지
                    jitter: Math.floor(rng.range(1, 3) * finalIntensity), // 지터 대폭 축소
                    channelShift: {
                        r: 1 + rng.range(-0.03, 0.03) * finalIntensity * 0.5, // 채널 시프트 축소
                        g: 1 + rng.range(-0.03, 0.03) * finalIntensity * 0.5,
                        b: 1 + rng.range(-0.03, 0.03) * finalIntensity * 0.5,
                    },
                    watermark: {
                        count: rng.int(50, 80), // 워터마크 개수 더 증가 (50-80개로 조밀한 분포)
                        opacity: (0.002 + rng.range(0, 0.006)) * finalIntensity // 투명도 더 축소 (점이 더 많아진 만큼 투명하게)
                    },
                    quality: Math.max(0.88, 0.90 + rng.range(-0.05, 0.08)), // 품질 향상
                    color: {
                        brightness: 100 + rng.range(-4, 4) * finalIntensity * diversityBoost * 0.3,
                        contrast: 100 + rng.range(-6, 8) * finalIntensity * diversityBoost * 0.5,
                        saturation: 100 + rng.range(-12, 15) * finalIntensity * diversityBoost * 0.5,
                        hue: rng.range(-5, 5) * finalIntensity * diversityBoost * 0.5,
                        gamma: 0.97 + rng.range(0, 0.06) * finalIntensity * 0.4,
                        temperature: 6500 + rng.range(-350, 350) * finalIntensity * 0.5,
                        tint: rng.range(-8, 8) * finalIntensity * 0.5,
                        vibrance: 100 + rng.range(-10, 12) * finalIntensity * 0.5
                    },
                    noise: {
                        gaussian: (0.8 + rng.range(0, 2.5)) * finalIntensity * 0.6, // 기존 대비 2배
                        salt: (0.001 + rng.range(0, 0.003)) * finalIntensity * 0.5,
                        pepper: (0.001 + rng.range(0, 0.003)) * finalIntensity * 0.5
                    },
                    geometric: {
                        rotation: rng.range(-0.02, 0.02) * finalIntensity, // 회전 범위 2배
                        shear: {
                            x: rng.range(-0.03, 0.03) * finalIntensity,
                            y: rng.range(-0.03, 0.03) * finalIntensity
                        },
                        perspective: rng.range(0, 0.05) * finalIntensity
                    },
                    frequency: {
                        highPass: rng.range(0, 0.1) * finalIntensity, // 주파수 변형 축소
                        lowPass: rng.range(0, 0.2) * finalIntensity,
                        bandPass: rng.range(0, 0.1) * finalIntensity
                    },
                    metadata: uniqueMetadata
                };

                // 비동기 처리로 UI 블로킹 방지
                const dataUrl = await new Promise<string>(resolve => {
                    setTimeout(() => {
                        const result = applyAllAdvancedTransforms(baseImage, ctx, params);
                        resolve(result);
                    }, 100);
                });

                // 완전히 고유한 해시 생성 (더 많은 변수와 무작위성 포함)
                const hashInput = {
                    seed: seed,
                    timestamp: uniqueMetadata.timestamp,
                    id: uniqueMetadata.uniqueId,
                    transform: i,
                    random1: Math.floor(Math.random() * 999999999),
                    random2: Math.floor(Math.random() * 999999999),
                    imageIndex: i,
                    processTime: Date.now(),
                    uniqueStr: Math.random().toString(36).substring(2, 15)
                };
                const uniqueHash = btoa(JSON.stringify(hashInput) + Math.random().toString()).slice(0, 12);

                outputImages.push({
                    id: i + 1,
                    src: dataUrl,
                    alt: `중복 우회 이미지 ${i + 1}`,
                    originalName,
                    uniqueHash,
                    transformSeed: seed
                });

                // 진행률 업데이트
                setProcessedImages([...outputImages]);
            }

            setProgress('이미지 생성 완료! 각 이미지는 고유한 디지털 지문을 가집니다.');

        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : String(e);
            setError(`이미지 처리 중 오류가 발생했습니다: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadImage = (src: string, filename: string) => {
        const link = document.createElement('a');
        link.href = src;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container mx-auto p-8 sm:p-12 lg:p-16 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        🏞️ 이미지 뻥튀기
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                        색상 필터와 색상 보정을 주축으로 하는 자연스러운 이미지 변형 기술로 중복 검출 시스템을 우회합니다.
                        밝기, 대비, 채도, 색온도 등의 조정으로 원본 품질과 자연스러움을 최대한 유지하면서 5개의 고유한 이미지를 생성합니다.
                    </p>
                    <div className="mt-4 flex justify-center space-x-4 text-sm text-blue-600 dark:text-blue-400">
                        <span>🎨 색상 필터 중심 변형</span>
                        <span>🌡️ 색온도/틴트 조정</span>
                        <span>💡 밝기/대비/채도 강화</span>
                        <span>🎯 극미세 픽셀 조정</span>
                        <span>🔒 메타데이터 완전 제거</span>
                    </div>
                </header>

                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
                        <span className="mr-2">📸</span> 원본 이미지 업로드
                    </h2>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                        <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-300 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800 transition-all duration-200"
                            disabled={isProcessing}
                        />
                        {originalFile && (
                            <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                                ✅ 선택된 파일: {originalFile.name}
                            </p>
                        )}
                    </div>
                </div>

                {originalImageSrc && (
                    <div className="mb-8 text-center bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">원본 이미지 미리보기</h2>
                        <img
                            src={originalImageSrc}
                            alt="Original preview"
                            className="max-w-xs mx-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-600"
                        />
                    </div>
                )}

                <div className="text-center mb-8">
                    <button
                        onClick={processImage}
                        disabled={!originalFile || isProcessing}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-10 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    >
                        {isProcessing ? '🔄 처리 중...' : '🚀 이미지 생성 시작'}
                    </button>
                </div>

                {isProcessing && progress && (
                    <div className="text-center my-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">{progress}</p>
                        <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${(processedImages.length / 5) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {processedImages.length}/5 이미지 완료
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl">
                        <p className="text-center text-red-600 dark:text-red-400 font-medium">❌ {error}</p>
                    </div>
                )}

                {processedImages.length > 0 && !isProcessing && (
                    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center">
                            <span className="mr-3">🎯</span> 변환 완료
                        </h2>

                        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-lg border border-green-200 dark:border-green-700">
                            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                                <span className="mr-2">🎨</span> 자연스러운 색상 중심 변형 시스템
                            </h3>
                            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                <li>✅ 고급 색상 보정 (밝기, 대비, 채도, 색온도, 틴트)</li>
                                <li>✅ 감마 보정 및 노출 조정으로 자연스러운 변형</li>
                                <li>✅ 하이라이트/섀도우 개별 조정</li>
                                <li>✅ 화이트/블랙 포인트 정밀 조정</li>
                                <li>✅ 바이브런스 기반 지능형 채도 조정</li>
                                <li>✅ 극미세 균등 분포 픽셀 조정 (거의 보이지 않음)</li>
                                <li>✅ 메타데이터 완전 제거 및 고유 디지털 지문 생성</li>
                                <li>✅ 원본 품질과 자연스러움 최대한 보존</li>
                            </ul>
                        </div>

                        <p className="mb-6 text-gray-600 dark:text-gray-300">
                            아래 5개의 이미지는 주로 색상 필터와 보정을 통해 변형되어 원본과 매우 유사하지만 완전히 다른 디지털 지문을 가집니다. 점이나 노이즈 같은 시각적 변화는 최소화하고 자연스러운 색상 조정으로 중복 검출을 우회합니다.
                        </p>

                        <p className="mb-6 text-gray-600 dark:text-gray-300">
                            아래 5개의 이미지는 최신 AI 중복 검출 시스템을 우회하도록 고도화된 다층 보안 변형을 적용했습니다. 각 이미지는 고유한 시드와 메타데이터를 가지며, 원본 품질을 최대한 보존합니다.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {processedImages.map((image) => (
                                <div key={image.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 shadow-md">
                                    <div className="relative overflow-hidden rounded-lg shadow-sm bg-white dark:bg-gray-800 mb-4">
                                        <img
                                            src={image.src}
                                            alt={image.alt}
                                            className="w-full h-64 object-cover"
                                            style={{ minHeight: '200px' }}
                                        />
                                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                            #{image.id}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <h3 className="font-semibold text-gray-800 dark:text-white text-center">
                                            {image.alt}
                                        </h3>
                                        <div className="text-xs text-center space-y-1">
                                            <p className="text-blue-600 dark:text-blue-400">
                                                시드: {(image.transformSeed * (image.id + 1)).toString(16).slice(-8).toUpperCase()}
                                            </p>
                                            <p className="text-green-600 dark:text-green-400">
                                                해시: {image.uniqueHash}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => downloadImage(image.src, `${image.originalName}_ai_bypass_v2_${image.uniqueHash}.jpg`)}
                                        className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                                    >
                                        <span>📥</span>
                                        <span>이미지 다운로드</span>
                                    </button>

                                    <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                                        클릭하여 고유 변형 이미지 저장
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => {
                                    processedImages.forEach((image, index) => {
                                        setTimeout(() => {
                                            downloadImage(image.src, `${image.originalName}_ai_bypass_batch_${index + 1}_${image.uniqueHash}.jpg`);
                                        }, index * 500); // 0.5초 간격으로 다운로드
                                    });
                                }}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg"
                            >
                                📦 모든 이미지 일괄 다운로드
                            </button>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                5개 이미지를 순차적으로 다운로드합니다
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <div className="h-16"></div>
        </div>
    );
};

export default ImagePuffingPage;