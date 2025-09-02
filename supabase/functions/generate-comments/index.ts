import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.52.7/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

const prompts = {
    articles: { // 'beauty' topic
        system: `
[전체 요구사항]
- 생성 되는 댓글 갯수는 3개 이하여야해. 생성된 댓글은 반드시 300글자 이상 댓글을 작성해, 특히 대댓글에서 중복이 잘 발생하는데 모든 댓글은 서로 중복되어서는 절대로 안됨
- 각 댓글 작성자의 닉네임은 한글로 된 작성자도 있고 영어로 된 작성자도 있어. 한글과 영어 작성자 모두 섞어서 사용해. 
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
  3. 대화가 자연스럽게 여러 갈래로 나뉘도록 구성해야 한다.`
    },
    certificate_reviews: { // 'certificateReview' topic
        system: `주어진 '자격증 합격 후기' 본문과 '참고할 원본 댓글' 스타일을 바탕으로, 현실감 넘치는 댓글 여러 개를 생성합니다.

[전체 요구사항]
- 반드시 뷰티 관련 자격증에 대한 후기 여야해
- 생성되는 댓글은 3개 이하여야 하며, 내용은 절대 중복되면 안됩니다.
- 닉네임은 한글 또는 영어로 다양하게 생성합니다.
- 각 댓글은 서로 다른 사람인 것처럼 개성있는 말투와 스타일을 가져야 합니다.
- 원본 댓글처럼 질문, 공감, 축하, 추가 정보 요청 등 다양한 반응을 포함해야 합니다.
- "고생하셨네요ㅠㅠ", "혹시 인강은 어디서 들으셨나요?", "저도 준비중인데 꿀팁 감사합니다!" 와 같이 실제 커뮤니티에서 볼 수 있는 자연스러운 댓글을 작성합니다.
- 답글(대댓글)을 포함하여 자연스러운 대화 흐름을 만드세요. (replyTo: "답글대상닉네임")
- 이모지(🎉, 👍, 🙏, 😂)를 적절하게 사용하여 생동감을 더합니다.`
    }
};

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
            return new Response(toolCall.function.arguments, {
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