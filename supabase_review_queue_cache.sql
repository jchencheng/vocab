-- ============================================
-- 复习队列缓存表（支持跨设备同步）
-- ============================================

-- 创建复习队列缓存表
CREATE TABLE IF NOT EXISTS vocab_app.user_review_queue_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  queue_data JSONB NOT NULL, -- 存储复习队列单词ID列表和顺序
  current_index INTEGER DEFAULT 0,
  max_daily_reviews INTEGER DEFAULT 50,
  study_mode TEXT DEFAULT 'mixed',
  primary_word_book_id UUID,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(user_id, review_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_review_queue_cache_user_date 
  ON vocab_app.user_review_queue_cache(user_id, review_date);

-- 创建清理过期缓存的函数（保留最近7天）
CREATE OR REPLACE FUNCTION vocab_app.cleanup_old_review_queue_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM vocab_app.user_review_queue_cache
  WHERE review_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 添加RLS策略
ALTER TABLE vocab_app.user_review_queue_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own review queue cache"
  ON vocab_app.user_review_queue_cache
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 创建获取或生成复习队列的RPC函数
-- ============================================

CREATE OR REPLACE FUNCTION vocab_app.get_or_create_review_queue(
  p_user_id UUID,
  p_review_date DATE,
  p_max_daily_reviews INTEGER DEFAULT 50,
  p_study_mode TEXT DEFAULT 'mixed',
  p_primary_word_book_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_cache vocab_app.user_review_queue_cache%ROWTYPE;
  v_queue_data JSONB;
BEGIN
  -- 1. 尝试获取现有缓存
  SELECT * INTO v_cache
  FROM vocab_app.user_review_queue_cache
  WHERE user_id = p_user_id
    AND review_date = p_review_date;

  -- 2. 如果缓存存在且参数匹配，直接返回
  IF v_cache.id IS NOT NULL 
     AND v_cache.max_daily_reviews = p_max_daily_reviews
     AND v_cache.study_mode = p_study_mode
     AND (v_cache.primary_word_book_id IS NOT DISTINCT FROM p_primary_word_book_id) THEN
    RETURN jsonb_build_object(
      'queue', v_cache.queue_data,
      'currentIndex', v_cache.current_index,
      'isNew', false
    );
  END IF;

  -- 3. 缓存不存在或参数不匹配，返回空（需要前端生成新队列）
  RETURN jsonb_build_object(
    'queue', '[]'::jsonb,
    'currentIndex', 0,
    'isNew', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 创建保存复习队列的RPC函数
-- ============================================

CREATE OR REPLACE FUNCTION vocab_app.save_review_queue(
  p_user_id UUID,
  p_review_date DATE,
  p_queue_data JSONB,
  p_current_index INTEGER DEFAULT 0,
  p_max_daily_reviews INTEGER DEFAULT 50,
  p_study_mode TEXT DEFAULT 'mixed',
  p_primary_word_book_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO vocab_app.user_review_queue_cache (
    user_id,
    review_date,
    queue_data,
    current_index,
    max_daily_reviews,
    study_mode,
    primary_word_book_id,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_review_date,
    p_queue_data,
    p_current_index,
    p_max_daily_reviews,
    p_study_mode,
    p_primary_word_book_id,
    extract(epoch from now()) * 1000,
    extract(epoch from now()) * 1000
  )
  ON CONFLICT (user_id, review_date)
  DO UPDATE SET
    queue_data = EXCLUDED.queue_data,
    current_index = EXCLUDED.current_index,
    max_daily_reviews = EXCLUDED.max_daily_reviews,
    study_mode = EXCLUDED.study_mode,
    primary_word_book_id = EXCLUDED.primary_word_book_id,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 创建更新当前进度的RPC函数
-- ============================================

CREATE OR REPLACE FUNCTION vocab_app.update_review_queue_progress(
  p_user_id UUID,
  p_review_date DATE,
  p_current_index INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE vocab_app.user_review_queue_cache
  SET 
    current_index = p_current_index,
    updated_at = extract(epoch from now()) * 1000
  WHERE user_id = p_user_id
    AND review_date = p_review_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
