import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { DB_NAME } from "../constants.js";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { Module } from "../models/module.model.js";
import { Lesson } from "../models/lesson.model.js";
import { Progress } from "../models/progress.model.js";
import { Certificate } from "../models/certificate.model.js";

dotenv.config();

const TEST_PREFIX = "cert-seed";

const connect = async () => {
  const mongoUri = `${process.env.MONGO_URI}/${DB_NAME}`;
  await mongoose.connect(mongoUri);
};

const cleanupPreviousSeed = async () => {
  const seededUsers = await User.find({
    $or: [
      { email: `${TEST_PREFIX}.student@recursion.test` },
      { email: `${TEST_PREFIX}.instructor@recursion.test` },
    ],
  }).select("_id");

  const userIds = seededUsers.map((u) => u._id);

  const seededCourses = await Course.find({ title: new RegExp(`^${TEST_PREFIX}`, "i") }).select("_id");
  const courseIds = seededCourses.map((c) => c._id);

  const seededModules = await Module.find({ course: { $in: courseIds } }).select("_id");
  const moduleIds = seededModules.map((m) => m._id);

  const seededLessons = await Lesson.find({ course: { $in: courseIds } }).select("_id");
  const lessonIds = seededLessons.map((l) => l._id);

  if (lessonIds.length > 0) {
    await Progress.deleteMany({ lesson: { $in: lessonIds } });
  }

  if (courseIds.length > 0) {
    await Certificate.deleteMany({ courseId: { $in: courseIds } });
  }

  if (moduleIds.length > 0) {
    await Module.deleteMany({ _id: { $in: moduleIds } });
  }

  if (lessonIds.length > 0) {
    await Lesson.deleteMany({ _id: { $in: lessonIds } });
  }

  if (courseIds.length > 0) {
    await Course.deleteMany({ _id: { $in: courseIds } });
  }

  if (userIds.length > 0) {
    await Progress.deleteMany({ student: { $in: userIds } });
    await Certificate.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
  }
};

const createUsers = async () => {
  const plainPassword = "Password@123";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const now = new Date();

  const insertResult = await User.collection.insertMany([
    {
      username: `${TEST_PREFIX}.instructor`,
      email: `${TEST_PREFIX}.instructor@recursion.test`,
      fullname: "Certificate Seed Instructor",
      role: "instructor",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    },
    {
      username: `${TEST_PREFIX}.student`,
      email: `${TEST_PREFIX}.student@recursion.test`,
      fullname: "Certificate Seed Student",
      role: "student",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const instructor = await User.findOne({ email: `${TEST_PREFIX}.instructor@recursion.test` });
  const student = await User.findOne({ email: `${TEST_PREFIX}.student@recursion.test` });

  if (!insertResult?.insertedCount || !instructor || !student) {
    throw new Error("Failed to create seed users");
  }

  return { instructor, student };
};

const createCourseWithLessons = async ({ instructorId, title, totalDuration, lessonDurations }) => {
  const course = await Course.create({
    title,
    description: `${title} for certificate workflow testing`,
    instructor: instructorId,
    category: "Testing",
    status: "published",
    isApproved: true,
    totalDuration,
    price: 0,
  });

  const module = await Module.create({
    title: `${title} Module 1`,
    description: "Seed module",
    course: course._id,
    order: 1,
  });

  const lessons = [];

  for (let i = 0; i < lessonDurations.length; i += 1) {
    const lesson = await Lesson.create({
      title: `${title} Lesson ${i + 1}`,
      module: module._id,
      course: course._id,
      videoUrl: `https://example.com/${TEST_PREFIX}/${course._id}/lesson-${i + 1}`,
      duration: lessonDurations[i],
      order: i + 1,
      isFree: true,
      description: "Seed lesson",
    });

    lessons.push(lesson);
  }

  return { course, module, lessons };
};

const seedProgress = async ({ studentId, courseId, lessons, plan }) => {
  const ops = lessons.map((lesson, idx) => {
    const step = plan[idx] || { watchedDuration: 0, isCompleted: false };

    return {
      updateOne: {
        filter: { student: studentId, lesson: lesson._id },
        update: {
          $set: {
            student: studentId,
            course: courseId,
            lesson: lesson._id,
            watchedDuration: step.watchedDuration,
            isCompleted: step.isCompleted,
            completedAt: step.isCompleted ? new Date() : null,
            lastWatchedAt: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  if (ops.length > 0) {
    await Progress.bulkWrite(ops);
  }
};

const run = async () => {
  await connect();

  await cleanupPreviousSeed();

  const { instructor, student } = await createUsers();

  const eligibleSetup = await createCourseWithLessons({
    instructorId: instructor._id,
    title: `${TEST_PREFIX} eligible-course`,
    totalDuration: 1000,
    lessonDurations: [400, 300, 300],
  });

  const ineligibleSetup = await createCourseWithLessons({
    instructorId: instructor._id,
    title: `${TEST_PREFIX} ineligible-course`,
    totalDuration: 1000,
    lessonDurations: [400, 300, 300],
  });

  await seedProgress({
    studentId: student._id,
    courseId: eligibleSetup.course._id,
    lessons: eligibleSetup.lessons,
    plan: [
      { watchedDuration: 400, isCompleted: true },
      { watchedDuration: 300, isCompleted: true },
      { watchedDuration: 200, isCompleted: true },
    ],
  });

  await seedProgress({
    studentId: student._id,
    courseId: ineligibleSetup.course._id,
    lessons: ineligibleSetup.lessons,
    plan: [
      { watchedDuration: 300, isCompleted: true },
      { watchedDuration: 200, isCompleted: false },
      { watchedDuration: 100, isCompleted: false },
    ],
  });

  const output = {
    student: {
      email: student.email,
      username: student.username,
      password: "Password@123",
      id: student._id.toString(),
    },
    courses: {
      eligibleCourseId: eligibleSetup.course._id.toString(),
      ineligibleCourseId: ineligibleSetup.course._id.toString(),
    },
    expected: {
      eligibleCourse: {
        allLecturesCompleted: true,
        watchRatio: 0.9,
        eligible: true,
      },
      ineligibleCourse: {
        allLecturesCompleted: false,
        watchRatio: 0.6,
        eligible: false,
      },
    },
  };

  console.log("\nCertificate workflow seed completed:\n");
  console.log(JSON.stringify(output, null, 2));
};

run()
  .catch((error) => {
    console.error("Certificate workflow seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
