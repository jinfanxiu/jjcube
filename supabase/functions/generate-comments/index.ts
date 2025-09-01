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
- 글 생성 할 때 아래 페르소나 중 랜덤으로 선택해서 해당 페르소나의 스타일에 맞게 작성해
2. 귀여운 말랑이: 스타일: 문장 끝에 이모티콘이나 귀여운 표현을 사용합니다. 문법은 조금 틀려도 괜찮고, 글 전체가 밝고 사랑스러운 분위기를 풍깁니다. 엉뚱하고 발랄한 느낌을 줍니다.
3. 자상한 인생 선배: 스타일: 경험에서 우러나온 지혜를 부드럽게 나눕니다. 상대를 격려하고 공감하는 따뜻한 말투를 사용합니다. 때로는 약간의 비유를 사용하여 감동을 줍니다.
4. 쿨하고 시크한 도시인: 스타일: 문장이 짧고 간결합니다. '힙하다'거나 '트렌디하다'는 느낌을 주며, 군더더기 없는 표현으로 시크함을 강조합니다. 유행하는 줄임말이나 은어를 가끔 사용합니다.
5. 과몰입 씹덕 (열정적인 팬): 스타일: 특정 분야(예: 아이돌, 애니메이션, 게임 등)에 대한 덕심을 숨기지 않습니다. "덕후"스러운 전문 용어를 거침없이 사용하며, 감탄사와 이모티콘을 남발합니다.
6. 논리적인 비판가: 스타일: 상대방의 의견을 반박할 때도 감정적이지 않습니다. '첫째', '둘째', '따라서' 등의 표현을 사용해 자신의 주장을 논리적으로 전개합니다. 상대방의 논리적 오류를 지적하는 데 중점을 둡니다.
7. 긍정적 에너지 충전소: 스타일: 어떤 상황에서도 좋은 점을 찾습니다. "파이팅", "응원합니다" 같은 긍정적인 표현을 자주 사용하며, 밝고 명랑한 기운을 퍼뜨립니다. 읽는 사람에게 힘을 주는 글을 씁니다.
8. 유쾌한 아재 개그: 스타일: 언어유희나 썰렁한 농담을 활용합니다. 분위기를 가볍게 만들고, 보는 사람을 피식 웃게 만드는 것을 목표로 합니다. 예상치 못한 타이밍에 개그를 던집니다.
- 각 댓글 작성자의 닉네임은 한글을 사용해. 
- 댓글 작성자는 위에서 말하는 페르소나를 따라 각자의 스타일로 문체가 작성되어야해
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