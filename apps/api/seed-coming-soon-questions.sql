-- ===========================================================================
-- Populate the 6 "Coming Soon" test series with a demo test + 5 MCQs each,
-- so none appear empty inside. Series status stays 'coming_soon' (catalogue
-- keeps the Coming Soon badge; not enrollable). Idempotent (stable IDs).
-- ===========================================================================

-- ---- one published test per coming-soon series ----------------------------
INSERT OR IGNORE INTO test_series_tests
  (id, test_series_id, title, duration_min, passing_marks, passing_pct, max_attempts, position, status)
VALUES
  ('tst-cs-tnpsc-g2', 'ts-cs-tnpsc-g2', 'TNPSC Group II - Demo Test',   15, 2, 40, 3, 0, 'published'),
  ('tst-cs-tnpsc-g4', 'ts-cs-tnpsc-g4', 'TNPSC Group IV - Demo Test',   15, 2, 40, 3, 0, 'published'),
  ('tst-cs-railway',  'ts-cs-railway',  'Railway Recruitment - Demo Test', 15, 2, 40, 3, 0, 'published'),
  ('tst-cs-tet',      'ts-cs-tet',      'TET - Demo Test',              15, 2, 40, 3, 0, 'published'),
  ('tst-cs-police',   'ts-cs-police',   'Police Recruitment - Demo Test', 15, 2, 40, 3, 0, 'published'),
  ('tst-cs-cat',      'ts-cs-cat',      'CAT - Demo Test',              15, 2, 40, 3, 0, 'published');

-- ---- TNPSC Group II ------------------------------------------------------
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-cs-g2-1', 'tst-cs-tnpsc-g2', 'Which city is known as the "Manchester of South India"?', 'Chennai', 'Coimbatore', 'Madurai', 'Salem', 'B', 'Coimbatore is called the Manchester of South India for its textile industry.', 1, 0),
  ('q-cs-g2-2', 'tst-cs-tnpsc-g2', 'The Meenakshi Amman Temple is located in which city?', 'Madurai', 'Thanjavur', 'Chennai', 'Salem', 'A', 'The Meenakshi Amman Temple is in Madurai, Tamil Nadu.', 1, 1),
  ('q-cs-g2-3', 'tst-cs-tnpsc-g2', 'What is 20% of 150?', '25', '30', '35', '40', 'B', '20/100 x 150 = 30.', 1, 2),
  ('q-cs-g2-4', 'tst-cs-tnpsc-g2', 'How many elected members are there in the Tamil Nadu Legislative Assembly?', '234', '200', '250', '224', 'A', 'The Tamil Nadu Legislative Assembly has 234 elected members.', 1, 3),
  ('q-cs-g2-5', 'tst-cs-tnpsc-g2', 'If the average of 4 numbers is 25, what is their sum?', '75', '100', '125', '50', 'B', 'Sum = average x count = 25 x 4 = 100.', 1, 4);

-- ---- TNPSC Group IV ------------------------------------------------------
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-cs-g4-1', 'tst-cs-tnpsc-g4', 'Which is the longest river in Tamil Nadu?', 'Vaigai', 'Cauvery', 'Palar', 'Thamirabarani', 'B', 'The Cauvery is the longest river flowing through Tamil Nadu.', 1, 0),
  ('q-cs-g4-2', 'tst-cs-tnpsc-g4', 'The Tamil New Year begins in which Tamil month?', 'Thai', 'Chithirai', 'Aadi', 'Maasi', 'B', 'The Tamil New Year (Puthandu) begins in the month of Chithirai.', 1, 1),
  ('q-cs-g4-3', 'tst-cs-tnpsc-g4', 'Evaluate: 12 + 8 x 2', '40', '28', '20', '32', 'B', 'By order of operations: 8 x 2 = 16, then 12 + 16 = 28.', 1, 2),
  ('q-cs-g4-4', 'tst-cs-tnpsc-g4', 'Who wrote the "Thirukkural"?', 'Kambar', 'Bharathiyar', 'Thiruvalluvar', 'Avvaiyar', 'C', 'The Thirukkural was written by the poet Thiruvalluvar.', 1, 3),
  ('q-cs-g4-5', 'tst-cs-tnpsc-g4', 'What is the smallest prime number?', '0', '1', '2', '3', 'C', '2 is the smallest and only even prime number.', 1, 4);

-- ---- Railway Recruitment -------------------------------------------------
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-cs-rly-1', 'tst-cs-railway', 'What is the chemical formula for water?', 'HO', 'H2O', 'CO2', 'O2', 'B', 'Water is made of two hydrogen atoms and one oxygen atom: H2O.', 1, 0),
  ('q-cs-rly-2', 'tst-cs-railway', 'Which organelle is known as the "powerhouse of the cell"?', 'Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body', 'C', 'Mitochondria produce energy (ATP) and are called the powerhouse of the cell.', 1, 1),
  ('q-cs-rly-3', 'tst-cs-railway', 'The speed of light in vacuum is approximately:', '3 x 10^8 m/s', '3 x 10^6 m/s', '3 x 10^5 m/s', '3 x 10^10 m/s', 'A', 'Light travels at about 3 x 10^8 metres per second in vacuum.', 1, 2),
  ('q-cs-rly-4', 'tst-cs-railway', 'A train covers 120 km in 2 hours. What is its average speed?', '40 km/h', '50 km/h', '60 km/h', '80 km/h', 'C', 'Speed = distance / time = 120 / 2 = 60 km/h.', 1, 3),
  ('q-cs-rly-5', 'tst-cs-railway', 'Find the next term: 5, 10, 15, 20, __', '22', '25', '30', '35', 'B', 'The series increases by 5 each time: 20 + 5 = 25.', 1, 4);

-- ---- TET -----------------------------------------------------------------
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-cs-tet-1', 'tst-cs-tet', 'The theory of cognitive development in children was proposed by:', 'Jean Piaget', 'Sigmund Freud', 'B. F. Skinner', 'Ivan Pavlov', 'A', 'Jean Piaget proposed the theory of cognitive development.', 1, 0),
  ('q-cs-tet-2', 'tst-cs-tet', 'At which Piagetian stage does a child learn best through concrete objects?', 'Sensorimotor', 'Preoperational', 'Concrete operational', 'Formal operational', 'C', 'In the concrete operational stage children reason logically about concrete objects.', 1, 1),
  ('q-cs-tet-3', 'tst-cs-tet', 'What is the full form of TET?', 'Teacher Eligibility Test', 'Teaching Excellence Test', 'Trained Educator Test', 'Teacher Education Training', 'A', 'TET stands for Teacher Eligibility Test.', 1, 2),
  ('q-cs-tet-4', 'tst-cs-tet', 'Evaluate: 3/5 + 1/5', '4/5', '4/10', '2/5', '1', 'A', 'With a common denominator: 3/5 + 1/5 = 4/5.', 1, 3),
  ('q-cs-tet-5', 'tst-cs-tet', 'Choose the correct plural of "Leaf".', 'Leafs', 'Leaves', 'Leafes', 'Leavs', 'B', 'The plural of leaf is leaves.', 1, 4);

-- ---- Police Recruitment --------------------------------------------------
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-cs-pol-1', 'tst-cs-police', 'What is the emergency police helpline number in India?', '100', '101', '102', '108', 'A', '100 is the emergency police helpline number in India.', 1, 0),
  ('q-cs-pol-2', 'tst-cs-police', 'Who is the head of police in a district?', 'Superintendent of Police (SP)', 'Director General of Police', 'Constable', 'Sub-Inspector', 'A', 'A district police force is headed by the Superintendent of Police (SP).', 1, 1),
  ('q-cs-pol-3', 'tst-cs-police', 'Find the odd one out: Knife, Gun, Sword, Book', 'Knife', 'Gun', 'Sword', 'Book', 'D', 'Knife, gun and sword are weapons; book is not.', 1, 2),
  ('q-cs-pol-4', 'tst-cs-police', 'What is 15 x 4?', '45', '60', '75', '50', 'B', '15 x 4 = 60.', 1, 3),
  ('q-cs-pol-5', 'tst-cs-police', 'If A=1, B=2, C=3, what is A + B + C?', '5', '6', '7', '9', 'B', '1 + 2 + 3 = 6.', 1, 4);

-- ---- CAT -----------------------------------------------------------------
INSERT OR IGNORE INTO test_series_questions
  (id, test_id, prompt, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, position)
VALUES
  ('q-cs-cat-1', 'tst-cs-cat', 'If x squared = 49, then x = ?', '±5', '±6', '±7', '±8', 'C', 'The square roots of 49 are +7 and -7.', 1, 0),
  ('q-cs-cat-2', 'tst-cs-cat', 'Choose the synonym of "Ubiquitous".', 'Rare', 'Omnipresent', 'Hidden', 'Ancient', 'B', 'Ubiquitous means present everywhere (omnipresent).', 1, 1),
  ('q-cs-cat-3', 'tst-cs-cat', 'A shop offers a 20% discount on an item priced ₹500. What is the final price?', '₹380', '₹400', '₹420', '₹450', 'B', '20% of 500 = 100; 500 - 100 = ₹400.', 1, 2),
  ('q-cs-cat-4', 'tst-cs-cat', 'Complete the series: 2, 6, 12, 20, __', '28', '30', '32', '36', 'B', 'The pattern is n(n+1): 4x5 = 20, 5x6 = 30.', 1, 3),
  ('q-cs-cat-5', 'tst-cs-cat', 'Choose the antonym of "Benevolent".', 'Kind', 'Generous', 'Malevolent', 'Cheerful', 'C', 'Benevolent means kind; its antonym is malevolent (evil-intentioned).', 1, 4);
