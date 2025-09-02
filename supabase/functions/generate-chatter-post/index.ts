import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.52.7/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

const prompts = {
    beauty: {
        system: `제공된 데이터 글쓴이의 문체, 어조, 단어 선택, 문장 구조, 뉴라인 갯수, 자주 사용하는 표현과 단어, 불규칙한 줄바꿈(뉴라인) 등을 분석하여 모방해야해. 

[작성해야할 내용]
작성자 이름 1개: 한글 또는 영어로 된 개성있는 작성자 이름을 생성한다.
제목 1개: 제공된 데이터의 글쓴이 제목을 모방하여 뷰티 주제로 변경해서 내용을 작성한다.
본문 1개: 제공된 데이터의 글쓴이 본문을 모방하여 뷰티 주제로 변경해서 내용을 작성한다. 원래 본문을 바탕으로 새롭게 작성될 본문은 기존 본문의 길이 만큼 정확히 작성되며, 예를들어 금액, 숫자가 나오면 본문과 다르게 변경하지만 반드시 현실적인 숫자여야하는점 주의해. 그리고 새로 적는 주제와 기존 내용이 문맥이 맞고 현실성이 있어야해.
댓글은 절대로 생성하지 않는다. 

[전체 요구사항]
- 생성한 본문 안에 ㅠㅠ, ㅎㅎ,ㅜ,ㅠ 이런 문장 모양, 또는 ^^ 들어가야한다. 하지만 ㅠㅠ, ㅜㅜ 이거는 반드시 2글지 이상 작성되면 안되
- 특수문자는 실제 사람이 쓰지 않으니 절대로 쓰면 안된다.
- 생성한 본문 안에 "했는데........" 이런식 "아....." 이러식 "진짜;;;" 나 "어떻게,,," 등등 이런 종류의 친근한 표현을 자주 사용해
- 생성한 본문 안에 모두 구어체로 친한 친구에게 말하는 것처럼 "아니구......" "같아여....." "했었구....." 같은 표현을 자주 사용해
- 생성한 본문 안에 이모지가 들어가야한다. 사용가능한 이모지는 🙇🏻‍♀️❤️❣️😍🫢👍🏻🥹🥰, 하지만 문맥에 맞게 이모지를 모양일 선택해 사용해야한다.
- 생성한 본문 안에 \\n을 1번 사용 또는 \\n\\n 2번 연속 삽입해서 사람처럼 보여야한다. 문장이 끝날때 마다\n를 넣어서 가독성을 높여야해
- 한국어나 영어 단어만 들어가야해. 단어 중간에 한국어가 아닌 외국어 문자열이 들어가는 경우가 있는데 모두 한글로 변경해야한다. 
- 특정 제품명 말하지마
- 각각 댓글에 구어체 사용해
- json으로 응답해 포맷은 다음과 같아 {author: "생성된 작성자 이름", title: "생성된 제목", content: "생성된 본문", count: "랜덤으로 조회수"}`,
    },
    certificateReview: {
        system: `제공된 '자격증 합격 후기' 데이터의 글쓴이 스타일(문체, 어조, 줄바꿈, 표현)을 완벽하게 모방해서, 완전히 새로운 '자격증 합격 후기' 게시글을 생성해야 합니다.

[작성해야할 내용]
반드시 뷰티 관련 자격증에 대한 후기 여야해
작성자 이름 1개: 합격 후기를 쓸 법한 진솔한 느낌의 닉네임을 생성합니다.
제목 1개: 원본 제목 스타일을 모방하여, 다른 종류의 자격증 합격 후기 제목을 만듭니다. (예: 정보처리기사, 컴퓨터활용능력)
본문 1개: 원본 본문의 스타일과 길이를 따라, 새로운 자격증 시험을 준비하고 합격한 과정을 상세하고 현실감 있게 작성합니다. 공부 방법, 어려웠던 점, 합격 팁 등을 포함해야 합니다. 원본의 숫자(기간, 점수 등)가 나오면, 현실적인 다른 숫자로 변경해야 합니다.
댓글은 절대로 생성하지 않는다.

[전체 요구사항]
- 글의 전체적인 구조와 문단 나누기, 줄바꿈(\n 또는 \n\n) 스타일을 원본과 매우 유사하게 따라해야 합니다.
- 원본처럼 ㅎㅎ, ㅠㅠ, ^^ 같은 표현이나 이모지(🎉, 👍, 🙏, 😂)가 있다면 적절하게 사용합니다.
- "~~했고요...", "~~했던 것 같아요.", "진짜 힘들었는데..." 와 같이 구어체 중심의 진솔한 어조를 사용합니다.
- 문맥에 맞는 전문 용어를 사용하여 신뢰도를 높여야 합니다. (예: '2과목 필기 점수가 안나와서 힘들었어요', '실기는 기출문제를 계속 돌렸습니다')
- json으로 응답해야 하며, 포맷은 {author: "생성된 작성자 이름", title: "생성된 제목", content: "생성된 본문", count: "랜덤으로 조회수"} 입니다.`,
    }
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { topic } = await req.json();
        if (!topic || !prompts[topic]) {
            throw new Error(`'${topic}'은(는) 유효한 주제가 아닙니다.`);
        }

        const tableIdentifier = topic === 'beauty' ? 'articles' : 'certificate_reviews';
        const selectedPrompt = prompts[topic].system;

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
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: selectedPrompt }, { role: "user", content: userPrompt }],
            temperature: 1.3,
            top_p: 0.3,
        });

        const gptContent = response.choices[0].message.content || "";
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