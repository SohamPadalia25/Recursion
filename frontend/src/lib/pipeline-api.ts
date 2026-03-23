import { API_BASE_URL } from "@/lib/api-client";

export type PipelineKind = "audio" | "video";

export type PipelineResponse = {
  pipeline: PipelineKind;
  result: Record<string, unknown>;
  outputUrl?: string | null;
  outputFile?: string | null;
};

export type PipelineJobStatus = "queued" | "running" | "completed" | "failed";

export type PipelineJob = {
  id: string;
  pipeline: PipelineKind;
  status: PipelineJobStatus;
  stage: string;
  progress: number;
  result: PipelineResponse | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

type GeneratePipelineInput = {
  pipeline: PipelineKind;
  prompt?: string;
  pdfFile?: File | null;
  duration?: number;
  voiceStyle?: string;
  difficulty?: string;
  voiceKey?: string;
  useAiImages?: boolean;
};

export async function startPipelineJob(input: GeneratePipelineInput): Promise<{
  jobId: string;
  status: PipelineJobStatus;
  stage: string;
  progress: number;
}> {
  const token = localStorage.getItem("dei-auth-access-token");
  const form = new FormData();

  form.append("pipeline", input.pipeline);
  if (input.prompt?.trim()) form.append("prompt", input.prompt.trim());
  if (input.pdfFile) form.append("pdf", input.pdfFile);
  form.append("duration", String(input.duration ?? 3));
  form.append("voiceStyle", input.voiceStyle || "conversational");
  form.append("difficulty", input.difficulty || "intermediate");
  form.append("voiceKey", input.voiceKey || "male_us");
  form.append("useAiImages", String(input.useAiImages ?? true));

  const response = await fetch(`${API_BASE_URL}/api/v1/pipeline/generate`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const raw = await response.text();
    throw new Error(`Unexpected response from API (${response.status}). ${raw.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    success?: boolean;
    message?: string;
    data?: {
      jobId: string;
      status: PipelineJobStatus;
      stage: string;
      progress: number;
    };
  };

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }

  return payload.data;
}

export async function getPipelineJobStatus(jobId: string): Promise<PipelineJob> {
  const token = localStorage.getItem("dei-auth-access-token");
  const response = await fetch(`${API_BASE_URL}/api/v1/pipeline/status/${jobId}`, {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const raw = await response.text();
    throw new Error(`Unexpected response from API (${response.status}). ${raw.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    success?: boolean;
    message?: string;
    data?: PipelineJob;
  };

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }

  return payload.data;
}
