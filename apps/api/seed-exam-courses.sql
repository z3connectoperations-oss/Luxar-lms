-- Seed: 5 competitive government-exam courses (idempotent).
-- Uses the current catalog model: categories + courses(status='active') + course_variants.
-- Prices are in paise (₹1 = 100 paise).

-- Category shown as the catalogue filter chip.
INSERT OR IGNORE INTO categories (id, name, slug, description, thumbnail_r2_key, status, position) VALUES
  ('cat-govexam', 'Competitive Exams', 'competitive-exams', 'Preparation for government & bank recruitment exams — TNPSC, SSC, RRB, IBPS/SBI and Police.', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=60', 'published', 6);

-- Courses (status = 'active' so they appear in the public catalogue).
-- NOTE: `position` is intentionally omitted — the production DB has not yet run the
-- migration that adds courses.position; it defaults server-side. Ordering falls back to created_at.
INSERT OR IGNORE INTO courses
  (id, category_id, title, slug, summary, description_md, thumbnail_r2_key, level, tags, duration_days, price, discount_price, downloadable_enabled, certificate_enabled, live_classes_enabled, status, completion_rule, min_progress_pct, created_at)
VALUES
  ('course-tnpsc',  'cat-govexam', 'TNPSC Group Exams',       'tnpsc-group-exams',       'Complete prep for TNPSC Group 1, 2, 2A & 4.',            'Full coverage of General Studies, Tamil, Aptitude and current affairs for TNPSC Group 1, 2, 2A and 4 exams, with sectional tests and full-length mocks.', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=60', 'beginner',     'TNPSC,GK,Tamil', 365, 499900, 299900, 1, 1, 1, 'active', 'allLessons', 100, strftime('%s','now')),
  ('course-ssc',    'cat-govexam', 'SSC CGL & CHSL',          'ssc-cgl-chsl',            'Crack SSC CGL, CHSL, MTS & GD with structured prep.',    'Quantitative Aptitude, Reasoning, English and General Awareness for all SSC exams, including tier-wise strategy, previous-year papers and daily practice.', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=60', 'intermediate', 'SSC,CGL,CHSL',   365, 399900, 249900, 1, 1, 1, 'active', 'allLessons', 100, strftime('%s','now')),
  ('course-rrb',    'cat-govexam', 'RRB Railway Exams',       'rrb-railway-exams',       'Prepare for RRB NTPC, Group D & ALP.',                   'Comprehensive preparation for RRB NTPC, Group D and ALP covering Maths, Reasoning, General Science and General Awareness with CBT-pattern mock tests.', 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=60', 'beginner',     'RRB,Railway,NTPC', 365, 349900, 199900, 1, 1, 1, 'active', 'allLessons', 100, strftime('%s','now')),
  ('course-bank',   'cat-govexam', 'Bank Exams (IBPS & SBI)', 'bank-exams-ibps-sbi',     'PO & Clerk prep for IBPS, SBI and RBI.',                 'End-to-end preparation for IBPS PO/Clerk, SBI PO/Clerk and RBI exams — Quant, Reasoning, English, Banking Awareness plus prelims & mains mock tests.', 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=800&q=60', 'intermediate', 'Bank,IBPS,SBI',  365, 449900, 279900, 1, 1, 1, 'active', 'allLessons', 100, strftime('%s','now')),
  ('course-police', 'cat-govexam', 'TNUSRB Police Exam',      'tnusrb-police-exam',      'Prep for TN Police Constable & SI recruitment.',         'Focused preparation for TNUSRB Police Constable and Sub-Inspector recruitment — General Knowledge, Psychology, Aptitude and Tamil, with physical-test guidance.', 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=800&q=60', 'beginner',   'Police,TNUSRB,GK', 365, 299900, 179900, 1, 1, 1, 'active', 'allLessons', 100, strftime('%s','now'));

-- Purchasable variants (checkout is driven by course_variants). Amounts mirror the course price/discount.
INSERT OR IGNORE INTO course_variants (id, course_id, label, format, price_mrp, price_final, validity_days) VALUES
  ('var-tnpsc',  'course-tnpsc',  'Full Access', 'ebook', 499900, 299900, 365),
  ('var-ssc',    'course-ssc',    'Full Access', 'ebook', 399900, 249900, 365),
  ('var-rrb',    'course-rrb',    'Full Access', 'ebook', 349900, 199900, 365),
  ('var-bank',   'course-bank',   'Full Access', 'ebook', 449900, 279900, 365),
  ('var-police', 'course-police', 'Full Access', 'ebook', 299900, 179900, 365);
