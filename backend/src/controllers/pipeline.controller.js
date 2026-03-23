import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../../");
const pipelineBridgePath = path.resolve(backendRoot, "pipeline_bridge.py");
const pipelineJobs = new Map();

function getPythonCommand() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  return process.platform === "win32" ? "python" : "python3";
}

function getStageFromLine(line, pipeline) {
  const text = String(line || "").toLowerCase();

  if (pipeline === "video") {
    if (text.includes("step 1/7")) return { stage: "Extracting input", progress: 15 };
    if (text.includes("step 2/7")) return { stage: "Summarizing content", progress: 30 };
    if (text.includes("step 3/7")) return { stage: "Generating script", progress: 45 };
    if (text.includes("step 4/7")) return { stage: "Building storyboard", progress: 60 };
    if (text.includes("step 5/7")) return { stage: "Generating narration", progress: 75 };
    if (text.includes("step 6/7")) return { stage: "Generating visuals", progress: 88 };
    if (text.includes("step 7/7")) return { stage: "Assembling video", progress: 96 };
  }

  if (pipeline === "audio") {
    if (text.includes("stage 1:")) return { stage: "Generating script", progress: 35 };
    if (text.includes("stage 1b:")) return { stage: "Optimizing script", progress: 60 };
    if (text.includes("stage 2:")) return { stage: "Generating audio", progress: 90 };
  }

  if (text.includes("pipeline complete")) return { stage: "Finalizing output", progress: 99 };
  return null;
}

function updateJob(jobId, updates) {
  const existing = pipelineJobs.get(jobId);
  if (!existing) return;
  pipelineJobs.set(jobId, {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  });
}

function cleanupOldJobs() {
  const now = Date.now();
  const maxAgeMs = 1000 * 60 * 60;
  for (const [id, job] of pipelineJobs.entries()) {
    if ((job.status === "completed" || job.status === "failed") && now - job.updatedAt > maxAgeMs) {
      pipelineJobs.delete(id);
    }
  }
}

const runLearningPipeline = asyncHandler(async (req, res) => {
  const { pipeline = "audio", prompt, duration, voiceStyle, difficulty, voiceKey, useAiImages } = req.body;
  const pdfPath = req.file?.path;

  const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  if (!trimmedPrompt && !pdfPath) {
    throw new ApiError(400, "Provide either a prompt or a PDF file");
  }

  if (!["audio", "video"].includes(pipeline)) {
    throw new ApiError(400, "pipeline must be either 'audio' or 'video'");
  }

  const args = [
    pipelineBridgePath,
    "--pipeline",
    pipeline,
    "--duration",
    String(Number(duration) > 0 ? Number(duration) : 3),
  ];

  if (trimmedPrompt) args.push("--topic", trimmedPrompt);
  if (pdfPath) args.push("--pdf", path.resolve(pdfPath));

  if (pipeline === "audio") {
    args.push("--style", voiceStyle || "conversational");
    args.push("--difficulty", difficulty || "intermediate");
  } else {
    args.push("--voice", voiceKey || "male_us");
    if (String(useAiImages).toLowerCase() === "false") {
      args.push("--no-ai-images");
    }
  }

  const pythonCommand = getPythonCommand();
  const jobId = randomUUID();
  cleanupOldJobs();
  pipelineJobs.set(jobId, {
    id: jobId,
    pipeline,
    status: "queued",
    stage: "Queued",
    progress: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    result: null,
    error: null,
  });

  const child = spawn(pythonCommand, args, {
    cwd: backendRoot,
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
  });

  updateJob(jobId, { status: "running", stage: "Starting pipeline", progress: 10 });

  let stdout = "";
  let stderr = "";
  let markerPayload = null;

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    stdout += text;

    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      if (line.startsWith("__PIPELINE_JSON__")) {
        try {
          markerPayload = JSON.parse(line.replace("__PIPELINE_JSON__", ""));
        } catch {
          markerPayload = null;
        }
        continue;
      }

      const stageUpdate = getStageFromLine(line, pipeline);
      if (stageUpdate) {
        updateJob(jobId, {
          stage: stageUpdate.stage,
          progress: stageUpdate.progress,
        });
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  child.on("error", async (err) => {
    updateJob(jobId, {
      status: "failed",
      stage: "Failed",
      error: err?.message || "Failed to start pipeline process",
      progress: 100,
    });
    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
  });

  const killTimer = setTimeout(() => {
    child.kill("SIGTERM");
  }, 1000 * 60 * 25);

  child.on("close", async (code) => {
    clearTimeout(killTimer);

    if (markerPayload?.success && markerPayload?.data) {
      updateJob(jobId, {
        status: "completed",
        stage: "Completed",
        progress: 100,
        result: markerPayload.data,
      });
    } else {
      const parseHint = markerPayload?.error
        ? markerPayload.error
        : `Pipeline output parse failed (code ${code}). stderr: ${stderr || "none"}`;
      updateJob(jobId, {
        status: "failed",
        stage: "Failed",
        progress: 100,
        error: parseHint,
      });
    }

    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
  });

  return res.status(202).json(
    new ApiResponse(
      202,
      {
        jobId,
        status: "queued",
        stage: "Queued",
        progress: 5,
      },
      "Pipeline job accepted"
    )
  );
});

const getPipelineJobStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = pipelineJobs.get(jobId);
  if (!job) {
    throw new ApiError(404, "Pipeline job not found");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      id: job.id,
      pipeline: job.pipeline,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    })
  );
});

export { runLearningPipeline, getPipelineJobStatus };
