import { apiRequest } from "./api-client";

export type QuizQuestionType = "mcq" | "brief" | "descriptive";

export type QuizBankQuestionInput = {
  type: QuizQuestionType;
  text: string;
  options?: string[];
  correctIndex?: number | null;
  expectedAnswer?: string;
  explanation?: string;
  marks?: number;
  difficulty?: "easy" | "medium" | "hard";
};

export type QuizDistribution = {
  questionsPerStudent: number;
  mcqCount: number;
  briefCount: number;
  descriptiveCount: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  strategy: "balanced" | "random";
};

export type QuizBank = {
  _id: string;
  title: string;
  sourceType: "manual" | "auto" | "prompt" | "pdf";
  questions: QuizBankQuestionInput[];
  distribution: QuizDistribution;
  isPublished: boolean;
  maxWarnings: number;
  createdAt?: string;
};

export type StartQuizResponse = {
  attemptId: string;
  quizId: string;
  title: string;
  maxWarnings: number;
  questions: Array<{
    questionId: string;
    type: QuizQuestionType;
    text: string;
    options: string[];
    marks: number;
  }>;
};

export type SubmitQuizResult = {
  score: number;
  isPassed: boolean;
  isTerminatedForCheating: boolean;
  warningCount: number;
  maxWarnings: number;
};

export async function getInstructorQuizBanks() {
  return apiRequest<QuizBank[]>("quizzes/my");
}

export async function createManualQuizBank(payload: {
  title: string;
  questions: QuizBankQuestionInput[];
  distribution: QuizDistribution;
  maxWarnings: number;
  courseId?: string;
  lessonId?: string;
}) {
  return apiRequest<QuizBank>("quizzes/manual", {
    method: "POST",
    body: payload,
  });
}

export async function generateQuizBank(payload: {
  title: string;
  sourceType: "auto" | "prompt" | "pdf";
  prompt?: string;
  distribution: QuizDistribution;
  maxWarnings: number;
  courseId?: string;
  lessonId?: string;
  pdfFile?: File | null;
}) {
  const token = localStorage.getItem("dei-auth-access-token") || "";
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/api\/v1\/?$/i, "");
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("sourceType", payload.sourceType);
  formData.append("distribution", JSON.stringify(payload.distribution));
  formData.append("maxWarnings", String(payload.maxWarnings));
  if (payload.prompt) formData.append("prompt", payload.prompt);
  if (payload.courseId) formData.append("courseId", payload.courseId);
  if (payload.lessonId) formData.append("lessonId", payload.lessonId);
  if (payload.pdfFile) formData.append("pdf", payload.pdfFile);

  const res = await fetch(`${base}/api/v1/quizzes/generate`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const raw = await res.text();
    throw new Error(`Unexpected response from server (${res.status}). ${raw.slice(0, 200)}`);
  }

  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `Failed to generate quiz (${res.status})`);
  }
  return json.data as QuizBank;
}

export async function publishQuizBank(quizId: string, isPublished: boolean) {
  return apiRequest<QuizBank>(`quizzes/${quizId}/publish`, {
    method: "PATCH",
    body: { isPublished },
  });
}

export async function getAvailableQuizzes() {
  return apiRequest<QuizBank[]>("quizzes/available");
}

export async function startQuiz(quizId: string) {
  return apiRequest<StartQuizResponse>(`quizzes/${quizId}/start`, {
    method: "POST",
  });
}

export async function submitQuiz(
  quizId: string,
  payload: {
    attemptId: string;
    timeTaken: number;
    warningCount: number;
    answers: Array<{ questionId: string; selectedIndex?: number | null; answerText?: string }>;
    activityLogs: Array<{ eventType: string; timestamp: string; meta?: string }>;
  },
) {
  return apiRequest<SubmitQuizResult>(`quizzes/${quizId}/submit`, {
    method: "POST",
    body: payload,
  });
}
