import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Course } from "../models/course.model.js";
import { Lesson } from "../models/lesson.model.js";
import { Module } from "../models/module.model.js";
import { Progress } from "../models/progress.model.js";
import { User } from "../models/user.model.js";
import { Certificate } from "../models/certificate.model.js";
import { QuizBank } from "../models/quizBank.model.js";
import { QuizAttempt } from "../models/quizattempt.model.js";
import { generateCertificateHash } from "../utils/hash.js";
import { generateQRCodeDataUrl } from "../utils/qrcode.js";
import {
  issueCertificateOnChain,
  verifyCertificateOnChain,
} from "../services/blockchainCertificate.service.js";

const CERT_VERIFY_BASE_URL =
  process.env.CERT_VERIFY_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5173";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildTitleSearchRegex = (identifier = "") => {
  const tokens = String(identifier)
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((t) => escapeRegex(t));

  if (!tokens.length) return null;
  return new RegExp(tokens.join(".*"), "i");
};

const resolveUser = async (req) => {
  if (req.user?._id) {
    return req.user;
  }

  const userId = req.body?.userId || req.query?.userId;
  const userEmail = req.body?.userEmail || req.query?.userEmail;

  if (userId) {
    const userById = await User.findById(userId);
    if (!userById) throw new ApiError(404, "User not found");
    return userById;
  }

  if (userEmail) {
    const userByEmail = await User.findOne({ email: String(userEmail).toLowerCase() });
    if (!userByEmail) throw new ApiError(404, "User not found");
    return userByEmail;
  }

  throw new ApiError(401, "Authentication required or provide userId/userEmail");
};

const getCourseLectures = async (courseId) => {
  const lessons = await Lesson.find({ course: courseId }).select("_id duration");
  if (lessons.length > 0) {
    return lessons.map((lesson) => ({
      lectureId: lesson._id.toString(),
      duration: Number(lesson.duration || 0),
    }));
  }

  const course = await Course.findById(courseId).select("lectures totalDuration");
  if (!course) throw new ApiError(404, "Course not found");

  const lectures = Array.isArray(course.lectures)
    ? course.lectures.map((lecture) => ({
      lectureId: String(lecture.lectureId),
      duration: Number(lecture.duration || 0),
    }))
    : [];

  return lectures;
};

const computeEligibility = async ({ userId, courseId }) => {
  const course = await Course.findById(courseId).select("title totalDuration");
  if (!course) throw new ApiError(404, "Course not found");

  const lectures = await getCourseLectures(courseId);
  if (lectures.length === 0) {
    throw new ApiError(400, "Course has no lectures configured");
  }

  const progressRecords = await Progress.find({ student: userId, course: courseId }).select(
    "lesson watchedDuration isCompleted"
  );

  const progressByLessonId = new Map(
    progressRecords.map((record) => [String(record.lesson), record])
  );

  const allLecturesCompleted = lectures.every((lecture) => {
    const progress = progressByLessonId.get(String(lecture.lectureId));
    return Boolean(progress?.isCompleted);
  });

  const totalDurationFromLectures = lectures.reduce(
    (sum, lecture) => sum + Number(lecture.duration || 0),
    0
  );

  const totalDuration = Number(course.totalDuration || 0) || totalDurationFromLectures;

  const watchedDuration = lectures.reduce((sum, lecture) => {
    const progress = progressByLessonId.get(String(lecture.lectureId));
    const watched = Number(progress?.watchedDuration || 0);
    return sum + watched;
  }, 0);

  const watchRatio = totalDuration > 0 ? watchedDuration / totalDuration : 0;
  const meetsWatchThreshold = watchRatio >= 0.8;

  const lessonIds = lectures.map((lecture) => lecture.lectureId);
  const moduleIds = await Module.find({ course: courseId }).distinct("_id");
  let requiredQuizzes = await QuizBank.find({
    isPublished: true,
    $or: [{ course: courseId }, { module: { $in: moduleIds } }, { lesson: { $in: lessonIds } }],
  }).select("_id title lesson module course");

  // Backward-compatible fallback for older published quizzes not linked to course/lesson.
  if (!requiredQuizzes.length) {
    const titleRegex = buildTitleSearchRegex(course.title || "");
    if (titleRegex) {
      requiredQuizzes = await QuizBank.find({
        isPublished: true,
        course: null,
        module: null,
        lesson: null,
        title: { $regex: titleRegex },
      }).select("_id title lesson module course");
    }
  }

  const requiredQuizIds = requiredQuizzes.map((quiz) => quiz._id);
  const passedAttempts = requiredQuizIds.length
    ? await QuizAttempt.find({
      student: userId,
      quizBank: { $in: requiredQuizIds },
      isPassed: true,
      isTerminatedForCheating: false,
    })
      .select("quizBank score submittedAt")
      .sort({ submittedAt: -1 })
    : [];

  const passedByQuizId = new Map();
  passedAttempts.forEach((attempt) => {
    const key = String(attempt.quizBank);
    if (!passedByQuizId.has(key)) {
      passedByQuizId.set(key, attempt);
    }
  });

  const quizRequirements = requiredQuizzes.map((quiz) => {
    const key = String(quiz._id);
    const passedAttempt = passedByQuizId.get(key);
    return {
      quizId: key,
      title: quiz.title,
      lessonId: quiz.lesson ? String(quiz.lesson) : null,
      moduleId: quiz.module ? String(quiz.module) : null,
      courseId: quiz.course ? String(quiz.course) : null,
      isPassed: Boolean(passedAttempt),
      bestPassedScore: passedAttempt ? Number(passedAttempt.score || 0) : null,
      passedAt: passedAttempt?.submittedAt || null,
    };
  });

  const allRequiredQuizzesPassed = quizRequirements.every((quiz) => quiz.isPassed);
  const eligible = allLecturesCompleted && meetsWatchThreshold && allRequiredQuizzesPassed;

  return {
    eligible,
    details: {
      allLecturesCompleted,
      watchedDuration,
      totalDuration,
      watchRatio,
      watchThreshold: 0.8,
      courseTitle: course.title,
      lectureCount: lectures.length,
      completedLectureCount: lectures.filter((lecture) => {
        const progress = progressByLessonId.get(String(lecture.lectureId));
        return Boolean(progress?.isCompleted);
      }).length,
      requiredQuizCount: quizRequirements.length,
      passedRequiredQuizCount: quizRequirements.filter((quiz) => quiz.isPassed).length,
      allRequiredQuizzesPassed,
      quizRequirements,
    },
  };
};

export const verifyCompletion = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const user = await resolveUser(req);

  const result = await computeEligibility({ userId: user._id, courseId });

  return res
    .status(200)
    .json(new ApiResponse(200, { userId: user._id, courseId, ...result }, "Completion verified"));
});

export const issueCertificate = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) throw new ApiError(400, "courseId is required");

  const user = await resolveUser(req);
  const { eligible, details } = await computeEligibility({ userId: user._id, courseId });

  if (!eligible) {
    throw new ApiError(400, "Student is not eligible for certificate issuance", details);
  }

  const existingCertificate = await Certificate.findOne({ userId: user._id, courseId });
  if (existingCertificate) {
    return res
      .status(200)
      .json(new ApiResponse(200, existingCertificate, "Certificate already issued"));
  }

  const issuedAt = new Date();
  const hash = generateCertificateHash({ userId: user._id, courseId, issuedAt });

  const lastCertificate = await Certificate.findOne().sort({ issuedAt: -1 }).select("hash");
  const previousHash = lastCertificate?.hash || "GENESIS";

  const verificationUrl = `${CERT_VERIFY_BASE_URL}/verify?hash=${hash}`;
  const qrCodeUrl = await generateQRCodeDataUrl(verificationUrl);

  const onChainProof = await issueCertificateOnChain({
    hash,
    previousHash,
    recipientId: String(user._id),
  });

  const certificate = await Certificate.create({
    userId: user._id,
    courseId,
    issuedAt,
    hash,
    previousHash,
    qrCodeUrl,
    onChainTxHash: onChainProof.txHash,
    onChainBlockNumber: onChainProof.blockNumber,
    onChainContractAddress: onChainProof.contractAddress,
    onChainChainId: onChainProof.chainId,
    onChainIssuerAddress: onChainProof.issuerAddress,
    onChainExplorerUrl: onChainProof.explorerUrl,
    onChainRecipientIdHash: onChainProof.recipientIdHash || null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, certificate, "Certificate issued successfully"));
});

export const verifyCertificate = asyncHandler(async (req, res) => {
  const { hash } = req.params;

  const certificate = await Certificate.findOne({ hash })
    .populate("userId", "fullname email")
    .populate("courseId", "title");

  if (!certificate) {
    return res.status(200).json(
      new ApiResponse(200, { valid: false, certificate: null }, "Certificate not found")
    );
  }

  const computedHash = generateCertificateHash({
    userId: certificate.userId?._id || certificate.userId,
    courseId: certificate.courseId?._id || certificate.courseId,
    issuedAt: certificate.issuedAt,
  });

  const hashMatches = computedHash === certificate.hash;
  const onChainState = await verifyCertificateOnChain({ hash: certificate.hash });

  const onChainValid =
    !onChainState.enabled ||
    (onChainState.exists && !onChainState.revoked && onChainState.previousHash === certificate.previousHash);

  const valid = hashMatches && onChainValid;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        valid,
        hashMatches,
        onChainValid,
        onChainState,
        certificate,
        computedHash,
      },
      valid ? "Certificate is valid" : "Certificate hash mismatch"
    )
  );
});

export const getCertificateForCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const user = await resolveUser(req);

  const certificate = await Certificate.findOne({ userId: user._id, courseId })
    .populate("userId", "fullname email")
    .populate("courseId", "title");

  return res
    .status(200)
    .json(new ApiResponse(200, certificate, "Certificate fetched for course"));
});
