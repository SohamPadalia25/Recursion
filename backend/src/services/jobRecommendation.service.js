import { Certificate } from "../models/certificate.model.js";
import { ApiError } from "../utils/ApiError.js";
import { rankJobsWithGemini } from "./gemini.service.js";

const SKILL_KEYWORDS = [
  "javascript",
  "typescript",
  "react",
  "nextjs",
  "node",
  "express",
  "mongodb",
  "sql",
  "postgres",
  "python",
  "django",
  "flask",
  "java",
  "spring",
  "c++",
  "data structures",
  "algorithms",
  "machine learning",
  "deep learning",
  "ai",
  "genai",
  "cloud",
  "aws",
  "azure",
  "docker",
  "kubernetes",
  "git",
  "rest api",
  "microservices",
  "figma",
  "ui",
  "ux",
  "tailwind",
];

function normalizeJobType(input) {
  const value = String(input || "").toLowerCase();
  if (value.includes("intern")) return "internship";
  if (value.includes("full")) return "full-time";
  if (value.includes("contract")) return "contract";
  return "other";
}

function compactText(parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function extractSkills(text) {
  const blob = String(text || "").toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => blob.includes(skill));
}

function toUniqueJobs(jobs) {
  const seen = new Set();
  const output = [];

  for (const job of jobs) {
    const key = `${job.url || ""}|${(job.title || "").toLowerCase()}|${(job.company || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(job);
  }

  return output;
}

async function fetchRemotiveJobs(search) {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search || "software")}`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const payload = await response.json();
  const rows = Array.isArray(payload.jobs) ? payload.jobs : [];

  return rows.map((row) => {
    const textBlob = compactText([row.title, row.description, ...(row.tags || [])]);
    return {
      title: row.title || "Untitled",
      company: row.company_name || "Unknown",
      location: row.candidate_required_location || "Remote",
      type: normalizeJobType(row.job_type || row.title || ""),
      url: row.url,
      source: "remotive",
      description: row.description || "",
      requiredSkills: extractSkills(textBlob),
      publishedAt: row.publication_date || null,
      remote: true,
    };
  });
}

async function fetchRemoteOkJobs() {
  const response = await fetch("https://remoteok.com/api", {
    headers: {
      "User-Agent": "RecursionJobFinder/1.0",
    },
  });

  if (!response.ok) return [];

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload.slice(1) : [];

  return rows.map((row) => {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    const textBlob = compactText([row.position, row.description, ...tags]);

    return {
      title: row.position || "Untitled",
      company: row.company || "Unknown",
      location: row.location || "Remote",
      type: normalizeJobType(row.position || ""),
      url: row.url,
      source: "remoteok",
      description: row.description || "",
      requiredSkills: extractSkills(textBlob),
      publishedAt: row.date || null,
      remote: true,
    };
  });
}

function buildTrending(jobs) {
  const trendingJobs = jobs.slice(0, 12).map((job) => ({
    title: job.title,
    company: job.company,
    location: job.location,
    type: job.type,
    url: job.url,
    source: job.source,
    requiredSkills: job.requiredSkills,
  }));

  const skillCount = new Map();
  for (const job of jobs) {
    for (const skill of job.requiredSkills || []) {
      skillCount.set(skill, (skillCount.get(skill) || 0) + 1);
    }
  }

  const trendingSkills = Array.from(skillCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([skill, count]) => ({ skill, count }));

  return { trendingJobs, trendingSkills };
}

function filterJobs(jobs, filters) {
  const jobType = String(filters?.jobType || "").toLowerCase();
  const location = String(filters?.location || "").toLowerCase();
  const remoteOnly = Boolean(filters?.remoteOnly);

  return jobs.filter((job) => {
    if (jobType && jobType !== "all" && job.type !== normalizeJobType(jobType)) {
      return false;
    }

    if (remoteOnly && !job.remote && !String(job.location || "").toLowerCase().includes("remote")) {
      return false;
    }

    if (location && location !== "any") {
      const locationBlob = String(job.location || "").toLowerCase();
      if (!locationBlob.includes(location)) return false;
    }

    return true;
  });
}

export async function getTrendingJobsAndSkills() {
  const [remotiveJobs, remoteOkJobs] = await Promise.all([
    fetchRemotiveJobs("software intern").catch(() => []),
    fetchRemoteOkJobs().catch(() => []),
  ]);

  const jobs = toUniqueJobs([...remotiveJobs, ...remoteOkJobs]);
  const { trendingJobs, trendingSkills } = buildTrending(jobs);

  return {
    trendingJobs,
    trendingSkills,
    totalFetched: jobs.length,
  };
}

export async function findJobsFromCertificates({ userId, filters }) {
  const certificates = await Certificate.find({ userId })
    .populate("courseId", "title category tags level")
    .sort({ issuedAt: -1 });

  if (!certificates.length) {
    throw new ApiError(400, "No earned certificates found for this learner.");
  }

  const certificateCourses = certificates
    .map((cert) => cert.courseId)
    .filter(Boolean)
    .map((course) => ({
      courseId: String(course._id || ""),
      title: course.title || "",
      category: course.category || "",
      tags: Array.isArray(course.tags) ? course.tags : [],
      level: course.level || "",
    }));

  const skillTerms = new Set();
  for (const course of certificateCourses) {
    if (course.title) skillTerms.add(course.title);
    if (course.category) skillTerms.add(course.category);
    for (const tag of course.tags) {
      if (tag) skillTerms.add(tag);
    }
  }

  const searchPhrase = Array.from(skillTerms).slice(0, 6).join(" ");

  const [remotiveJobs, remoteOkJobs] = await Promise.all([
    fetchRemotiveJobs(searchPhrase || "software internship").catch(() => []),
    fetchRemoteOkJobs().catch(() => []),
  ]);

  const fetchedJobs = toUniqueJobs([...remotiveJobs, ...remoteOkJobs]);
  const filteredJobs = filterJobs(fetchedJobs, filters);

  if (!filteredJobs.length) {
    return {
      certificateCourses,
      skillTerms: Array.from(skillTerms),
      summary: "No openings matched the selected filters right now.",
      skillGaps: [],
      jobs: [],
      totalFetched: fetchedJobs.length,
    };
  }

  const aiResult = await rankJobsWithGemini({
    certificateContext: {
      certificateCourses,
      skillTerms: Array.from(skillTerms),
    },
    jobs: filteredJobs.slice(0, 40).map((job) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      url: job.url,
      source: job.source,
      requiredSkills: job.requiredSkills,
      description: String(job.description || "").slice(0, 1200),
    })),
    filters,
  });

  const limit = Math.max(1, Math.min(Number(filters?.limit || 12), 20));

  return {
    certificateCourses,
    skillTerms: Array.from(skillTerms),
    summary: aiResult.summary,
    skillGaps: aiResult.skillGaps,
    jobs: Array.isArray(aiResult.jobs) ? aiResult.jobs.slice(0, limit) : [],
    totalFetched: fetchedJobs.length,
  };
}
