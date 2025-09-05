INSERT INTO public.sequence_tracker(last_processed_article_id, table_identifier)
VALUES (0, 'beauty_promo_posts')
    ON CONFLICT (table_identifier)
DO NOTHING;