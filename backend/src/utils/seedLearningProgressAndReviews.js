import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { DB_NAME } from "../constants.js";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { Module } from "../models/module.model.js";
import { Lesson } from "../models/lesson.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Progress } from "../models/progress.model.js";
import { Review } from "../models/review.model.js";

dotenv.config();

const SEED_PREFIX = "learning-seed";

const connect = async () => {
  const mongoUri = `${process.env.MONGO_URI}/${DB_NAME}`;
  await mongoose.connect(mongoUri);
};

const ensureUsers = async () => {
  let instructor = await User.findOne({ email: `${SEED_PREFIX}.instructor@recursion.test` });
  let student = await User.findOne({ email: `${SEED_PREFIX}.student@recursion.test` });

  const passwordHash = await bcrypt.hash("Password@123", 10);

  if (!instructor) {
    instructor = await User.create({
      username: `${SEED_PREFIX}.instructor`,
      email: `${SEED_PREFIX}.instructor@recursion.test`,
      fullname: "Learning Seed Instructor",
      role: "instructor",
      password: passwordHash,
    });
  }

  if (!student) {
    student = await User.create({
      username: `${SEED_PREFIX}.student`,
      email: `${SEED_PREFIX}.student@recursion.test`,
      fullname: "Learning Seed Student",
      role: "student",
      password: passwordHash,
    });
  }

  return { instructor, student };
};

const ensureCourseWithLessons = async (instructorId) => {
  let course = await Course.findOne({ title: `${SEED_PREFIX} fullstack-foundations` });

  if (!course) {
    course = await Course.create({
      title: `${SEED_PREFIX} fullstack-foundations`,
      description: "Demo course for enrollment/progress/review integration.",
      instructor: instructorId,
      category: "Development",
      level: "beginner",
      language: "English",
      price: 0,
      status: "published",
      isApproved: true,
      totalDuration: 1800,
    });
  }

  let module = await Module.findOne({ course: course._id, order: 1 });
  if (!module) {
    module = await Module.create({
      title: "Module 1: Core Concepts",
      description: "Seed module",
      course: course._id,
      order: 1,
    });
  }

  const lessonSpecs = [
    { title: "Intro to Program Flow", duration: 300, order: 1 },
    { title: "Async Patterns", duration: 420, order: 2 },
    { title: "State Management", duration: 360, order: 3 },
    { title: "API Integration", duration: 360, order: 4 },
    { title: "Deployment Basics", duration: 360, order: 5 },
  ];

  const lessons = [];
  for (const spec of lessonSpecs) {
    let lesson = await Lesson.findOne({ course: course._id, module: module._id, order: spec.order });
    if (!lesson) {
      lesson = await Lesson.create({
        title: spec.title,
        module: module._id,
        course: course._id,
        videoUrl: `https://example.com/${SEED_PREFIX}/lesson-${spec.order}.mp4`,
        duration: spec.duration,
        order: spec.order,
        description: "Seed lesson",
        isFree: true,
      });
    }
    lessons.push(lesson);
  }

  return { course, lessons };
};

const upsertEnrollment = async ({ studentId, courseId }) => {
  await Enrollment.findOneAndUpdate(
    { student: studentId, course: courseId },
    {
      student: studentId,
      course: courseId,
      enrolledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      studyGoal: "Finish this course in 2 weeks",
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
    { upsert: true }
  );
};

const seedProgress = async ({ studentId, courseId, lessons }) => {
  const completionPlan = [
    { complete: true, watched: 300, daysAgo: 7, attention: 91 },
    { complete: true, watched: 420, daysAgo: 5, attention: 88 },
    { complete: true, watched: 360, daysAgo: 3, attention: 93 },
    { complete: false, watched: 200, daysAgo: 1, attention: 80 },
    { complete: false, watched: 0, daysAgo: 0, attention: null },
  ];

  for (let i = 0; i < lessons.length; i += 1) {
    const lesson = lessons[i];
    const plan = completionPlan[i] || { complete: false, watched: 0, daysAgo: 0, attention: null };
    const watchedAt = new Date(Date.now() - plan.daysAgo * 24 * 60 * 60 * 1000);

    await Progress.findOneAndUpdate(
      { student: studentId, lesson: lesson._id },
      {
        student: studentId,
        course: courseId,
        lesson: lesson._id,
        isCompleted: plan.complete,
        watchedDuration: plan.watched,
        attentionScore: plan.attention,
        completedAt: plan.complete ? watchedAt : null,
        lastWatchedAt: watchedAt,
      },
      { upsert: true }
    );
  }

  const totalLessons = lessons.length;
  const completedLessons = completionPlan.filter((p) => p.complete).length;
  const completionPercentage = Math.round((completedLessons / totalLessons) * 100);

  await Enrollment.findOneAndUpdate(
    { student: studentId, course: courseId },
    {
      completionPercentage,
      isCompleted: completionPercentage === 100,
      completedAt: completionPercentage === 100 ? new Date() : null,
    }
  );
};

const seedReview = async ({ studentId, courseId }) => {
  await Review.findOneAndUpdate(
    { student: studentId, course: courseId },
    {
      student: studentId,
      course: courseId,
      rating: 5,
      comment: "Practical and well-structured course. Great pace and examples.",
      isFlagged: false,
    },
    { upsert: true }
  );

  const stats = await Review.aggregate([
    { $match: { course: courseId, isFlagged: false } },
    { $group: { _id: "$course", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  if (stats.length > 0) {
    await Course.findByIdAndUpdate(courseId, {
      averageRating: Math.round(stats[0].avg * 10) / 10,
      totalReviews: stats[0].count,
    });
  }
};

const run = async () => {
  await connect();

  const { instructor, student } = await ensureUsers();
  const { course, lessons } = await ensureCourseWithLessons(instructor._id);

  await upsertEnrollment({ studentId: student._id, courseId: course._id });
  await seedProgress({ studentId: student._id, courseId: course._id, lessons });
  await seedReview({ studentId: student._id, courseId: course._id });

  const enrollment = await Enrollment.findOne({ student: student._id, course: course._id }).lean();

  console.log("\nLearning progress + review seed completed:\n");
  console.log(
    JSON.stringify(
      {
        student: {
          id: String(student._id),
          email: student.email,
          username: student.username,
          password: "Password@123",
        },
        course: {
          id: String(course._id),
          title: course.title,
        },
        enrollment: {
          completionPercentage: enrollment?.completionPercentage,
          isCompleted: enrollment?.isCompleted,
        },
        routesToCheck: [
          `GET /api/v1/enrollments/my`,
          `GET /api/v1/progress/course/${course._id}`,
          `GET /api/v1/reviews/${course._id}`,
        ],
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
