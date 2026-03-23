import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";
import connectDB from "../db/db.js";
import { syncMongoGraphToNeo4j } from "./syncMongoToNeo4jGraph.js";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { Module } from "../models/module.model.js";
import { Lesson } from "../models/lesson.model.js";
import { Topic } from "../models/topic.model.js";
import { Subtopic } from "../models/subtopic.model.js";
import { Content } from "../models/content.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Progress } from "../models/progress.model.js";
import { Review } from "../models/review.model.js";
import { Discussion } from "../models/discussion.model.js";
import { Notification } from "../models/notification.model.js";
import { Badge } from "../models/badge.model.js";
import { AITutorChat } from "../models/aiTutorChat.model.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";
import { Flashcard } from "../models/flashcard.model.js";
import { StudyPlan } from "../models/studyPlan.model.js";
import { Certificate } from "../models/certificate.model.js";
import Notes from "../models/notes.model.js";
import Call from "../models/call.model.js";
import { neo4jDriver } from "../config/neo4j.js";

const PREFIX = "platform-seed";
const PASSWORD = "Seed@12345";

const sampleVideo = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function hashForCertificate(userId, courseId) {
  return crypto.createHash("sha256").update(`${userId}:${courseId}:${Date.now()}`).digest("hex");
}

async function cleanupExistingSeed() {
  const seededUsers = await User.find({ email: /@seed\.recursion\.local$/i }).select("_id");
  const userIds = seededUsers.map((u) => u._id);

  const seededCourses = await Course.find({ title: new RegExp(`^${PREFIX}`, "i") }).select("_id");
  const courseIds = seededCourses.map((c) => c._id);

  const modules = await Module.find({ course: { $in: courseIds } }).select("_id");
  const moduleIds = modules.map((m) => m._id);

  const lessons = await Lesson.find({ course: { $in: courseIds } }).select("_id");
  const lessonIds = lessons.map((l) => l._id);

  const topics = await Topic.find({ course: { $in: courseIds } }).select("_id");
  const topicIds = topics.map((t) => t._id);

  const subtopics = await Subtopic.find({ course: { $in: courseIds } }).select("_id");
  const subtopicIds = subtopics.map((s) => s._id);

  await Promise.all([
    Enrollment.deleteMany({ $or: [{ student: { $in: userIds } }, { course: { $in: courseIds } }] }),
    Progress.deleteMany({ $or: [{ student: { $in: userIds } }, { course: { $in: courseIds } }, { lesson: { $in: lessonIds } }] }),
    Review.deleteMany({ $or: [{ student: { $in: userIds } }, { course: { $in: courseIds } }] }),
    Discussion.deleteMany({ $or: [{ author: { $in: userIds } }, { course: { $in: courseIds } }] }),
    Notification.deleteMany({ $or: [{ recipient: { $in: userIds } }, { relatedCourse: { $in: courseIds } }] }),
    Badge.deleteMany({ $or: [{ student: { $in: userIds } }, { course: { $in: courseIds } }] }),
    AITutorChat.deleteMany({ $or: [{ student: { $in: userIds } }, { course: { $in: courseIds } }] }),
    QuizAttempt.deleteMany({ $or: [{ student: { $in: userIds } }, { course: { $in: courseIds } }, { lesson: { $in: lessonIds } }] }),
    Quiz.deleteMany({ $or: [{ course: { $in: courseIds } }, { lesson: { $in: lessonIds } }] }),
    Flashcard.deleteMany({ $or: [{ student: { $in: userIds } }, { course: { $in: courseIds } }, { lesson: { $in: lessonIds } }] }),
    StudyPlan.deleteMany({ $or: [{ student: { $in: userIds } }, { course: { $in: courseIds } }] }),
    Certificate.deleteMany({ $or: [{ userId: { $in: userIds } }, { courseId: { $in: courseIds } }] }),
    Notes.deleteMany({ studentId: { $in: userIds } }),
    Call.deleteMany({ roomName: new RegExp(`^${PREFIX}`, "i") }),
    Content.deleteMany({
      $or: [
        { course: { $in: courseIds } },
        { lesson: { $in: lessonIds } },
        { topic: { $in: topicIds } },
        { subtopic: { $in: subtopicIds } },
      ],
    }),
    Subtopic.deleteMany({ _id: { $in: subtopicIds } }),
    Topic.deleteMany({ _id: { $in: topicIds } }),
    Lesson.deleteMany({ _id: { $in: lessonIds } }),
    Module.deleteMany({ _id: { $in: moduleIds } }),
    Course.deleteMany({ _id: { $in: courseIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);
}

async function createUsers() {
  const [admin, instructor, studentA, studentB] = await User.create([
    {
      username: `${PREFIX}_admin`,
      email: "admin@seed.recursion.local",
      fullname: "Seed Admin",
      role: "admin",
      password: PASSWORD,
    },
    {
      username: `${PREFIX}_instructor`,
      email: "instructor@seed.recursion.local",
      fullname: "Seed Instructor",
      role: "instructor",
      password: PASSWORD,
    },
    {
      username: `${PREFIX}_student_a`,
      email: "student.a@seed.recursion.local",
      fullname: "Seed Student A",
      role: "student",
      password: PASSWORD,
    },
    {
      username: `${PREFIX}_student_b`,
      email: "student.b@seed.recursion.local",
      fullname: "Seed Student B",
      role: "student",
      password: PASSWORD,
    },
  ]);

  return { admin, instructor, studentA, studentB };
}

async function createCourseTree(instructorId, title, category, level) {
  const course = await Course.create({
    title,
    description: `${title} generated for full integration testing`,
    instructor: instructorId,
    category,
    level,
    language: "English",
    tags: ["seed", "integration", "knowledge-graph"],
    status: "published",
    isApproved: true,
    price: 0,
    totalDuration: 90,
  });

  const module1 = await Module.create({
    title: "Foundations",
    description: "Core concepts and setup",
    course: course._id,
    order: 1,
  });

  const module2 = await Module.create({
    title: "Applied Practice",
    description: "Hands-on implementation",
    course: course._id,
    order: 2,
    prerequisiteModule: module1._id,
  });

  const lessons = await Lesson.create([
    {
      title: "Introduction",
      module: module1._id,
      course: course._id,
      videoUrl: sampleVideo,
      duration: 600,
      order: 1,
      transcript: "Intro transcript for AI tutor and flashcard generation context.",
      summary: "Understand goals and prerequisites.",
      isFree: true,
      description: "Course overview",
    },
    {
      title: "Core Concepts",
      module: module1._id,
      course: course._id,
      videoUrl: sampleVideo,
      duration: 900,
      order: 2,
      transcript: "Concepts transcript with terminology and examples.",
      summary: "Build conceptual understanding.",
      isFree: false,
      description: "Main theory",
    },
    {
      title: "Build Project",
      module: module2._id,
      course: course._id,
      videoUrl: sampleVideo,
      duration: 1200,
      order: 1,
      transcript: "Project transcript covering practical implementation.",
      summary: "Apply knowledge in a project.",
      isFree: false,
      description: "Project lab",
    },
  ]);

  const topic1 = await Topic.create({
    title: "Foundational Concepts",
    description: "Essential theory",
    module: module1._id,
    course: course._id,
    order: 1,
    difficulty: "easy",
    learningOutcomes: [{ description: "Explain core terms", bloomLevel: "understand" }],
    estimatedDuration: 30,
  });

  const topic2 = await Topic.create({
    title: "Practical Implementation",
    description: "Applying concepts in practice",
    module: module2._id,
    course: course._id,
    order: 1,
    difficulty: "medium",
    prerequisites: [topic1._id],
    learningOutcomes: [{ description: "Build a working solution", bloomLevel: "apply" }],
    estimatedDuration: 60,
  });

  const subtopic1 = await Subtopic.create({
    title: "Key Definitions",
    description: "Important vocabulary",
    topic: topic1._id,
    course: course._id,
    module: module1._id,
    order: 1,
    difficulty: "easy",
    learningOutcomes: [{ description: "Recall key definitions", bloomLevel: "remember" }],
    estimatedDuration: 15,
  });

  const subtopic2 = await Subtopic.create({
    title: "Mini Project",
    description: "Build a small practical artifact",
    topic: topic2._id,
    course: course._id,
    module: module2._id,
    order: 1,
    difficulty: "medium",
    prerequisites: [subtopic1._id],
    learningOutcomes: [{ description: "Construct the mini project", bloomLevel: "create" }],
    estimatedDuration: 30,
  });

  await Content.create([
    {
      title: "Foundations Notes",
      type: "notes",
      url: "https://example.com/notes/foundations",
      course: course._id,
      topic: topic1._id,
      tags: ["notes", "foundation"],
      description: "Topic notes",
      order: 1,
    },
    {
      title: "Mini Project PDF",
      type: "pdf",
      url: "https://example.com/pdf/project-guide",
      course: course._id,
      subtopic: subtopic2._id,
      tags: ["project", "guide"],
      description: "Project guide",
      order: 1,
    },
    {
      title: "Lesson Starter Code",
      type: "code",
      url: "https://github.com/example/repo",
      course: course._id,
      lesson: lessons[2]._id,
      tags: ["starter", "code"],
      description: "Starter repository",
      order: 1,
    },
  ]);

  return { course, modules: [module1, module2], lessons, topics: [topic1, topic2], subtopics: [subtopic1, subtopic2] };
}

async function seedLearningData(users, structures) {
  const { instructor, studentA, studentB } = users;
  const [courseA, courseB] = structures;

  await Enrollment.create([
    {
      student: studentA._id,
      course: courseA.course._id,
      studyGoal: "Become confident with fundamentals and project delivery",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      completionPercentage: 66,
      isCompleted: false,
    },
    {
      student: studentA._id,
      course: courseB.course._id,
      studyGoal: "Cross-domain upskilling",
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      completionPercentage: 25,
      isCompleted: false,
    },
    {
      student: studentB._id,
      course: courseA.course._id,
      studyGoal: "Review and certificate prep",
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      completionPercentage: 100,
      isCompleted: true,
      completedAt: new Date(),
    },
  ]);

  await Progress.create([
    {
      student: studentA._id,
      course: courseA.course._id,
      lesson: courseA.lessons[0]._id,
      isCompleted: true,
      watchedDuration: 600,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      attentionScore: 82,
    },
    {
      student: studentA._id,
      course: courseA.course._id,
      lesson: courseA.lessons[1]._id,
      isCompleted: true,
      watchedDuration: 900,
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      attentionScore: 78,
    },
    {
      student: studentA._id,
      course: courseA.course._id,
      lesson: courseA.lessons[2]._id,
      isCompleted: false,
      watchedDuration: 300,
      attentionScore: 65,
    },
    {
      student: studentB._id,
      course: courseA.course._id,
      lesson: courseA.lessons[0]._id,
      isCompleted: true,
      watchedDuration: 600,
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      attentionScore: 90,
    },
    {
      student: studentB._id,
      course: courseA.course._id,
      lesson: courseA.lessons[1]._id,
      isCompleted: true,
      watchedDuration: 900,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      attentionScore: 92,
    },
    {
      student: studentB._id,
      course: courseA.course._id,
      lesson: courseA.lessons[2]._id,
      isCompleted: true,
      watchedDuration: 1200,
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      attentionScore: 95,
    },
  ]);

  await Review.create([
    {
      student: studentA._id,
      course: courseA.course._id,
      rating: 4,
      comment: "Great structure and pacing",
      isFlagged: false,
    },
    {
      student: studentB._id,
      course: courseA.course._id,
      rating: 5,
      comment: "Excellent examples and practical flow",
      isFlagged: false,
    },
  ]);

  const parentPost = await Discussion.create({
    course: courseA.course._id,
    lesson: courseA.lessons[1]._id,
    author: studentA._id,
    content: "Can someone explain the second concept with an analogy?",
    isPinned: false,
  });

  await Discussion.create({
    course: courseA.course._id,
    lesson: courseA.lessons[1]._id,
    author: instructor._id,
    parentPost: parentPost._id,
    content: "Think of it like a roadmap where each stop unlocks the next one.",
    isPinned: true,
  });

  await Notification.create([
    {
      recipient: studentA._id,
      type: "plan_reminder",
      message: "You have 1 pending lesson in your plan for today.",
      link: "/student/roadmap",
      relatedCourse: courseA.course._id,
    },
    {
      recipient: instructor._id,
      type: "enrollment",
      message: "A new student enrolled in your course.",
      link: `/instructor/courses/${courseA.course._id}`,
      relatedCourse: courseA.course._id,
    },
  ]);

  await Badge.create({
    student: studentA._id,
    type: "first_quiz",
    course: courseA.course._id,
    metadata: { score: 80 },
  });

  const aiSessionId = `${PREFIX}-ai-session-${Date.now()}`;
  await AITutorChat.create({
    student: studentA._id,
    course: courseA.course._id,
    lesson: courseA.lessons[1]._id,
    sessionId: aiSessionId,
    messages: [
      { role: "user", content: "I am confused about the dependency flow." },
      { role: "assistant", content: "What part of the flow seems unclear to you first?" },
    ],
    isFlagged: false,
  });

  const quiz = await Quiz.create({
    lesson: courseA.lessons[1]._id,
    course: courseA.course._id,
    isAIGenerated: true,
    currentDifficulty: "medium",
    passingScore: 60,
    questions: [
      {
        text: "What is the main objective of this lesson?",
        options: [
          "Memorize random facts",
          "Understand dependency flow",
          "Skip prerequisites",
          "Ignore outcomes",
        ],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "The lesson focuses on understanding how dependencies shape learning order.",
      },
    ],
  });

  await QuizAttempt.create({
    student: studentA._id,
    quiz: quiz._id,
    lesson: courseA.lessons[1]._id,
    course: courseA.course._id,
    answers: [
      {
        questionId: quiz.questions[0]._id,
        selectedIndex: 1,
        isCorrect: true,
      },
    ],
    score: 100,
    isPassed: true,
    difficulty: "medium",
    attemptNumber: 1,
    timeTaken: 140,
  });

  await Flashcard.create([
    {
      student: studentA._id,
      lesson: courseA.lessons[1]._id,
      course: courseA.course._id,
      question: "Why do prerequisites matter?",
      answer: "They ensure foundational understanding before advanced concepts.",
      nextReviewAt: new Date(Date.now() - 60 * 60 * 1000),
      reviewCount: 1,
      easeFactor: 2.5,
      interval: 1,
    },
    {
      student: studentA._id,
      lesson: courseA.lessons[2]._id,
      course: courseA.course._id,
      question: "What signals learning velocity improvement?",
      answer: "Faster completion with sustained mastery and confidence.",
      nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 1,
    },
  ]);

  await StudyPlan.create({
    student: studentA._id,
    course: courseA.course._id,
    goalText: "Finish project implementation with good retention",
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    dailyTasks: [
      {
        date: new Date(),
        lessons: [courseA.lessons[2]._id],
        estimatedMins: 35,
        isCompleted: false,
      },
      {
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lessons: [courseA.lessons[2]._id],
        estimatedMins: 30,
        isCompleted: false,
      },
    ],
    isActive: true,
  });

  await Notes.create({
    studentId: studentA._id,
    callId: `${PREFIX}-call-1`,
    roomName: `${PREFIX}-live-room`,
    title: "Live Session Notes",
    content: "Discussed weak areas and next best actions with instructor.",
  });

  await Call.create({
    callerId: String(instructor._id),
    callerName: instructor.fullname,
    callerRole: "instructor",
    calleeId: String(studentA._id),
    calleeName: studentA.fullname,
    calleeRole: "student",
    roomName: `${PREFIX}-live-room`,
    status: "ended",
    startedAt: new Date(Date.now() - 30 * 60 * 1000),
    endedAt: new Date(Date.now() - 5 * 60 * 1000),
    durationSeconds: 1500,
  });

  const certHash = hashForCertificate(studentB._id, courseA.course._id);
  await Certificate.create({
    userId: studentB._id,
    courseId: courseA.course._id,
    hash: certHash,
    previousHash: "GENESIS",
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${certHash}`,
    onChainTxHash: null,
  });

  return {
    aiSessionId,
    quizId: String(quiz._id),
    certificateHash: certHash,
  };
}

async function run() {
  await connectDB();

  await cleanupExistingSeed();

  const users = await createUsers();
  const structureA = await createCourseTree(users.instructor._id, `${PREFIX} AI Foundations`, "Artificial Intelligence", "beginner");
  const structureB = await createCourseTree(users.instructor._id, `${PREFIX} Full Stack Systems`, "Web Development", "intermediate");

  const featureArtifacts = await seedLearningData(users, [structureA, structureB]);
  const neo4jStats = await syncMongoGraphToNeo4j({ clearExisting: true, rootName: "Learning Graph" });

  const summary = {
    users: {
      admin: { email: users.admin.email, password: PASSWORD },
      instructor: { email: users.instructor.email, password: PASSWORD },
      studentA: { email: users.studentA.email, password: PASSWORD },
      studentB: { email: users.studentB.email, password: PASSWORD },
    },
    courses: [String(structureA.course._id), String(structureB.course._id)],
    artifacts: featureArtifacts,
    neo4j: neo4jStats,
  };

  console.log("\nPlatform feature seed completed successfully:\n");
  console.log(JSON.stringify(summary, null, 2));
}

run()
  .catch((error) => {
    console.error("Platform feature seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
    if (neo4jDriver) {
      await neo4jDriver.close();
    }
  });
