import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.52.7/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (_req) => {
    // OPTIONS 요청에 대한 사전 처리
    if (_req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 관리자 권한의 Supabase 클라이언트 생성
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. 데이터베이스 함수(RPC)를 호출하여 다음 게시글을 안전하게 가져옴
        const { data: article, error: rpcError } = await supabaseAdmin.rpc('get_next_article_and_update_tracker');

        if (rpcError) {
            console.error("RPC Error:", rpcError);
            throw new Error('데이터베이스 함수 호출에 실패했습니다.');
        }
        if (!article || article.length === 0) {
            return new Response(
                JSON.stringify({ message: '더 이상 처리할 데이터가 없습니다.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        // rpc가 SETOF를 반환하므로 배열의 첫 번째 요소를 사용
        const sourceArticle = article[0];

        // 2. OpenAI 클라이언트 생성 및 프롬프트 정의
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

        const systemPrompt = `제공된 데이터 글쓴이, 댓글 작성자의 문체, 어조, 단어 선택, 문장 구조, 뉴라인 갯수, 자주 사용하는 표현과 단어, 불규칙한 줄바꿈(뉴라인) 등을 분석하여 모방해야해. 

[작성해야할 내용]
작성자 이름 1개: 한글 또는 영어로 된 개성있는 작성자 이름을 생성한다.
제목 1개: 제공된 데이터의 글쓴이 제목을 모방하여 연애 주제로 변경해서 내용을 작성한다.
본문 1개: 제공된 데이터의 글쓴이 본문을 모방하여 연애 주제로 변경해서 내용을 작성한다. 원래 본문을 바탕으로 새롭게 작성될 본문은 기존 본문의 길이 만큼 정확히 작성되며, 예를들어 금액, 숫자가 나오면 본문과 다르게 변경하지만 반드시 현실적인 숫자여야하는점 주의해. 그리고 새로 적는 주제와 기존 내용이 문맥이 맞고 현실성이 있어야해.

[전체 요구사항]
- 생성한 본문 안에 ㅠㅠ, ㅎㅎ,ㅜ,ㅠ 이런 문장 모양, 또는 ^^ 들어가야한다. 하지만 ㅠㅠ, ㅜㅜ 이거는 반드시 2글지 이상 작성되면 안되
- 특수문자는 실제 사람이 쓰지 않으니 절대로 쓰면 안된다.
- 생성한 본문 안에 "했는데........" 이런식 "아....." 이러식 "진짜;;;" 나 "어떻게,,," 등등 이런 종류의 친근한 표현을 자주 사용해
- 생성한 본문 안에 모두 구어체로 친한 친구에게 말하는 것처럼 "아니구......" "같아여....." "했었구....." 같은 표현을 자주 사용해
- 생성한 본문 안에 이모지가 들어가야한다. 사용가능한 이모지는 🙇🏻‍♀️❤️❣️😍🫢👍🏻🥹🥰 
- 생성한 본문 안에 \\n을 1번 사용 또는 \\n\\n 2번 연속 삽입해서 사람처럼 보여야한다. 문장이 끝날때 마다\n를 넣어서 가독성을 높여야해
- 한국어나 영어 단어만 들어가야해. 단어 중간에 한국어가 아닌 외국어 문자열이 들어가는 경우가 있는데 모두 한글로 변경해야한다. 
- 특정 제품명 말하지마
- 각각 댓글에 구어체 사용해
- json으로 응답해 포맷은 다음과 같아 {author: "생성된 작성자 이름", title: "생성된 제목", content: "생성된 본문", count: "랜덤으로 조회수"}`;

        const userPrompt = `[제목] \n${sourceArticle.title || ''}\n[본문]\n${sourceArticle.content || ''}\n[댓글들]\n${sourceArticle.comments || ''}`;

        // 3. OpenAI API 호출
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // 최신 모델 사용 권장
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 1.2,
            top_p: 0.3,
        });

        const gptContent = response.choices[0].message.content || "";

        let parsedFromAI = {};
        try {
            // AI가 응답에 코드 블록(```json ... ```)을 포함하는 경우를 대비해 순수 JSON만 추출
            const jsonMatch = gptContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Valid JSON object not found in AI response.");

            parsedFromAI = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error("AI 응답 JSON 파싱 실패:", { originalResponse: gptContent, error: parseError });
            throw new Error('AI가 유효한 JSON 형식으로 응답하지 않았습니다.');
        }

        const generatedArticle = {
            author: "AI_Bot",
            title: "제목 생성 실패",
            content: "본문 생성 실패",
            count: 0,
            ...parsedFromAI
        };

        // 4. 최종 결과 프론트엔드로 반환
        const finalResponse = {
            sourceArticleId: sourceArticle.id,
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