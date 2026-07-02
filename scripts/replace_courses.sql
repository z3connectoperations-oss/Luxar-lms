-- Disable foreign keys for safe deletion
PRAGMA foreign_keys = OFF;

-- Delete old content
DELETE FROM attempt_answers;
DELETE FROM test_attempts;
DELETE FROM questions;
DELETE FROM tests;
DELETE FROM lesson_progress;
DELETE FROM lessons;
DELETE FROM modules;
DELETE FROM course_variants;
DELETE FROM enrollments;
DELETE FROM courses;
DELETE FROM exams;

PRAGMA foreign_keys = ON;

-- Insert new exams
INSERT INTO exams (id, name, slug, description) VALUES
  ('e-tnpsc', 'TNPSC AE Civil', 'tnpsc-ae-civil', 'TNPSC Assistant Engineer (Civil)'),
  ('e-upsc', 'UPSC', 'upsc', 'UPSC Civil Services'),
  ('e-banking', 'Banking', 'banking', 'Banking Exams'),
  ('e-gate', 'Gate (Civil)', 'gate-civil', 'GATE Civil Engineering'),
  ('e-neet', 'Neet', 'neet', 'NEET UG Exam');

-- Insert new courses
INSERT INTO courses (id, exam_id, title, slug, summary, status, price, discount_price, certificate_enabled, completion_rule, min_progress_pct, created_at) VALUES
  ('c-tnpsc', 'e-tnpsc', 'TNPSC AE Civil', 'tnpsc-ae-civil', 'Complete preparation for TNPSC AE Civil.', 'published', 400000, 249900, 1, 'allLessons', 100, strftime('%s','now')),
  ('c-upsc', 'e-upsc', 'UPSC CSE', 'upsc', 'Comprehensive UPSC foundation.', 'published', 1200000, 800000, 1, 'allLessons', 100, strftime('%s','now')),
  ('c-banking', 'e-banking', 'Banking Exams Prep', 'banking', 'Preparation for all banking exams.', 'published', 250000, 150000, 1, 'allLessons', 100, strftime('%s','now')),
  ('c-gate', 'e-gate', 'GATE (Civil)', 'gate-civil', 'GATE Civil Engineering Masterclass.', 'published', 800000, 499900, 1, 'allLessons', 100, strftime('%s','now')),
  ('c-neet', 'e-neet', 'NEET Target', 'neet', 'NEET target course with mock tests.', 'published', 700000, 450000, 1, 'allLessons', 100, strftime('%s','now'));

-- Insert course variants
INSERT INTO course_variants (id, course_id, label, format, price_mrp, price_final, validity_days) VALUES
  ('v-tnpsc', 'c-tnpsc', 'Full Access', 'ebook', 400000, 249900, 365),
  ('v-upsc', 'c-upsc', 'Full Access', 'ebook', 1200000, 800000, 365),
  ('v-banking', 'c-banking', 'Full Access', 'ebook', 250000, 150000, 365),
  ('v-gate', 'c-gate', 'Full Access', 'ebook', 800000, 499900, 365),
  ('v-neet', 'c-neet', 'Full Access', 'ebook', 700000, 450000, 365);

-- Update featured courses in cms_blocks
UPDATE cms_blocks 
SET data_json = '{"heading":"Featured Courses","courseSlugs":["tnpsc-ae-civil","upsc","banking","gate-civil"]}'
WHERE key = 'featured';
