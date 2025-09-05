import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

        return new Response(JSON.stringify({ credits: currentCredits }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});