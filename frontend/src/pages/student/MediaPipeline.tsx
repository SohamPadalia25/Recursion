import { useEffect, useMemo, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import { API_BASE_URL } from "@/lib/api-client";
import {
  getPipelineJobStatus,
  startPipelineJob,
  type PipelineKind,
  type PipelineResponse,
} from "@/lib/pipeline-api";

export default function StudentMediaPipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineKind>("audio");
  const [prompt, setPrompt] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(3);
  const [voiceStyle, setVoiceStyle] = useState("conversational");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [voiceKey, setVoiceKey] = useState("male_us");
  const [useAiImages, setUseAiImages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<PipelineResponse | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<"idle" | "queued" | "running" | "completed" | "failed">("idle");
  const [jobStage, setJobStage] = useState("Idle");
  const [jobProgress, setJobProgress] = useState(0);

  const resolvedOutputUrl = useMemo(() => {
    if (!output?.outputUrl) return null;
    if (output.outputUrl.startsWith("http")) return output.outputUrl;
    return `${API_BASE_URL}${output.outputUrl}`;
  }, [output]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOutput(null);
    setJobId(null);
    setJobStatus("idle");
    setJobStage("Idle");
    setJobProgress(0);

    if (!prompt.trim() && !pdfFile) {
      setError("Please provide a prompt or upload a PDF.");
      return;
    }

    setIsSubmitting(true);
    try {
      const started = await startPipelineJob({
        pipeline,
        prompt,
        pdfFile,
        duration,
        voiceStyle,
        difficulty,
        voiceKey,
        useAiImages,
      });
      setJobId(started.jobId);
      setJobStatus(started.status);
      setJobStage(started.stage);
      setJobProgress(started.progress);
    } catch (submitError) {
      setOutput(null);
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    let active = true;
    const tick = async () => {
      try {
        const state = await getPipelineJobStatus(jobId);
        if (!active) return;

        setJobStatus(state.status);
        setJobStage(state.stage || "Running");
        setJobProgress(typeof state.progress === "number" ? state.progress : 0);

        if (state.status === "completed") {
          setOutput(state.result);
          return;
        }

        if (state.status === "failed") {
          setError(state.error || "Pipeline failed");
          return;
        }
      } catch (pollError) {
        if (!active) return;
        setError(pollError instanceof Error ? pollError.message : "Failed to fetch job status");
      }

      setTimeout(tick, 1500);
    };

    tick();
    return () => {
      active = false;
    };
  }, [jobId]);

  return (
    <AppFrame
      roleLabel="Student"
      title="Media Pipeline"
      subtitle="Generate learning audio or explainer videos from a prompt or PDF."
      navItems={studentNav}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Pipeline Type</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPipeline("audio")}
                className={`rounded-lg px-4 py-2 text-sm ${pipeline === "audio" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
              >
                Audio
              </button>
              <button
                type="button"
                onClick={() => setPipeline("video")}
                className={`rounded-lg px-4 py-2 text-sm ${pipeline === "video" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
              >
                Video
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Prompt</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm"
              rows={5}
              placeholder="Explain recursion with real-life examples..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Upload PDF (optional)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Duration (minutes)</span>
              <input
                type="number"
                min={1}
                max={10}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 1)}
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
              />
            </label>

            {pipeline === "audio" ? (
              <label className="block">
                <span className="text-sm font-medium text-foreground">Voice Style</span>
                <select
                  value={voiceStyle}
                  onChange={(e) => setVoiceStyle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                >
                  <option value="conversational">Conversational</option>
                  <option value="academic">Academic</option>
                  <option value="storytelling">Storytelling</option>
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-foreground">Voice</span>
                <select
                  value={voiceKey}
                  onChange={(e) => setVoiceKey(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                >
                  <option value="male_us">Male US</option>
                  <option value="female_us">Female US</option>
                  <option value="female_uk">Female UK</option>
                </select>
              </label>
            )}
          </div>

          {pipeline === "audio" ? (
            <label className="block">
              <span className="text-sm font-medium text-foreground">Difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          ) : (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={useAiImages}
                onChange={(e) => setUseAiImages(e.target.checked)}
              />
              Use AI image generation
            </label>
          )}

          {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

          {jobStatus !== "idle" && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">
                Status: <span className="capitalize">{jobStatus}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Current Stage: {jobStage}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, jobProgress))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{jobProgress}%</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || jobStatus === "queued" || jobStatus === "running"}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isSubmitting || jobStatus === "queued" || jobStatus === "running"
              ? "Generating..."
              : `Generate ${pipeline === "audio" ? "Audio" : "Video"}`}
          </button>
        </form>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Output</h2>

          {!output && (
            <p className="text-sm text-muted-foreground">
              Submit a prompt or PDF to generate content. Your output will appear here.
            </p>
          )}

          {output && (
            <>
              <p className="text-sm text-muted-foreground">
                Pipeline: <span className="font-medium text-foreground">{output.pipeline}</span>
              </p>

              {resolvedOutputUrl && output.pipeline === "audio" && (
                <audio controls className="w-full">
                  <source src={resolvedOutputUrl} />
                </audio>
              )}

              {resolvedOutputUrl && output.pipeline === "video" && (
                <video controls className="w-full rounded-lg border border-border">
                  <source src={resolvedOutputUrl} />
                </video>
              )}

              <pre className="max-h-[360px] overflow-auto rounded-lg bg-muted/40 p-3 text-xs text-foreground">
                {JSON.stringify(output.result, null, 2)}
              </pre>
            </>
          )}
        </section>
      </div>
    </AppFrame>
  );
}
