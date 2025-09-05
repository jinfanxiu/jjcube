import { serve } from 'STD/http/server.ts';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image-preview'
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function getPromptForLevel(level: number): string {
    const basePrompt = `Generate an ultra-realistic photo based on the provided input image.`;

    let levelPrompt = '';
    switch (level) {
        case 1:
            levelPrompt = `아래 요청사항에 따라 이미지 생성 후 이미지 데이터 전송해줘, 텍스트 데이터 전송하지마
1.원본 인물 생김새는 반드시 그대로 유지해야해, 만약 얼굴을 생성이 필요하면 생성된 얼굴은 한국사람 이어야해. 사진 전체 구조는 그대로 유지해야해. 
2.카메라 거리를 원본 사진 보다 50% 더 멀리서 찍은 사진 처럼 축소해줘. 축소하면서 잘린 부분들을 채워넣어줘 그리고 카메라 앵글을 틀어야해
`;
            break;
        case 2:
            levelPrompt = `아래 요청사항에 따라 이미지 생성 후 이미지 데이터 전송해줘, 텍스트 데이터 전송하지마
1.원본 인물 생김새는 반드시 그대로 유지해야해, 만약 얼굴을 생성이 필요하면 생성된 얼굴은 한국사람 이어야해. 사진 전체 구조는 그대로 유지해야해. 
2.카메라 거리를 원본 사진 보다 50% 더 가까이에서 확대해서 찍은 사진 처럼 만들어주면서 카메라 각도를 눈에 띄게 틀어야해
`;
            break;
        case 3:
            levelPrompt = `아래 요청사항에 따라 이미지 생성 후 이미지 데이터 전송해줘, 텍스트 데이터 전송하지마
1.원본 인물 생김새는 반드시 그대로 유지해야해, 사진 전체 구조는 그대로 유지해야해. 
2.다양한 변화: 사물/가구/소품의 위치와 색상, 의상 색상을 어색하지 않게 변경해. 흰색 사물의 색은 변경 금지
3.카메라거리는 원본 사진 보다 50% 멀리서 찍은 사진 처럼 변경해줘. 변경하면서 잘린 부분들을 채워넣어줘 그리고 카메라 앵글을 틀어야해
4.사물을 변화시킬 때 아주 다른 사물로 변경되면 안됨. 예를들어 컵은 컵으로, 의자는 의자로 변경되야해. 컵이 밥그릇이 되면 안되는거.
5.사람이 입은 옷이나 사물의 색을 변경 시켜. 이때 반대색이 아니라 가까운 색으로 변경시켜줘.
6.사람의 동작 자세의 각도나 위치를 아주 살짝 변경시켜
`;
            break
        default:
            levelPrompt = `아래 요청사항에 따라 이미지 변경해 준 뒤 생성된 이미지 데이터 전송해줘
1.인물 생김새 유지: 원본 인물 그대로 유지해야해, 사진의 구조도 유지해 
2.다양한 변화: 사물/가구/소품의 위치와 색상, 의상 색상을 어색하지 않게 변경해. 흰색 사물의 색은 변경 금지
3.카메라거리는 원본 사진 보다 50% 멀리서 찍은 사진 처럼 만들어주면서 축소하면서 잘린 부분들을 채워넣어줘 그리고 카메라 앵글도 살짝 틀어야해
4.사물을 변화시킬 때 아주 다른 사물로 변경되면 안됨. 예를들어 컵은 컵으로, 의자는 의자로 변경되야해. 컵이 밥그릇이 되면 안되는거.
5.사람이 입은 옷이나 사물의 색을 변경 시켜. 이떄 반대색이 아니라 가까운 색으로 변경시켜줘.
6.사람의 동작 자세의 각도나 위치를 아주 살짝 변경시켜`;
            break;
    }
    return `${basePrompt}\n\n${levelPrompt}`;
}

const getLocalDateString = (date: Date): string => {
    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date).replace(/\. /g, '-').replace('.', '');
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('인증 헤더가 없습니다.');
        }

        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
        if (userError) throw new Error('사용자 인증에 실패했습니다: ' + userError.message);
        if (!user) throw new Error('사용자를 찾을 수 없습니다.');

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('image_credits, last_credit_update_at')
            .eq('id', user.id)
            .single();

        if (profileError) throw new Error('사용자 프로필을 조회하지 못했습니다.');

        let currentCredits = profile.image_credits;

        const lastUpdateDateStr = getLocalDateString(new Date(profile.last_credit_update_at));
        const todayDateStr = getLocalDateString(new Date());

        const needsCreditReset = lastUpdateDateStr < todayDateStr;

        if (needsCreditReset) {
            const dailyCredits = parseInt(Deno.env.get('DAILY_IMAGE_CREDITS') ?? '30', 10);
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    image_credits: dailyCredits,
                    last_credit_update_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (updateError) throw updateError;
            currentCredits = dailyCredits;
        }

        if (currentCredits <= 0) {
            return new Response(JSON.stringify({ error: '이미지 생성 크레딧이 부족합니다. 내일 다시 시도해주세요.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 429,
            });
        }

        const { error: decrementError } = await supabaseAdmin
            .from('profiles')
            .update({
                image_credits: currentCredits - 1,
                last_credit_update_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (decrementError) throw new Error('크레딧 차감에 실패했습니다: ' + decrementError.message);

        const { imageBase64, mimeType, variationLevel = 1 } = await req.json();
        if (!imageBase64 || !mimeType) {
            throw new Error('Image data or mimeType is missing.');
        }

        const prompt = getPromptForLevel(variationLevel);

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType,
            },
        };

        const result = await model.generateContent([prompt, imagePart], safetySettings);
        const response = result.response;

        console.log(JSON.stringify(response, null, 2));

        const imagePartFromResponse = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);

        if (!imagePartFromResponse || !imagePartFromResponse.inlineData) {
            throw new Error('모델이 이미지를 생성하지 못했습니다.');
        }

        const generatedImageBase64 = imagePartFromResponse.inlineData.data;
        const generatedMimeType = imagePartFromResponse.inlineData.mimeType;

        return new Response(JSON.stringify({
            imageBase64: generatedImageBase64,
            mimeType: generatedMimeType,
            remainingCredits: currentCredits - 1
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";

        let status = 500;
        let message = errorMessage;

        if (errorMessage.includes("finishReason: SAFETY")) {
            status = 400;
            message = "생성 요청이 Google의 안전 정책에 의해 차단되었습니다. 다른 이미지를 사용해 주세요.";
        }

        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: status,
        });
    }
});