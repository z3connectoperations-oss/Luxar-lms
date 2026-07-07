-- ===========================================================================
-- Luxaar LMS — Test Series demo seed (idempotent).
-- 5 Active test series (each: 1 published test + 10 MCQs) + 6 Coming Soon.
-- Prices in paise (₹1 = 100). Marks 1/question, no negative marking, pass = 40%.
-- All rows use stable IDs so Admin can edit/delete/replace them later.
-- ===========================================================================

-- ---- TEST SERIES (parents) ------------------------------------------------
INSERT OR IGNORE INTO test_series
  (id, title, slug, description_md, thumbnail_r2_key, banner_r2_key, category, difficulty, price, discount_price, validity_days, status, position, is_featured, created_at)
VALUES
  ('ts-tnpsc-ae-01', 'TNPSC AE Mock Test – 01', 'tnpsc-ae-mock-test-01', 'A full-length TNPSC AE style mock covering Tamil Nadu GK, Aptitude and Current Affairs. Timed practice with instant analysis.', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=60', 'TNPSC', 'medium', 49900, NULL, 365, 'published', 1, 1, strftime('%s','now')),
  ('ts-upsc-prelims-01', 'UPSC Prelims Mock Test – 01', 'upsc-prelims-mock-test-01', 'UPSC Prelims pattern mock across History, Geography, Polity and Economy. Sharpen accuracy under time pressure.', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=60', 'UPSC', 'hard', 59900, NULL, 365, 'published', 2, 1, strftime('%s','now')),
  ('ts-bank-aptitude', 'Banking Aptitude Mock Test', 'banking-aptitude-mock-test', 'Banking exam aptitude mock covering Quantitative Aptitude, Reasoning and English for IBPS/SBI aspirants.', 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=800&q=60', 'Banking', 'medium', 39900, NULL, 365, 'published', 3, 0, strftime('%s','now')),
  ('ts-ssc-cgl', 'SSC CGL Mock Test', 'ssc-cgl-mock-test', 'SSC CGL pattern mock spanning General Knowledge, Mathematics and English. Practice with real exam timing.', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=60', 'SSC', 'medium', 34900, NULL, 365, 'published', 4, 0, strftime('%s','now')),
  ('ts-gate-civil', 'GATE Civil Mock Test', 'gate-civil-mock-test', 'GATE Civil Engineering mock across RCC, Surveying, Soil Mechanics and Structural Engineering. Concept-focused questions.', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=60', 'Engineering', 'hard', 69900, NULL, 365, 'published', 5, 1, strftime('%s','now'));

-- Coming Soon series (no tests/questions; catalogue shows announcement badge).
INSERT OR IGNORE INTO test_series
  (id, title, slug, description_md, thumbnail_r2_key, banner_r2_key, category, difficulty, price, discount_price, validity_days, status, position, is_featured, created_at)
VALUES
  ('ts-cs-tnpsc-g2', 'TNPSC Group II Mock Test', 'tnpsc-group-ii-mock-test', 'Full-length TNPSC Group II mock series. Launching soon.', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=60', 'TNPSC', 'medium', 0, NULL, 365, 'coming_soon', 1, 0, strftime('%s','now')),
  ('ts-cs-tnpsc-g4', 'TNPSC Group IV Mock Test', 'tnpsc-group-iv-mock-test', 'TNPSC Group IV practice mocks. Launching soon.', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=60', 'TNPSC', 'easy', 0, NULL, 365, 'coming_soon', 2, 0, strftime('%s','now')),
  ('ts-cs-railway', 'Railway Recruitment Mock Test', 'railway-recruitment-mock-test', 'RRB NTPC & Group D mock series. Launching soon.', 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=60', 'Railway', 'medium', 0, NULL, 365, 'coming_soon', 3, 0, strftime('%s','now')),
  ('ts-cs-tet', 'TET Mock Test', 'tet-mock-test', 'Teacher Eligibility Test mock series. Launching soon.', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=60', 'TET', 'medium', 0, NULL, 365, 'coming_soon', 4, 0, strftime('%s','now')),
  ('ts-cs-police', 'Police Recruitment Mock Test', 'police-recruitment-mock-test', 'TNUSRB Police recruitment mock series. Launching soon.', 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=800&q=60', 'Police', 'easy', 0, NULL, 365, 'coming_soon', 5, 0, strftime('%s','now')),
  ('ts-cs-cat', 'CAT Mock Test', 'cat-mock-test', 'CAT (MBA entrance) mock series. Launching soon.', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=60', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=60', 'Management', 'hard', 0, NULL, 365, 'coming_soon', 6, 0, strftime('%s','now'));

-- ---- TESTS (one published test per active series) -------------------------
INSERT OR IGNORE INTO test_series_tests
  (id, test_series_id, title, duration_min, passing_marks, passing_pct, max_attempts, position, status)
VALUES
  ('tst-tnpsc-ae-01', 'ts-tnpsc-ae-01',     'TNPSC AE Mock Test – 01',     15, 4, 40, 3, 0, 'published'),
  ('tst-upsc-01',     'ts-upsc-prelims-01', 'UPSC Prelims Mock Test – 01', 15, 4, 40, 3, 0, 'published'),
  ('tst-bank-01',     'ts-bank-aptitude',   'Banking Aptitude Mock Test',  15, 4, 40, 3, 0, 'published'),
  ('tst-ssc-01',      'ts-ssc-cgl',         'SSC CGL Mock Test',           15, 4, 40, 3, 0, 'published'),
  ('tst-gate-01',     'ts-gate-civil',      'GATE Civil Mock Test',        20, 4, 40, 3, 0, 'published');

-- ---- QUESTIONS ------------------------------------------------------------
-- TNPSC AE Mock Test – 01
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-tnpsc-1',  'tst-tnpsc-ae-01', 'What is the capital of Tamil Nadu?', 'Madurai', 'Chennai', 'Coimbatore', 'Tiruchirappalli', 'B', 'Chennai (formerly Madras) is the capital of Tamil Nadu.', 1, 0),
  ('q-tnpsc-2',  'tst-tnpsc-ae-01', 'Which river is known as the "Ganga of the South"?', 'Vaigai', 'Palar', 'Cauvery (Kaveri)', 'Thamirabarani', 'C', 'The Cauvery is revered as the Dakshina Ganga (Ganga of the South).', 1, 1),
  ('q-tnpsc-3',  'tst-tnpsc-ae-01', 'The Nilgiri Mountain Railway, a UNESCO World Heritage site, is located in which state?', 'Kerala', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'C', 'The Nilgiri Mountain Railway runs between Mettupalayam and Ooty in Tamil Nadu.', 1, 2),
  ('q-tnpsc-4',  'tst-tnpsc-ae-01', 'If a train travels 60 km in 45 minutes, what is its speed?', '60 km/h', '75 km/h', '80 km/h', '90 km/h', 'C', '45 min = 0.75 h; 60 / 0.75 = 80 km/h.', 1, 3),
  ('q-tnpsc-5',  'tst-tnpsc-ae-01', 'The average of the first five natural numbers (1 to 5) is:', '2', '2.5', '3', '3.5', 'C', 'Sum = 15, 15 / 5 = 3.', 1, 4),
  ('q-tnpsc-6',  'tst-tnpsc-ae-01', 'What is 15% of 200?', '25', '30', '35', '40', 'B', '15/100 × 200 = 30.', 1, 5),
  ('q-tnpsc-7',  'tst-tnpsc-ae-01', 'The Brihadeeswarar Temple (Big Temple), a UNESCO site, is located in:', 'Thanjavur', 'Madurai', 'Kanchipuram', 'Rameswaram', 'A', 'The Brihadeeswarar Temple was built by Raja Raja Chola I at Thanjavur.', 1, 6),
  ('q-tnpsc-8',  'tst-tnpsc-ae-01', 'In which year was Tamil granted classical language status by the Government of India?', '2004', '2006', '2008', '2010', 'A', 'Tamil was declared a classical language in 2004.', 1, 7),
  ('q-tnpsc-9',  'tst-tnpsc-ae-01', 'If x + 7 = 12, then x = ?', '3', '4', '5', '6', 'C', 'x = 12 − 7 = 5.', 1, 8),
  ('q-tnpsc-10', 'tst-tnpsc-ae-01', 'What is the state animal of Tamil Nadu?', 'Bengal Tiger', 'Nilgiri Tahr', 'Indian Elephant', 'Gaur', 'B', 'The Nilgiri Tahr is the state animal of Tamil Nadu.', 1, 9);

-- UPSC Prelims Mock Test – 01
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-upsc-1',  'tst-upsc-01', 'How many Fundamental Rights are currently guaranteed by the Indian Constitution?', 'Five', 'Six', 'Seven', 'Eight', 'B', 'There are six Fundamental Rights after the Right to Property was removed in 1978.', 1, 0),
  ('q-upsc-2',  'tst-upsc-01', 'Who was the first Governor-General of independent India (1947–48)?', 'C. Rajagopalachari', 'Lord Mountbatten', 'Warren Hastings', 'Lord Canning', 'B', 'Lord Mountbatten was the first Governor-General of independent India; Rajagopalachari was the first Indian and last one.', 1, 1),
  ('q-upsc-3',  'tst-upsc-01', 'Which is the longest river flowing entirely within India?', 'Yamuna', 'Godavari', 'Ganga', 'Brahmaputra', 'C', 'The Ganga is the longest river within India (~2,525 km).', 1, 2),
  ('q-upsc-4',  'tst-upsc-01', 'The words "Socialist" and "Secular" were added to the Preamble by which amendment?', '42nd Amendment', '44th Amendment', '24th Amendment', '52nd Amendment', 'A', 'The 42nd Amendment Act, 1976 added Socialist, Secular and Integrity to the Preamble.', 1, 3),
  ('q-upsc-5',  'tst-upsc-01', 'In which year was the Reserve Bank of India (RBI) established?', '1935', '1947', '1949', '1950', 'A', 'The RBI was established on 1 April 1935 under the RBI Act, 1934.', 1, 4),
  ('q-upsc-6',  'tst-upsc-01', 'The Quit India Movement was launched in which year?', '1930', '1942', '1945', '1919', 'B', 'The Quit India Movement began on 8 August 1942.', 1, 5),
  ('q-upsc-7',  'tst-upsc-01', 'The Tropic of Cancer passes through how many Indian states?', 'Six', 'Seven', 'Eight', 'Nine', 'C', 'The Tropic of Cancer passes through eight Indian states.', 1, 6),
  ('q-upsc-8',  'tst-upsc-01', 'Who is the constitutional head of the Union Executive of India?', 'Prime Minister', 'President', 'Chief Justice', 'Vice President', 'B', 'The President of India is the constitutional head of the Union Executive.', 1, 7),
  ('q-upsc-9',  'tst-upsc-01', 'NITI Aayog, formed in 2015, replaced which body?', 'Finance Commission', 'Planning Commission', 'Reserve Bank', 'SEBI', 'B', 'NITI Aayog replaced the Planning Commission on 1 January 2015.', 1, 8),
  ('q-upsc-10', 'tst-upsc-01', 'The Dandi March (1930) led by Gandhi was associated with:', 'Salt Satyagraha', 'Non-Cooperation Movement', 'Khilafat Movement', 'Swadeshi Movement', 'A', 'The Dandi March launched the Salt Satyagraha against the British salt tax.', 1, 9);

-- Banking Aptitude Mock Test
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-bank-1',  'tst-bank-01', 'What is 25% of 480?', '100', '110', '120', '130', 'C', '25/100 × 480 = 120.', 1, 0),
  ('q-bank-2',  'tst-bank-01', 'Find the simple interest on ₹1000 at 5% per annum for 2 years.', '₹50', '₹100', '₹150', '₹200', 'B', 'SI = P×R×T/100 = 1000×5×2/100 = ₹100.', 1, 1),
  ('q-bank-3',  'tst-bank-01', 'What is the next number in the series 2, 4, 8, 16, __ ?', '24', '30', '32', '36', 'C', 'Each term doubles: 16 × 2 = 32.', 1, 2),
  ('q-bank-4',  'tst-bank-01', 'If today is Monday, which day will it be after 3 days?', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'B', 'Monday + 3 days = Thursday.', 1, 3),
  ('q-bank-5',  'tst-bank-01', 'Find the odd one out: Apple, Mango, Carrot, Banana.', 'Apple', 'Mango', 'Carrot', 'Banana', 'C', 'Carrot is a vegetable; the rest are fruits.', 1, 4),
  ('q-bank-6',  'tst-bank-01', 'Choose the correct synonym of "Rapid".', 'Slow', 'Quick', 'Late', 'Heavy', 'B', '"Rapid" means fast or quick.', 1, 5),
  ('q-bank-7',  'tst-bank-01', 'Choose the antonym of "Ancient".', 'Old', 'Modern', 'Historic', 'Aged', 'B', 'The opposite of ancient is modern.', 1, 6),
  ('q-bank-8',  'tst-bank-01', 'A shopkeeper sells an item at 10% profit on a cost of ₹200. What is the selling price?', '₹210', '₹220', '₹230', '₹240', 'B', 'SP = 200 + 10% of 200 = 200 + 20 = ₹220.', 1, 7),
  ('q-bank-9',  'tst-bank-01', 'Complete the series: A, C, E, G, __ ?', 'H', 'I', 'J', 'K', 'B', 'Letters skip one each time: A,C,E,G,I.', 1, 8),
  ('q-bank-10', 'tst-bank-01', 'Fill in the blank: "She ___ to school every day."', 'go', 'goes', 'going', 'gone', 'B', 'Third person singular present tense takes "goes".', 1, 9);

-- SSC CGL Mock Test
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-ssc-1',  'tst-ssc-01', 'Who wrote the national anthem of India, "Jana Gana Mana"?', 'Bankim Chandra Chatterjee', 'Rabindranath Tagore', 'Sarojini Naidu', 'Mahatma Gandhi', 'B', 'Rabindranath Tagore composed "Jana Gana Mana".', 1, 0),
  ('q-ssc-2',  'tst-ssc-01', 'What is the value of 12 × 8 ÷ 4?', '20', '24', '28', '32', 'B', '12 × 8 = 96; 96 ÷ 4 = 24.', 1, 1),
  ('q-ssc-3',  'tst-ssc-01', 'What is the square root of 144?', '11', '12', '13', '14', 'B', '12 × 12 = 144.', 1, 2),
  ('q-ssc-4',  'tst-ssc-01', 'The Great Barrier Reef is located off the coast of which country?', 'India', 'Australia', 'Brazil', 'Japan', 'B', 'The Great Barrier Reef lies off the coast of Queensland, Australia.', 1, 3),
  ('q-ssc-5',  'tst-ssc-01', 'What is the plural of "Child"?', 'Childs', 'Childes', 'Children', 'Childrens', 'C', 'The irregular plural of child is children.', 1, 4),
  ('q-ssc-6',  'tst-ssc-01', 'A rectangle has length 8 cm and width 5 cm. What is its area?', '13 cm²', '26 cm²', '40 cm²', '45 cm²', 'C', 'Area = length × width = 8 × 5 = 40 cm².', 1, 5),
  ('q-ssc-7',  'tst-ssc-01', 'How many players are there in a cricket team on the field?', 'Nine', 'Ten', 'Eleven', 'Twelve', 'C', 'A cricket team fields eleven players.', 1, 6),
  ('q-ssc-8',  'tst-ssc-01', 'Choose the correctly spelt word.', 'Recieve', 'Receive', 'Receeve', 'Receve', 'B', '"Receive" follows the "i before e except after c" rule.', 1, 7),
  ('q-ssc-9',  'tst-ssc-01', 'Express 3/4 as a percentage.', '60%', '70%', '75%', '80%', 'C', '3/4 = 0.75 = 75%.', 1, 8),
  ('q-ssc-10', 'tst-ssc-01', 'Which planet is known as the "Red Planet"?', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'B', 'Mars appears red due to iron oxide on its surface.', 1, 9);

-- GATE Civil Mock Test
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-gate-1',  'tst-gate-01', 'The characteristic compressive strength of concrete is specified at how many days of curing?', '7 days', '14 days', '28 days', '56 days', 'C', 'Characteristic strength (fck) is defined on 28-day cube tests.', 1, 0),
  ('q-gate-2',  'tst-gate-01', 'In limit state design (IS 456), the partial safety factor for concrete is:', '1.15', '1.5', '1.0', '1.25', 'B', 'γm for concrete is 1.5; for steel it is 1.15.', 1, 1),
  ('q-gate-3',  'tst-gate-01', 'The surveying operation of determining the elevation of points is called:', 'Chaining', 'Levelling', 'Ranging', 'Traversing', 'B', 'Levelling determines relative heights/elevations of points.', 1, 2),
  ('q-gate-4',  'tst-gate-01', 'The least count of a standard vernier transit theodolite is usually:', '20 seconds', '1 minute', '5 minutes', '1 degree', 'A', 'A standard vernier theodolite typically reads to 20".', 1, 3),
  ('q-gate-5',  'tst-gate-01', 'The ratio of the volume of voids to the total volume of a soil mass is called:', 'Void ratio', 'Porosity', 'Degree of saturation', 'Water content', 'B', 'Porosity n = Vv / V. Void ratio is Vv / Vs.', 1, 4),
  ('q-gate-6',  'tst-gate-01', 'Terzaghi''s one-dimensional theory deals with the process of:', 'Compaction', 'Consolidation', 'Permeability', 'Liquefaction', 'B', 'Terzaghi''s theory describes one-dimensional primary consolidation of soils.', 1, 5),
  ('q-gate-7',  'tst-gate-01', 'A simply supported beam of span L carries a central point load W. The maximum bending moment is:', 'WL/2', 'WL/4', 'WL/8', 'WL', 'B', 'For a central point load, Mmax = WL/4 at mid-span.', 1, 6),
  ('q-gate-8',  'tst-gate-01', 'The point in a beam where the bending moment changes sign (is zero) is called the:', 'Point of contraflexure', 'Neutral axis', 'Centroid', 'Shear centre', 'A', 'The point of contraflexure is where bending moment is zero and changes sign.', 1, 7),
  ('q-gate-9',  'tst-gate-01', 'In IS 456, the modulus of elasticity of concrete is 5000√fck, where fck is the:', 'Tensile strength', 'Characteristic compressive strength', 'Flexural strength', 'Yield strength', 'B', 'Ec = 5000√fck (MPa), where fck is characteristic compressive strength.', 1, 8),
  ('q-gate-10', 'tst-gate-01', 'The coefficient of permeability of soil has units of:', 'm/s', 'm²', 'kN/m³', 'dimensionless', 'A', 'Coefficient of permeability (k) has units of velocity, m/s.', 1, 9);
