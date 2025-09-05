INSERT INTO public.sequence_tracker(last_processed_article_id, table_identifier)
VALUES (0, 'olive_young_reviews')
    ON CONFLICT (table_identifier)
DO NOTHING;