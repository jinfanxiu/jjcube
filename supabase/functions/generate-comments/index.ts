import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.52.7/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

// OpenAI Function Calling을 위한 도구(Tool) 정의
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
        const { sourceArticleId, generatedContent } = await req.json();
        if (!sourceArticleId || !generatedContent) {
            throw new Error('sourceArticleId 또는 generatedContent가 요청에 없습니다.');
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. 원본 댓글을 DB에서 가져오기
        const { data: article, error } = await supabaseAdmin
            .from('articles')
            .select('comments')
            .eq('id', sourceArticleId)
            .single();

        if (error || !article) {
            console.error("DB Error:", error);
            throw new Error('원본 게시글을 찾을 수 없습니다.');
        }
        const originalComments = article.comments;

        // 2. OpenAI 클라이언트 생성 및 프롬프트 정의
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

        const systemPrompt = `
[전체 요구사항]
- 생성 되는 댓글 갯수는 3개 이하여야해. 생성된 댓글은 반드시 300글자 이상 댓글을 작성해, 특히 대댓글에서 중복이 잘 발생하는데 모든 댓글은 서로 중복되어서는 절대로 안됨
- 각 댓글 작성자의 닉네임은 한글과 영어를 섞어서 사용해. 
- 댓글 작성자는 페르소나를 각자 다르게 해서 스타일 문체가 서로 다르게 작성되어야해
- 댓글안에 ㅠㅠ, ㅎㅎ,ㅜ,ㅠ 이런 문장 모양, 또는 ^^ 들어가야한다. 본문이 절대로 '아니구'로 말을 시작하면 안되
- 특수문자는 실제 사람이 쓰지 않으니 절대로 쓰면 안된다.
- 각각 댓글안에 "했는데..........." 이런식 "아....." 이러식 "진짜;;;" 나 "어떻게,,," 등등 이  같은 표현을 자주 사용해
- 각각 댓글안에 반드시 모두 구어체로 친한 친구에게 말하는 것처럼 "같아여..." "했었구.." 같은 표현을 자주 사용해
- 각각 댓글안에 반드시 이모지가 들어가야한다. 사용가능한 이모지는 🙇🏻‍♀️❤️❣️😍🫢👍🏻🥹🥰 응답 1번마다 중복 이모지는 2개까지만 허용
- 각각 댓글안에 반드시 \n을 1번 사용 또는 \n\n 2번 연속 삽입해서 사람처럼 보여야한다. 
- 한국어나 영어로 말해야한다. 단어 중간에 한국어가 아닌 외국어 문자열이 들어가는 경우가 있는데 모두 한글로 변경해야한다. 
- 특정 제품명 말하지마
- 각각 댓글에 구어체 사용해
- 댓글 끼리 대화를 주고 받은 내용도 포함되어야 하지만, 반드시 아래 규칙을 지켜야 한다:
  1. 전체 댓글 중 replyTo가 null인 '원댓글'이 최소 3개 이상 포함되어야 한다.
  2. 대댓글은 이전에 등장한 다른 사용자의 nickname에만 달 수 있다.
  3. 대화가 자연스럽게 여러 갈래로 나뉘도록 구성해야 한다.`;

        const userPrompt = `[생성된 본문]\n${generatedContent}\n\n[참고할 원본 댓글 스타일]\n${originalComments}`;

        // 3. OpenAI API 호출
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            tools: tools,
            tool_choice: { type: 'function', function: { name: 'submit_comments' } },
            temperature: 1.2,
            top_p: 0.3,
        });

        const toolCall = response.choices[0].message.tool_calls?.[0];

        if (toolCall?.type === 'function' && toolCall.function?.arguments) {
            const guaranteedValidJson = toolCall.function.arguments;
            return new Response(guaranteedValidJson, {
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