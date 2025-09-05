import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.52.7/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { prompts } from './prompts/index.ts';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { topic } = await req.json();
        const selectedPromptConfig = prompts[topic];

        if (!topic || !selectedPromptConfig) {
            throw new Error(`'${topic}'은(는) 유효한 주제가 아닙니다.`);
        }

        let tableIdentifier: string;
        switch (topic) {
            case 'beauty':
                tableIdentifier = 'articles';
                break;
            case 'certificateReview':
                tableIdentifier = 'certificate_reviews';
                break;
            case 'beautyPromoPost':
                tableIdentifier = 'beauty_promo_posts';
                break;
            default:
                throw new Error(`'${topic}'에 해당하는 테이블을 찾을 수 없습니다.`);
        }

        const selectedSystemPrompt = selectedPromptConfig.system;
        const selectedModel = selectedPromptConfig.model || 'gpt-4o-mini';

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: record, error: rpcError } = await supabaseAdmin.rpc('get_next_record', {
            p_table_identifier: tableIdentifier
        });

        if (rpcError) throw rpcError;
        if (!record || record.length === 0) {
            return new Response(JSON.stringify({ message: '더 이상 처리할 데이터가 없습니다.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404
            });
        }

        const sourceRecord = record[0];
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
        const userPrompt = `[제목] \n${sourceRecord.title || ''}\n[본문]\n${sourceRecord.content || ''}`;

        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [{ role: "system", content: selectedSystemPrompt }, { role: "user", content: userPrompt }],
        });

        let gptContent = response.choices[0].message.content || "";

        gptContent = gptContent.replace(/\{nl\}/g, '\n');

        const jsonMatch = gptContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI 응답에서 유효한 JSON 객체를 찾지 못했습니다.");

        const parsedFromAI = JSON.parse(jsonMatch[0]);
        const generatedArticle = {
            author: "AI_Bot",
            title: "제목 생성 실패",
            content: "본문 생성 실패",
            count: 0,
            ...parsedFromAI
        };

        const finalResponse = {
            sourceArticleId: sourceRecord.id,
            sourceTable: tableIdentifier,
            generatedArticle: generatedArticle,
        };

        return new Response(JSON.stringify(finalResponse), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("## generate-chatter-post 함수 오류:", error);
        return new Response(JSON.stringify({ message: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});