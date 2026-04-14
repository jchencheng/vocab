-- =====================================================
-- 创建触发器自动维护单词书计数
-- 包含 mastered_count, learning_count, new_count
-- =====================================================

-- 1. 添加计数字段到 word_books 表
ALTER TABLE vocab_app.word_books 
ADD COLUMN IF NOT EXISTS mastered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS learning_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_count INTEGER DEFAULT 0;

-- 2. 创建触发器函数：INSERT 时增加计数
CREATE OR REPLACE FUNCTION vocab_app.increment_wordbook_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vocab_app.word_books
    SET 
        word_count = word_count + 1,
        mastered_count = CASE WHEN NEW.status = 'mastered' THEN mastered_count + 1 ELSE mastered_count END,
        learning_count = CASE WHEN NEW.status = 'learning' THEN learning_count + 1 ELSE learning_count END,
        new_count = CASE WHEN NEW.status = 'new' OR NEW.status IS NULL THEN new_count + 1 ELSE new_count END
    WHERE id = NEW.word_book_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建触发器函数：DELETE 时减少计数
CREATE OR REPLACE FUNCTION vocab_app.decrement_wordbook_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vocab_app.word_books
    SET 
        word_count = GREATEST(word_count - 1, 0),
        mastered_count = CASE WHEN OLD.status = 'mastered' THEN GREATEST(mastered_count - 1, 0) ELSE mastered_count END,
        learning_count = CASE WHEN OLD.status = 'learning' THEN GREATEST(learning_count - 1, 0) ELSE learning_count END,
        new_count = CASE WHEN OLD.status = 'new' OR OLD.status IS NULL THEN GREATEST(new_count - 1, 0) ELSE new_count END
    WHERE id = OLD.word_book_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建触发器函数：UPDATE 时调整计数
CREATE OR REPLACE FUNCTION vocab_app.update_wordbook_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果 word_book_id 变了，先减少旧书的计数
    IF OLD.word_book_id IS DISTINCT FROM NEW.word_book_id THEN
        UPDATE vocab_app.word_books
        SET 
            word_count = GREATEST(word_count - 1, 0),
            mastered_count = CASE WHEN OLD.status = 'mastered' THEN GREATEST(mastered_count - 1, 0) ELSE mastered_count END,
            learning_count = CASE WHEN OLD.status = 'learning' THEN GREATEST(learning_count - 1, 0) ELSE learning_count END,
            new_count = CASE WHEN OLD.status = 'new' OR OLD.status IS NULL THEN GREATEST(new_count - 1, 0) ELSE new_count END
        WHERE id = OLD.word_book_id;
        
        -- 增加新书的计数
        UPDATE vocab_app.word_books
        SET 
            word_count = word_count + 1,
            mastered_count = CASE WHEN NEW.status = 'mastered' THEN mastered_count + 1 ELSE mastered_count END,
            learning_count = CASE WHEN NEW.status = 'learning' THEN learning_count + 1 ELSE learning_count END,
            new_count = CASE WHEN NEW.status = 'new' OR NEW.status IS NULL THEN new_count + 1 ELSE new_count END
        WHERE id = NEW.word_book_id;
    -- 如果 status 变了，调整计数
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE vocab_app.word_books
        SET 
            mastered_count = CASE 
                WHEN OLD.status = 'mastered' THEN GREATEST(mastered_count - 1, 0)
                WHEN NEW.status = 'mastered' THEN mastered_count + 1
                ELSE mastered_count 
            END,
            learning_count = CASE 
                WHEN OLD.status = 'learning' THEN GREATEST(learning_count - 1, 0)
                WHEN NEW.status = 'learning' THEN learning_count + 1
                ELSE learning_count 
            END,
            new_count = CASE 
                WHEN OLD.status = 'new' OR OLD.status IS NULL THEN GREATEST(new_count - 1, 0)
                WHEN NEW.status = 'new' OR NEW.status IS NULL THEN new_count + 1
                ELSE new_count 
            END
        WHERE id = NEW.word_book_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 删除已存在的触发器（避免重复创建错误）
DROP TRIGGER IF EXISTS trg_increment_wordbook_count ON vocab_app.word_book_items;
DROP TRIGGER IF EXISTS trg_decrement_wordbook_count ON vocab_app.word_book_items;
DROP TRIGGER IF EXISTS trg_update_wordbook_count ON vocab_app.word_book_items;

-- 6. 创建触发器
CREATE TRIGGER trg_increment_wordbook_count
    AFTER INSERT ON vocab_app.word_book_items
    FOR EACH ROW
    EXECUTE FUNCTION vocab_app.increment_wordbook_count();

CREATE TRIGGER trg_decrement_wordbook_count
    AFTER DELETE ON vocab_app.word_book_items
    FOR EACH ROW
    EXECUTE FUNCTION vocab_app.decrement_wordbook_count();

CREATE TRIGGER trg_update_wordbook_count
    AFTER UPDATE ON vocab_app.word_book_items
    FOR EACH ROW
    EXECUTE FUNCTION vocab_app.update_wordbook_count();

-- 7. 初始化现有数据的计数
UPDATE vocab_app.word_books wb
SET 
    word_count = COALESCE(cnt.total, 0),
    mastered_count = COALESCE(cnt.mastered, 0),
    learning_count = COALESCE(cnt.learning, 0),
    new_count = COALESCE(cnt.new_words, 0)
FROM (
    SELECT 
        word_book_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'mastered') as mastered,
        COUNT(*) FILTER (WHERE status = 'learning') as learning,
        COUNT(*) FILTER (WHERE status = 'new' OR status IS NULL) as new_words
    FROM vocab_app.word_book_items
    GROUP BY word_book_id
) cnt
WHERE wb.id = cnt.word_book_id;

-- 8. 显示初始化结果
SELECT 
    name,
    word_count,
    mastered_count,
    learning_count,
    new_count
FROM vocab_app.word_books
WHERE source_type IN ('system', 'custom')
ORDER BY name;
