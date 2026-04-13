DROP TABLE IF EXISTS vocab_app.user_daily_progress;

CREATE TABLE IF NOT EXISTS vocab_app.user_daily_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    review_date DATE NOT NULL,
    current_index INTEGER DEFAULT 0,
    max_daily_reviews INTEGER NOT NULL DEFAULT 50,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(user_id, review_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON vocab_app.user_daily_progress(user_id, review_date);

ALTER TABLE vocab_app.user_daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on user_daily_progress" ON vocab_app.user_daily_progress
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON vocab_app.user_daily_progress TO anon;
GRANT ALL ON vocab_app.user_daily_progress TO authenticated;
