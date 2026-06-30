-- Phase 0 seed: a couple of exams, a published course, and landing CMS blocks.
-- Safe to re-run (INSERT OR IGNORE on fixed ids).

INSERT OR IGNORE INTO exams (id, name, slug, description) VALUES
  ('exam-rbi', 'RBI Grade B', 'rbi-grade-b', 'Reserve Bank of India Grade B Officer'),
  ('exam-sebi', 'SEBI Grade A', 'sebi-grade-a', 'Securities & Exchange Board of India Grade A');

INSERT OR IGNORE INTO courses
  (id, exam_id, title, slug, summary, status, certificate_enabled, completion_rule, min_progress_pct, created_at)
VALUES
  ('course-rbi', 'exam-rbi', 'RBI Grade B — Complete Course', 'rbi-grade-b-complete',
   'Phase 1 + Phase 2 full preparation with videos, tests and live classes.', 'published', 1, 'allLessons', 100, strftime('%s','now')),
  ('course-sebi', 'exam-sebi', 'SEBI Grade A — Foundation', 'sebi-grade-a-foundation',
   'Securities market foundation course.', 'published', 0, 'allLessons', 100, strftime('%s','now'));

INSERT OR IGNORE INTO course_variants (id, course_id, label, format, price_mrp, price_final, validity_days) VALUES
  ('var-rbi-ebook', 'course-rbi', 'With E-Books', 'ebook', 3500000, 840000, 365),
  ('var-rbi-phys', 'course-rbi', 'With Physical Books', 'physical', 4200000, 1008000, 365),
  ('var-sebi-ebook', 'course-sebi', 'With E-Books', 'ebook', 2000000, 600000, 365);

INSERT OR IGNORE INTO cms_blocks (id, key, type, data_json, position, published) VALUES
  ('cms-hero', 'hero', 'hero',
   '{"title":"Education that Inspires","subtitle":"India''s platform for RBI, SEBI & NABARD exam prep","ctaText":"Explore Courses","ctaHref":"/courses"}', 0, 1),
  ('cms-about', 'about', 'about',
   '{"heading":"Why Luxar LMS","body":"Structured video courses, mock tests, live mentorship and 24x7 doubt support."}', 1, 1),
  ('cms-featured', 'featured', 'featured',
   '{"heading":"Featured Courses","courseSlugs":["rbi-grade-b-complete","sebi-grade-a-foundation"]}', 2, 1),
  ('cms-explore-categories', 'explore_categories', 'categories',
   '[{"title":"Emerging Technologies","categories":["Artificial Intelligence","Big Data Analytics","Blockchain","Cloud Computing","Cybersecurity","Internet Of Things","Robotic Process Automation","Semiconductors","Augmented Reality & Virtual Reality","Web, Mobile Development & Marketing","3D Printing & Modeling"]},{"title":"Professional Skills","categories":["Collaboration & Team Work","Continuous Learning","Creative Problem Solving & Critical Thinking","Digital Leadership","Effective Communication","Innovation & Design Thinking","Influencing & Negotiation","Program Management","Project Management","Product Management"]},{"title":"Next-Gen Tech & Skills","categories":["Edge Computing","Green Tech","Quantum Computing","Digital Learning 101","Adobe Creativity & Gen AI","Digital Edge 101","Digital 101 Journey"]},{"title":"Industry Courses","categories":["Business Process Management","Digital Engineering","PM 101","Experiential Learning","Software Tools & Languages","Bootcamp Programs","Government Training Mocks"]}]', 3, 1);

-- ---- Sample content for testing the student / test / store flows ----------
INSERT OR IGNORE INTO modules (id, course_id, title, position) VALUES
  ('mod-rbi-1', 'course-rbi', 'Phase 1 — Quantitative Aptitude', 0);

INSERT OR IGNORE INTO lessons (id, module_id, type, title, position, stream_video_id, downloadable, is_free_preview, status) VALUES
  ('les-rbi-1', 'mod-rbi-1', 'video', 'Introduction to Quant', 0, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 0, 1, 'published'),
  ('les-rbi-2', 'mod-rbi-1', 'video', 'Number Systems', 1, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 0, 0, 'published');

INSERT OR IGNORE INTO tests (id, course_id, title, type, total_marks, duration_min, negative_marking, is_free) VALUES
  ('test-rbi-1', 'course-rbi', 'Quant — Mock Test 1', 'objective', 3, 10, 0.25, 1);

INSERT OR IGNORE INTO questions (id, test_id, type, prompt_md, options_json, correct_answer, solution_md, topic, marks, negative_marks, position) VALUES
  ('q-rbi-1', 'test-rbi-1', 'mcq', 'What is 12 × 8?', '["86","96","106","112"]', '96', '12 × 8 = 96', 'Multiplication', 1, 0.25, 0),
  ('q-rbi-2', 'test-rbi-1', 'mcq', 'What is 15% of 200?', '["20","25","30","35"]', '30', '15% of 200 = 30', 'Percentages', 1, 0.25, 1),
  ('q-rbi-3', 'test-rbi-1', 'mcq', 'Next in series: 2, 4, 8, 16, ?', '["24","30","32","36"]', '32', 'Each term doubles', 'Series', 1, 0.25, 2);

INSERT OR IGNORE INTO current_affairs_posts (id, date, kind, title, body_md, topic) VALUES
  ('ca-1', '2026-05-27', 'daily', 'RBI keeps repo rate unchanged', 'The Reserve Bank of India kept the repo rate steady at its latest MPC meeting, balancing growth and inflation concerns.', 'Economy'),
  ('ca-2', '2026-05-01', 'monthly', 'May 2026 — Monthly Compilation', 'A roundup of the month''s key economic and banking developments relevant to RBI/SEBI/NABARD aspirants.', 'Compilation');

INSERT OR IGNORE INTO products (id, type, title, slug, price, stock) VALUES
  ('prod-1', 'physical', 'RBI Grade B Phase 1 Book', 'rbi-phase-1-book', 59900, 100),
  ('prod-2', 'digital', 'SEBI Past Papers (PDF)', 'sebi-past-papers', 9900, NULL);

INSERT OR IGNORE INTO toppers (id, name, exam, year, quote_md) VALUES
  ('top-1', 'Priya Sharma', 'RBI Grade B', 2025, 'Luxar LMS mock tests were exactly like the real exam!'),
  ('top-2', 'Arjun Mehta', 'SEBI Grade A', 2025, 'The structured videos and 1:1 mentorship made all the difference.');

-- =====================================================================
--  DEMO CONTENT — many courses with images, exams, toppers (client demo)
-- =====================================================================

-- Reset the hero block to clean copy (in case it was edited during testing).
UPDATE cms_blocks SET data_json =
  '{"title":"Crack India''s toughest exams with confidence","subtitle":"Structured video courses, thousands of practice questions, live classes and 1:1 mentorship — for RBI, SEBI, NABARD, UPSC and more."}'
  WHERE key = 'hero';

-- Cover images for the two original courses
UPDATE courses SET thumbnail_r2_key = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=60' WHERE id = 'course-rbi';
UPDATE courses SET thumbnail_r2_key = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=60' WHERE id = 'course-sebi';

INSERT OR IGNORE INTO exams (id, name, slug, description) VALUES
  ('exam-nabard', 'NABARD Grade A', 'nabard-grade-a', 'National Bank for Agriculture & Rural Development'),
  ('exam-upsc', 'UPSC CSE', 'upsc-cse', 'Civil Services Examination'),
  ('exam-ssc', 'SSC CGL', 'ssc-cgl', 'Staff Selection Commission'),
  ('exam-ugcnet', 'UGC NET', 'ugc-net', 'National Eligibility Test'),
  ('exam-irdai', 'IRDAI', 'irdai', 'Insurance Regulatory & Development Authority'),
  ('exam-banking', 'Banking (JAIIB/CAIIB)', 'banking', 'Banking promotion exams');

INSERT OR IGNORE INTO courses (id, exam_id, title, slug, summary, status, certificate_enabled, completion_rule, min_progress_pct, thumbnail_r2_key, created_at) VALUES
  ('c-nabard', 'exam-nabard', 'NABARD Grade A — Complete Course', 'nabard-grade-a-complete', 'Phase 1 + Phase 2 with ESI, ARD, and economic & social issues coverage.', 'published', 1, 'allLessons', 100, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-rbiasst', 'exam-rbi', 'RBI Assistant — Prelims + Mains', 'rbi-assistant', 'Complete prep for RBI Assistant with sectional tests and full mocks.', 'published', 1, 'allLessons', 100, 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-upsc', 'exam-upsc', 'UPSC CSE — Foundation 2026', 'upsc-cse-foundation', 'NCERT-based foundation across Polity, History, Economics and Geography.', 'published', 1, 'allLessons', 100, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-ssc', 'exam-ssc', 'SSC CGL — Tier 1 & 2', 'ssc-cgl-complete', 'Quant, Reasoning, English and GK with daily practice and mocks.', 'published', 1, 'allLessons', 100, 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-ugcnet', 'exam-ugcnet', 'UGC NET — Paper 1 (Teaching & Research)', 'ugc-net-paper-1', 'Master Paper 1 with concept videos and previous-year analysis.', 'published', 0, 'allLessons', 100, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-irdai', 'exam-irdai', 'IRDAI Assistant Manager', 'irdai-assistant-manager', 'Insurance, finance and management for the IRDAI AM exam.', 'published', 0, 'allLessons', 100, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-jaiib', 'exam-banking', 'JAIIB — Crash Course', 'jaiib-crash-course', 'Fast-track JAIIB prep covering all 4 papers. Free to start.', 'published', 0, 'allLessons', 100, 'https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-bankaware', 'exam-banking', 'Banking & Financial Awareness', 'banking-awareness', 'Stay exam-ready with curated banking, economy and financial awareness.', 'published', 0, 'allLessons', 100, 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-quant', 'exam-ssc', 'Quantitative Aptitude Masterclass', 'quant-masterclass', 'From basics to advanced shortcuts for every competitive exam.', 'published', 1, 'allLessons', 100, 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=60', strftime('%s','now')),
  ('c-english', 'exam-ssc', 'English for Competitive Exams', 'english-competitive', 'Grammar, vocabulary and comprehension with daily drills. Free.', 'published', 0, 'allLessons', 100, 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=60', strftime('%s','now'));

INSERT OR IGNORE INTO course_variants (id, course_id, label, format, price_mrp, price_final, validity_days) VALUES
  ('v-nabard', 'c-nabard', 'Full Access', 'ebook', 3000000, 799000, 365),
  ('v-rbiasst', 'c-rbiasst', 'Full Access', 'ebook', 1500000, 499000, 365),
  ('v-upsc', 'c-upsc', 'Full Access', 'ebook', 4000000, 1299000, 365),
  ('v-ssc', 'c-ssc', 'Full Access', 'ebook', 1200000, 399000, 365),
  ('v-ugcnet', 'c-ugcnet', 'Full Access', 'ebook', 900000, 299000, 365),
  ('v-irdai', 'c-irdai', 'Full Access', 'ebook', 1800000, 599000, 365),
  ('v-jaiib', 'c-jaiib', 'Free', 'ebook', 0, 0, 180),
  ('v-bankaware', 'c-bankaware', 'Free', 'ebook', 0, 0, 180),
  ('v-quant', 'c-quant', 'Full Access', 'ebook', 700000, 249000, 365),
  ('v-english', 'c-english', 'Free', 'ebook', 0, 0, 180);

INSERT OR IGNORE INTO toppers (id, name, exam, year, quote_md) VALUES
  ('top-3', 'Sneha Reddy', 'NABARD Grade A', 2025, 'The ARD notes and weekly mentorship were game-changers.'),
  ('top-4', 'Rahul Verma', 'SSC CGL', 2024, 'Cleared Tier 1 in my first attempt thanks to the daily mocks.'),
  ('top-5', 'Aisha Khan', 'UPSC CSE', 2024, 'Loved the NCERT-first approach — concepts finally clicked.'),
  ('top-6', 'Vikram Singh', 'RBI Assistant', 2025, 'Sectional tests built the speed I needed for prelims.');

INSERT OR IGNORE INTO current_affairs_posts (id, date, kind, title, body_md, topic) VALUES
  ('ca-3', '2026-05-26', 'daily', 'Govt launches new MSME credit scheme', 'A new collateral-free credit guarantee scheme for MSMEs was announced to boost small-business lending.', 'Economy'),
  ('ca-4', '2026-05-25', 'daily', 'SEBI tightens disclosure norms for IPOs', 'Market regulator SEBI introduced stricter disclosure requirements for upcoming public issues.', 'Markets');
