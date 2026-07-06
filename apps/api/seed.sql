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
   '{"title":"Education that Inspires","subtitle":"India''s platform for RBI, SEBI & TNPSC exam prep","ctaText":"Explore Courses","ctaHref":"/courses"}', 0, 1),
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
  ('ca-2', '2026-05-01', 'monthly', 'May 2026 — Monthly Compilation', 'A roundup of the month''s key economic and banking developments relevant to RBI/SEBI/TNPSC aspirants.', 'Compilation');

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
  '{"title":"Crack India''s toughest exams with confidence","subtitle":"Structured video courses, thousands of practice questions, live classes and 1:1 mentorship — for RBI, SEBI, TNPSC, UPSC and more."}'
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

-- =====================================================================
--  TEST SERIES DEMO CONTENT (TNPSC)
-- =====================================================================
INSERT OR IGNORE INTO test_series (id, title, slug, description_md, price, discount_price, validity_days, status, position, is_featured, created_at) VALUES
  ('ts-tnpsc-1', 'TNPSC Group 4 Full Mock Test Series', 'tnpsc-group-4', 'Complete mock test series for TNPSC Group 4 aspirants covering General Tamil and General Studies.', 49900, 29900, 365, 'published', 1, 1, strftime('%s','now'));

INSERT OR IGNORE INTO test_series_tests (id, test_series_id, title, duration_min, passing_marks, passing_pct, max_attempts, position, status) VALUES
  ('ts-t-tnpsc-1', 'ts-tnpsc-1', 'TNPSC Group 4 Mock Test 1 - General Tamil', 180, 90, 30, 3, 0, 'published'),
  ('ts-t-tnpsc-2', 'ts-tnpsc-1', 'TNPSC Group 4 Mock Test 2 - General Studies', 180, 90, 30, 3, 1, 'published');

INSERT OR IGNORE INTO test_series_questions (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position) VALUES
  ('ts-q-tnpsc-1', 'ts-t-tnpsc-1', 'Which is the oldest Tamil grammar work?', 'Tolkappiyam', 'Silappatikaram', 'Manimekalai', 'Tirukkural', 'A', 'Tolkappiyam is the oldest surviving Tamil grammar text.', 1, 0),
  ('ts-q-tnpsc-2', 'ts-t-tnpsc-1', 'Who authored Tirukkural?', 'Ilango Adigal', 'Kambar', 'Thiruvalluvar', 'Avvaiyar', 'C', 'Thiruvalluvar is the author of Tirukkural.', 1, 1),
  ('ts-q-tnpsc-3', 'ts-t-tnpsc-2', 'Who was the first Chief Minister of Tamil Nadu after independence?', 'K. Kamaraj', 'O. P. Ramaswamy Reddiyar', 'C. N. Annadurai', 'C. Rajagopalachari', 'B', 'O. P. Ramaswamy Reddiyar was the first Chief Minister of Madras Presidency after independence.', 1, 0),
  ('ts-q-tnpsc-4', 'ts-t-tnpsc-2', 'Which river is known as the Ganges of South India?', 'Godavari', 'Krishna', 'Kaveri', 'Tungabhadra', 'C', 'Kaveri is often referred to as the Dakshina Ganga or Ganges of the South.', 1, 1),
  ('ts-q-tnpsc-5', 'ts-t-tnpsc-1', 'What is the total number of chapters in Tirukkural?', '100', '133', '150', '200', 'B', 'Tirukkural contains 133 chapters (Adhikarams).', 1, 2),
  ('ts-q-tnpsc-6', 'ts-t-tnpsc-1', 'Which epic is considered the twin of Silappatikaram?', 'Manimekalai', 'Valayapathi', 'Kundalakesi', 'Jivaka Chintamani', 'A', 'Manimekalai and Silappatikaram are considered twin epics in Tamil literature.', 1, 3),
  ('ts-q-tnpsc-7', 'ts-t-tnpsc-1', 'Who is the author of Manimekalai?', 'Ilango Adigal', 'Seethalai Sathanar', 'Kambar', 'Avvaiyar', 'B', 'Manimekalai was authored by Seethalai Sathanar.', 1, 4),
  ('ts-q-tnpsc-8', 'ts-t-tnpsc-1', 'What is the grammatical text "Nannūl" about?', 'Literature', 'Tamil Grammar', 'Mathematics', 'Medicine', 'B', 'Nannūl is a prominent work on Tamil grammar authored by Pavanandi Munivar.', 1, 5),
  ('ts-q-tnpsc-9', 'ts-t-tnpsc-1', 'How many poems does Purananuru contain?', '100', '200', '300', '400', 'D', 'Purananuru is an anthology of 400 poetic verses.', 1, 6),
  ('ts-q-tnpsc-10', 'ts-t-tnpsc-1', 'Which Chola king built the Brihadisvara Temple?', 'Rajendra Chola I', 'Rajaraja Chola I', 'Karikala Chola', 'Parantaka I', 'B', 'Rajaraja Chola I built the Brihadisvara Temple at Thanjavur.', 1, 7),
  ('ts-q-tnpsc-11', 'ts-t-tnpsc-1', 'Bharathidasan is a famous poet known as?', 'Puratchi Kavingnar', 'Kavimani', 'Makkal Kavingnar', 'Namakkal Kavingnar', 'A', 'Bharathidasan is hailed as Puratchi Kavingnar (Revolutionary Poet).', 1, 8),
  ('ts-q-tnpsc-12', 'ts-t-tnpsc-1', 'The Tamil months are based on?', 'Solar calendar', 'Lunar calendar', 'Lunisolar calendar', 'Gregorian calendar', 'A', 'The Tamil calendar is a sidereal solar calendar.', 1, 9),
  ('ts-q-tnpsc-13', 'ts-t-tnpsc-1', 'Which Sangam literature is a collection of love poems?', 'Akananuru', 'Purananuru', 'Pathitrupathu', 'Paripadal', 'A', 'Akananuru deals entirely with akam (inner life/love).', 1, 10),
  ('ts-q-tnpsc-14', 'ts-t-tnpsc-1', 'In Tamil grammar, how many types of thinai (landscapes) are there?', '3', '4', '5', '6', 'C', 'The five landscapes are Kurinji, Mullai, Marutham, Neithal, and Palai.', 1, 11),
  ('ts-q-tnpsc-15', 'ts-t-tnpsc-1', 'Who composed the National Anthem of India?', 'Bharathiyar', 'Rabindranath Tagore', 'Bankim Chandra', 'Subramaniya Siva', 'B', 'Rabindranath Tagore composed the National Anthem.', 1, 12),
  ('ts-q-tnpsc-16', 'ts-t-tnpsc-1', 'What was the real name of V.O. Chidambaram Pillai?', 'Vallinayagan Olaganathan Chidambaram', 'Veerapandiya Kattabomman', 'Venkataraman', 'Viswanathan', 'A', 'V.O.C stands for Vallinayagan Olaganathan Chidambaram.', 1, 13),
  ('ts-q-tnpsc-17', 'ts-t-tnpsc-1', 'Which is the classical dance form of Tamil Nadu?', 'Kathak', 'Bharatanatyam', 'Kuchipudi', 'Odissi', 'B', 'Bharatanatyam is the classical dance form originating in Tamil Nadu.', 1, 14),
  ('ts-q-tnpsc-18', 'ts-t-tnpsc-1', 'Kambar translated the Ramayana into Tamil as?', 'Kamba Ramayanam', 'Iramavataram', 'Tamil Ramayanam', 'Valmiki Ramayanam', 'B', 'Kambar originally called his work Iramavataram.', 1, 15),
  ('ts-q-tnpsc-19', 'ts-t-tnpsc-1', 'Who is known as the "Father of the Tamil Renaissance"?', 'C. W. Thamotharampillai', 'U. V. Swaminatha Iyer', 'Maraimalai Adigal', 'Arumuka Navalar', 'C', 'Maraimalai Adigal is often called the Father of the Tamil Renaissance for his Pure Tamil movement.', 1, 16),
  ('ts-q-tnpsc-20', 'ts-t-tnpsc-1', 'What does the term "Ettuthokai" refer to?', 'Eight Anthologies', 'Ten Idylls', 'Eighteen Lesser Texts', 'Five Great Epics', 'A', 'Ettuthokai translates to the Eight Anthologies in Sangam literature.', 1, 17),
  ('ts-q-tnpsc-21', 'ts-t-tnpsc-1', 'Which Tamil king defeated the Cheras and Pandyas at the Battle of Venni?', 'Rajaraja Chola', 'Karikala Chola', 'Rajendra Chola', 'Nedunjeliyan', 'B', 'Karikala Chola was victorious at the historic Battle of Venni.', 1, 18),
  ('ts-q-tnpsc-22', 'ts-t-tnpsc-1', 'Which text is part of Pathinenkilkanakku?', 'Purananuru', 'Tirukkural', 'Silappatikaram', 'Akananuru', 'B', 'Tirukkural is the most famous of the Eighteen Lesser Texts (Pathinenkilkanakku).', 1, 19),
  ('ts-q-tnpsc-23', 'ts-t-tnpsc-1', 'The ancient port city of the Cholas was?', 'Madurai', 'Kanchipuram', 'Puhar (Kaveripoompattinam)', 'Uraiyur', 'C', 'Puhar was the major port city of the Early Cholas.', 1, 20),
  ('ts-q-tnpsc-24', 'ts-t-tnpsc-1', 'Who was the first woman doctor in Tamil Nadu?', 'Dr. Muthulakshmi Reddy', 'Moovalur Ramamirtham', 'Dr. Annie Besant', 'Rukmini Devi', 'A', 'Dr. Muthulakshmi Reddy was the first woman medical practitioner in India.', 1, 21);
