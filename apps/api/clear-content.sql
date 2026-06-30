-- Wipe all course-catalog content + dependent rows so data can be entered manually.
-- Preserves: users, sessions, notification_prefs, cms_blocks, marketing tables.
-- Deletes children before parents to satisfy foreign keys.

-- Test engine
DELETE FROM attempt_answers;
DELETE FROM descriptive_submissions;
DELETE FROM test_attempts;
DELETE FROM questions;
DELETE FROM tests;

-- Progress / certificates
DELETE FROM lesson_progress;
DELETE FROM certificates;

-- Commerce
DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM enrollments;

-- Live classes
DELETE FROM live_participants;
DELETE FROM live_sessions;

-- Engagement tied to courses
DELETE FROM forum_posts;
DELETE FROM forum_threads;
DELETE FROM announcements;
DELETE FROM schedule_events;

-- Curriculum
DELETE FROM lessons;
DELETE FROM modules;
DELETE FROM materials;

-- Course config
DELETE FROM course_variants;
DELETE FROM course_trainers;
DELETE FROM coupons;

-- Catalog
DELETE FROM courses;
DELETE FROM exams;
DELETE FROM categories;
