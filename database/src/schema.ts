import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ---- shared column helpers -------------------------------------------------
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date());
const bool = (name: string) => integer(name, { mode: "boolean" });
const ts = (name: string) => integer(name, { mode: "timestamp" });

// ===========================================================================
// AUTH & USERS
// ===========================================================================
export const users = sqliteTable("users", {
  id: id(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("student"), // student | trainer | admin
  avatarR2Key: text("avatar_r2_key"),
  locale: text("locale").default("en"),
  status: text("status").notNull().default("active"), // active | suspended
  createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: ts("expires_at").notNull(),
  createdAt: createdAt(),
});

export const auditLog = sqliteTable("audit_log", {
  id: id(),
  actorId: text("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  metaJson: text("meta_json"),
  createdAt: createdAt(),
});

// ===========================================================================
// CATALOG & CONTENT
// ===========================================================================
// Course categories (e.g. Artificial Intelligence, Web Development, Cyber Security).
export const categories = sqliteTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  thumbnailR2Key: text("thumbnail_r2_key"),
  status: text("status").notNull().default("published"), // draft | published
  position: integer("position").default(0),
  createdAt: createdAt(),
});

// Legacy (exam-prep). Kept for backward compatibility; new model uses categories.
export const exams = sqliteTable("exams", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
});

export const courses = sqliteTable("courses", {
  id: id(),
  categoryId: text("category_id").references(() => categories.id),
  trainerId: text("trainer_id").references(() => users.id), // assigned mentor
  examId: text("exam_id").references(() => exams.id), // legacy, optional
  // Package/bundle support: a package course bundles several sub-courses.
  isPackage: bool("is_package").default(false), // true = this course is a package
  parentCourseId: text("parent_course_id"), // set on a sub-course → its package (self-ref, no FK)
  includesTestSeries: bool("includes_test_series").default(false), // package bundles test series too
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  descriptionMd: text("description_md"),
  thumbnailR2Key: text("thumbnail_r2_key"),
  bannerR2Key: text("banner_r2_key"),
  introVideo: text("intro_video"), // Stream id or URL
  introPdfR2Key: text("intro_pdf_r2_key"), // downloadable course-intro PDF (public)
  level: text("level"), // beginner | intermediate | advanced
  tags: text("tags"), // comma-separated
  durationDays: integer("duration_days").default(365),
  price: integer("price").default(0), // paise
  discountPrice: integer("discount_price"), // paise (optional)
  enrollmentLimit: integer("enrollment_limit"),
  downloadableEnabled: bool("downloadable_enabled").default(true),
  liveClassesEnabled: bool("live_classes_enabled").default(true),
  status: text("status").notNull().default("draft"), // draft | active | coming_soon | hidden
  position: integer("position").default(0),
  ratingAvg: real("rating_avg").default(0),
  certificateEnabled: bool("certificate_enabled").default(false),
  completionRule: text("completion_rule").default("allLessons"), // allLessons | finalTestPass | pathway
  minProgressPct: integer("min_progress_pct").default(100),
  finalTestId: text("final_test_id"),
  mockTestId: text("mock_test_id"), // pathway: practice/mock assessment
  // Per-student exam scheduling: assessments open near the END of each student's
  // enrollment period (purchaseDate→expiryDate). Open date is computed per student.
  mockOpensBeforeEndDays: integer("mock_opens_before_end_days").default(30), // opens this many days before expiry
  mockWindowDays: integer("mock_window_days").default(7), // stays open this many days
  finalOpensBeforeEndDays: integer("final_opens_before_end_days").default(15),
  finalWindowDays: integer("final_window_days").default(7),
  createdAt: createdAt(),
});

export const courseVariants = sqliteTable("course_variants", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  label: text("label").notNull(),
  format: text("format").notNull().default("ebook"), // ebook | physical
  priceMrp: integer("price_mrp").notNull(),
  priceFinal: integer("price_final").notNull(),
  validityDays: integer("validity_days").notNull().default(365),
});

export const courseTrainers = sqliteTable("course_trainers", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => users.id),
});

export const coupons = sqliteTable("coupons", {
  id: id(),
  code: text("code").notNull().unique(),
  percentOff: integer("percent_off").notNull(),
  courseId: text("course_id").references(() => courses.id),
  maxRedemptions: integer("max_redemptions"),
  redeemed: integer("redeemed").default(0),
  expiresAt: ts("expires_at"),
  active: bool("active").default(true),
});

// Subject (Section) — the grouping layer between a course and its modules.
// Course → Subject → Module → Lesson. Modules keep courseId for backward
// compatibility; subjectId groups them (null = legacy/ungrouped).
export const subjects = sqliteTable("subjects", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  status: text("status").notNull().default("published"), // published | draft
});

export const modules = sqliteTable("modules", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  subjectId: text("subject_id"), // → subjects.id (null = not yet grouped)
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
});

export const lessons = sqliteTable("lessons", {
  id: id(),
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id),
  type: text("type").notNull().default("video"), // video | pdf | note | assignment | quiz | live
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  durationSec: integer("duration_sec"),
  streamVideoId: text("stream_video_id"),
  r2Key: text("r2_key"),
  downloadable: bool("downloadable").default(false),
  isFreePreview: bool("is_free_preview").default(false),
  status: text("status").notNull().default("draft"),
  uploadedBy: text("uploaded_by").references(() => users.id),
});

export const materials = sqliteTable("materials", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("pdf"), // pdf | doc | link
  r2Key: text("r2_key"),
  url: text("url"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: createdAt(),
});

export const cmsBlocks = sqliteTable("cms_blocks", {
  id: id(),
  key: text("key").notNull().unique(),
  type: text("type").notNull(), // hero | about | featured | toppers | faq | footer
  dataJson: text("data_json").notNull().default("{}"),
  position: integer("position").notNull().default(0),
  published: bool("published").default(false),
});

// ===========================================================================
// ENROLLMENT & COMMERCE
// ===========================================================================
export const enrollments = sqliteTable("enrollments", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  variantId: text("variant_id").references(() => courseVariants.id),
  purchaseDate: createdAt(),
  expiryDate: ts("expiry_date"),
  progressPct: integer("progress_pct").default(0),
});

export const orders = sqliteTable("orders", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("created"), // created | paid | failed | refunded
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  couponId: text("coupon_id").references(() => coupons.id),
  createdAt: createdAt(),

  // PhonePe / Enterprise Payment Fields
  paymentProvider: text("payment_provider"), // 'phonepe'
  merchantTransactionId: text("merchant_transaction_id").unique(),
  phonepeTransactionId: text("phonepe_transaction_id"),
  paymentStatus: text("payment_status").default("PENDING"), // PENDING, INITIATED, PROCESSING, SUCCESS, FAILED, CANCELLED, EXPIRED, REFUNDED
  paymentResponseJson: text("payment_response_json"),
  paymentCompletedAt: ts("payment_completed_at"),
  paymentFailedReason: text("payment_failed_reason"),
  paymentVerified: bool("payment_verified").default(false),
  webhookReceived: bool("webhook_received").default(false),

  // Refund Fields
  refundStatus: text("refund_status"),
  refundAmount: integer("refund_amount"),
  refundReference: text("refund_reference"),
  refundReason: text("refund_reason"),
});

export const paymentLogs = sqliteTable("payment_logs", {
  id: id(),
  orderId: text("order_id").references(() => orders.id),
  merchantTransactionId: text("merchant_transaction_id"),
  provider: text("provider"),
  event: text("event").notNull(),
  requestPayload: text("request_payload"),
  responsePayload: text("response_payload"),
  status: text("status"),
  ipAddress: text("ip_address"),
  createdAt: createdAt(),
});

export const invoices = sqliteTable("invoices", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id),
  userId: text("user_id").notNull().references(() => users.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: integer("amount").notNull(),
  businessDetails: text("business_details"),
  pdfR2Key: text("pdf_r2_key"),
  createdAt: createdAt(),
});

export const orderItems = sqliteTable("order_items", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  kind: text("kind").notNull().default("course"), // course | product
  courseVariantId: text("course_variant_id").references(() => courseVariants.id),
  productId: text("product_id"),
  qty: integer("qty").notNull().default(1),
  price: integer("price").notNull().default(0),
});

export const payments = sqliteTable("payments", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  signature: text("signature"),
  status: text("status").notNull().default("created"),
  amount: integer("amount").notNull().default(0),
  createdAt: createdAt(),
});

export const shippingAddresses = sqliteTable("shipping_addresses", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
});

// ===========================================================================
// LEARNING, TESTS & CERTIFICATES
// ===========================================================================
export const lessonProgress = sqliteTable("lesson_progress", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id),
  completed: bool("completed").default(false),
  lastPositionSec: integer("last_position_sec").default(0),
  watchedSec: integer("watched_sec").default(0), // forward-play seconds (skip-resistant completion)
  updatedAt: ts("updated_at").$defaultFn(() => new Date()),
});

export const certificates = sqliteTable("certificates", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  enrollmentId: text("enrollment_id").references(() => enrollments.id),
  certificateNo: text("certificate_no").notNull().unique(),
  verifyCode: text("verify_code").notNull().unique(),
  issuedAt: createdAt(),
  pdfR2Key: text("pdf_r2_key"),
  status: text("status").notNull().default("issued"), // issued | revoked
});

export const tests = sqliteTable("tests", {
  id: id(),
  courseId: text("course_id").references(() => courses.id),
  title: text("title").notNull(),
  type: text("type").notNull().default("objective"), // objective | descriptive
  totalMarks: integer("total_marks").default(0),
  durationMin: integer("duration_min").default(0),
  negativeMarking: real("negative_marking").default(0),
  isFree: bool("is_free").default(false),
  evalCap: integer("eval_cap"),
});

export const questions = sqliteTable("questions", {
  id: id(),
  testId: text("test_id")
    .notNull()
    .references(() => tests.id),
  type: text("type").notNull().default("mcq"), // mcq | descriptive
  promptMd: text("prompt_md").notNull(),
  optionsJson: text("options_json"),
  correctAnswer: text("correct_answer"),
  solutionMd: text("solution_md"),
  topic: text("topic"),
  marks: integer("marks").default(1),
  negativeMarks: real("negative_marks").default(0),
  position: integer("position").default(0),
});

export const testAttempts = sqliteTable("test_attempts", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  testId: text("test_id")
    .notNull()
    .references(() => tests.id),
  startedAt: createdAt(),
  submittedAt: ts("submitted_at"),
  score: real("score"),
  correctCount: integer("correct_count").default(0),
  incorrectCount: integer("incorrect_count").default(0),
  unattempted: integer("unattempted").default(0),
  timeTakenSec: integer("time_taken_sec").default(0),
  rank: integer("rank"),
  perTopicJson: text("per_topic_json"),
});

export const attemptAnswers = sqliteTable("attempt_answers", {
  id: id(),
  attemptId: text("attempt_id")
    .notNull()
    .references(() => testAttempts.id),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id),
  answer: text("answer"),
  isCorrect: bool("is_correct"),
  marksAwarded: real("marks_awarded"),
});

export const descriptiveSubmissions = sqliteTable("descriptive_submissions", {
  id: id(),
  attemptId: text("attempt_id")
    .notNull()
    .references(() => testAttempts.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  contentMd: text("content_md"),
  r2Key: text("r2_key"),
  status: text("status").notNull().default("pending"), // pending | evaluated
  evaluatorId: text("evaluator_id").references(() => users.id),
  marks: real("marks"),
  feedbackMd: text("feedback_md"),
});

// ===========================================================================
// ENTERPRISE MOCK TESTS (ISOLATED MODULE)
// ===========================================================================
export const mockTests = sqliteTable("mock_tests", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  moduleId: text("module_id")
    .notNull()
    .unique() // One mock test per module
    .references(() => modules.id),
  title: text("title").notNull(),
  description: text("description"),
  durationMin: integer("duration_min").notNull().default(60),
  passingMarks: integer("passing_marks").notNull().default(40),
  passingPct: integer("passing_pct").notNull().default(40),
  maxAttempts: integer("max_attempts").notNull().default(3),
  status: text("status").notNull().default("draft"), // draft | published
  createdAt: createdAt(),
});

export const mockQuestions = sqliteTable("mock_questions", {
  id: id(),
  mockTestId: text("mock_test_id")
    .notNull()
    .references(() => mockTests.id),
  prompt: text("prompt").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: text("correct_answer").notNull(), // A | B | C | D
  explanation: text("explanation"),
  marks: integer("marks").notNull().default(1),
  position: integer("position").notNull().default(0),
});

export const mockAttempts = sqliteTable("mock_attempts", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  mockTestId: text("mock_test_id")
    .notNull()
    .references(() => mockTests.id),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  startedAt: createdAt(),
  submittedAt: ts("submitted_at"),
  score: integer("score").default(0),
  correctCount: integer("correct_count").default(0),
  wrongCount: integer("wrong_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  timeTakenSec: integer("time_taken_sec").default(0),
});

export const mockAttemptAnswers = sqliteTable("mock_attempt_answers", {
  id: id(),
  attemptId: text("attempt_id")
    .notNull()
    .references(() => mockAttempts.id),
  questionId: text("question_id")
    .notNull()
    .references(() => mockQuestions.id),
  selectedOption: text("selected_option"), // A | B | C | D | null
  isCorrect: bool("is_correct"),
});

// ===========================================================================
// SCHEDULING, NOTIFICATIONS, ENGAGEMENT
// ===========================================================================
export const scheduleEvents = sqliteTable("schedule_events", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  type: text("type").notNull().default("class"), // live | class | test | deadline
  title: text("title").notNull(),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at"),
  trainerId: text("trainer_id").references(() => users.id),
  liveSessionId: text("live_session_id"),
  notes: text("notes"),
  reminderSent: bool("reminder_sent").default(false),
});

export const notifications = sqliteTable("notifications", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  read: bool("read").default(false),
  createdAt: createdAt(),
});

export const notificationPrefs = sqliteTable("notification_prefs", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  email: bool("email").default(true),
  push: bool("push").default(false),
  inApp: bool("in_app").default(true),
});

export const announcements = sqliteTable("announcements", {
  id: id(),
  courseId: text("course_id").references(() => courses.id),
  title: text("title").notNull(),
  bodyMd: text("body_md"),
  createdAt: createdAt(),
});

export const forumThreads = sqliteTable("forum_threads", {
  id: id(),
  courseId: text("course_id").references(() => courses.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  bodyMd: text("body_md"),
  createdAt: createdAt(),
});

export const forumPosts = sqliteTable("forum_posts", {
  id: id(),
  threadId: text("thread_id")
    .notNull()
    .references(() => forumThreads.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  bodyMd: text("body_md").notNull(),
  isTrainerAnswer: bool("is_trainer_answer").default(false),
  upvotes: integer("upvotes").default(0),
  createdAt: createdAt(),
});

export const mentorshipSlots = sqliteTable("mentorship_slots", {
  id: id(),
  mentorId: text("mentor_id")
    .notNull()
    .references(() => users.id),
  startTime: ts("start_time").notNull(),
  capacity: integer("capacity").default(1),
  booked: integer("booked").default(0),
});

export const bookings = sqliteTable("bookings", {
  id: id(),
  slotId: text("slot_id")
    .notNull()
    .references(() => mentorshipSlots.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("booked"),
});

export const interviewSessions = sqliteTable("interview_sessions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  scheduledAt: ts("scheduled_at"),
  biodataR2Key: text("biodata_r2_key"),
  feedbackMd: text("feedback_md"),
  status: text("status").notNull().default("requested"),
});

export const currentAffairsPosts = sqliteTable("current_affairs_posts", {
  id: id(),
  date: text("date").notNull(),
  kind: text("kind").notNull().default("daily"), // daily | monthly
  title: text("title").notNull(),
  bodyMd: text("body_md"),
  topic: text("topic"),
  pdfR2Key: text("pdf_r2_key"),
});

export const products = sqliteTable("products", {
  id: id(),
  type: text("type").notNull().default("physical"), // physical | digital
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  price: integer("price").notNull().default(0),
  stock: integer("stock"),
  digitalR2Key: text("digital_r2_key"),
  shipWeightG: integer("ship_weight_g"),
});

export const leads = sqliteTable("leads", {
  id: id(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  examInterest: text("exam_interest"),
  source: text("source"),
  createdAt: createdAt(),
});

export const toppers = sqliteTable("toppers", {
  id: id(),
  name: text("name").notNull(),
  exam: text("exam"),
  year: integer("year"),
  quoteMd: text("quote_md"),
  videoUrl: text("video_url"),
  photoR2Key: text("photo_r2_key"),
});

export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: id(),
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
});

// ===========================================================================
// LIVE (last phase)
// ===========================================================================
export const liveSessions = sqliteTable("live_sessions", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  moduleId: text("module_id").references(() => modules.id), // live classes are scheduled module-wise
  room: text("room").notNull(),
  title: text("title").notNull(),
  scheduledStart: ts("scheduled_start"),
  status: text("status").notNull().default("scheduled"), // scheduled | live | ended
  hostId: text("host_id").references(() => users.id),
  recordingUrl: text("recording_url"),
});

export const liveParticipants = sqliteTable("live_participants", {
  id: id(),
  sessionId: text("session_id")
    .notNull()
    .references(() => liveSessions.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role").notNull().default("student"), // host | student
  joinedAt: createdAt(),
  leftAt: ts("left_at"),
});

// ===========================================================================
// STANDALONE TEST SERIES (ISOLATED MODULE)
// ===========================================================================

export const testSeries = sqliteTable("test_series", {
  id: id(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  descriptionMd: text("description_md"),
  thumbnailR2Key: text("thumbnail_r2_key"),
  bannerR2Key: text("banner_r2_key"),
  category: text("category"), // e.g. TNPSC, UPSC, Banking, SSC, Engineering
  difficulty: text("difficulty"), // easy | medium | hard
  price: integer("price").notNull().default(0), // paise
  discountPrice: integer("discount_price"), // paise
  validityDays: integer("validity_days").notNull().default(365),
  status: text("status").notNull().default("draft"), // draft | published | coming_soon
  position: integer("position").default(0),
  isFeatured: bool("is_featured").default(false),
  createdAt: createdAt(),
});

export const testSeriesTests = sqliteTable("test_series_tests", {
  id: id(),
  testSeriesId: text("test_series_id")
    .notNull()
    .references(() => testSeries.id),
  title: text("title").notNull(),
  durationMin: integer("duration_min").notNull().default(60),
  passingMarks: integer("passing_marks").notNull().default(40),
  passingPct: integer("passing_pct").notNull().default(40),
  maxAttempts: integer("max_attempts").notNull().default(3),
  position: integer("position").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft | published
});

export const testSeriesQuestions = sqliteTable("test_series_questions", {
  id: id(),
  testId: text("test_id")
    .notNull()
    .references(() => testSeriesTests.id),
  prompt: text("prompt").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: text("correct_answer").notNull(), // A | B | C | D
  explanation: text("explanation"),
  marks: integer("marks").notNull().default(1),
  position: integer("position").notNull().default(0),
});

export const testSeriesEnrollments = sqliteTable("test_series_enrollments", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  testSeriesId: text("test_series_id")
    .notNull()
    .references(() => testSeries.id),
  purchaseDate: createdAt(),
  expiryDate: ts("expiry_date"),
});

// Test series bundled into a package course (many-to-many). Buying the package
// grants access to each linked test series for the package's validity window.
export const packageTestSeries = sqliteTable("package_test_series", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  testSeriesId: text("test_series_id")
    .notNull()
    .references(() => testSeries.id),
});

export const testSeriesAttempts = sqliteTable("test_series_attempts", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  testId: text("test_id")
    .notNull()
    .references(() => testSeriesTests.id),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  startedAt: createdAt(),
  submittedAt: ts("submitted_at"),
  score: integer("score").default(0),
  correctCount: integer("correct_count").default(0),
  wrongCount: integer("wrong_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  timeTakenSec: integer("time_taken_sec").default(0),
  facultyFeedbackMd: text("faculty_feedback_md"),
});

export const testSeriesAttemptAnswers = sqliteTable("test_series_attempt_answers", {
  id: id(),
  attemptId: text("attempt_id")
    .notNull()
    .references(() => testSeriesAttempts.id),
  questionId: text("question_id")
    .notNull()
    .references(() => testSeriesQuestions.id),
  selectedOption: text("selected_option"), // A | B | C | D | null
  isCorrect: bool("is_correct"),
});

// ===========================================================================
// PAYMENT WEBHOOKS (idempotency ledger)
// ===========================================================================
// One row per unique webhook delivery. `dedupKey` is UNIQUE so duplicate
// deliveries from PhonePe cannot be processed twice. Stores only non-sensitive
// identifiers — never credentials, tokens, or full payment instrument details.
export const phonepeWebhookEvents = sqliteTable("phonepe_webhook_events", {
  id: id(),
  dedupKey: text("dedup_key").notNull().unique(),
  event: text("event"),
  orderId: text("order_id"),
  merchantOrderId: text("merchant_order_id"),
  state: text("state"),
  receivedAt: ts("received_at").$defaultFn(() => new Date()),
});
