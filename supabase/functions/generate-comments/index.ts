import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.52.7/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { prompts } from './prompts/index.ts'; // 분리된 프롬프트를 가져옵니다.

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'submit_comments',
            description: '생성된 댓글 목록을 제출합니다.',
            parameters: {
                type: 'object',
                properties: {
                    comments: {
                        type: 'array',
                        description: '생성된 댓글의 배열',
                        items: {
                            type: 'object',
                            properties: {
                                nickname: { type: 'string', description: "생성된 사용자의 고유한 닉네임 (한글 또는 영어)" },
                                commentText: { type: 'string', description: '생성된 댓글의 내용' },
                                replyTo: { type: 'string', description: '답글을 다는 대상 사용자의 닉네임. 답글이 아니면 null.' },
                            },
                            required: ["nickname", "commentText", "replyTo"],
                        },
                    },
                },
                required: ['comments'],
            },
        },
    },
];

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { sourceArticleId, generatedContent, sourceTable } = await req.json();
        if (!sourceArticleId || !generatedContent || !sourceTable) {
            throw new Error('sourceArticleId, generatedContent, sourceTable 중 하나가 요청에 없습니다.');
        }
        if (!prompts[sourceTable]) {
            throw new Error(`'${sourceTable}'에 대한 프롬프트를 찾을 수 없습니다.`);
        }

        const selectedPrompt = prompts[sourceTable].system;

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: article, error } = await supabaseAdmin
            .from(sourceTable)
            .select('comments')
            .eq('id', sourceArticleId)
            .single();

        if (error || !article) throw new Error('원본 게시글을 찾을 수 없습니다.');

        const originalComments = article.comments;
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
        const userPrompt = `[생성된 본문]\n${generatedContent}\n\n[참고할 원본 댓글 스타일]\n${originalComments}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: selectedPrompt }, { role: "user", content: userPrompt }],
            tools: tools,
            tool_choice: { type: 'function', function: { name: 'submit_comments' } },
            temperature: 1.2,
            top_p: 0.3,
        });

        const toolCall = response.choices[0].message.tool_calls?.[0];

        if (toolCall?.type === 'function' && toolCall.function?.arguments) {
            const parsedArgs = JSON.parse(toolCall.function.arguments);
            return new Response(JSON.stringify({ comments: parsedArgs.comments || [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        throw new Error('AI가 유효한 댓글 데이터를 생성하지 못했습니다.');

    } catch (error) {
        console.error("## generate-comments 함수 오류:", error);
        return new Response(JSON.stringify({ message: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});