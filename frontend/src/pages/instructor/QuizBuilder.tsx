import { useEffect, useMemo, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { instructorNav } from "../roleNav";
import { Button } from "@/components/ui/button";
import {
  createManualQuizBank,
  generateQuizBank,
  getInstructorQuizBanks,
  publishQuizBank,
  type QuizBank,
  type QuizBankQuestionInput,
  type QuizDistribution,
} from "@/lib/quiz-api";
import { getCourseDetail, getInstructorCourses, type Course } from "@/lib/course-api";

const defaultDistribution: QuizDistribution = {
  questionsPerStudent: 10,
  mcqCount: 6,
  briefCount: 3,
  descriptiveCount: 1,
  easyCount: 3,
  mediumCount: 5,
  hardCount: 2,
  strategy: "balanced",
};

const modeConfig = [
  {
    id: "manual",
    label: "Manual Builder",
    description: "Write your own questions and answers.",
  },
  {
    id: "auto",
    label: "AI Auto",
    description: "Generate a full bank automatically.",
  },
  {
    id: "prompt",
    label: "AI Prompt",
    description: "Guide generation with your own prompt.",
  },
  {
    id: "topic",
    label: "AI Topic",
    description: "Generate from a specific topic you provide.",
  },
  {
    id: "pdf",
    label: "AI PDF",
    description: "Generate from uploaded PDF content.",
  },
] as const;

export default function InstructorQuizBuilderPage() {
  const [mode, setMode] = useState<"manual" | "auto" | "prompt" | "topic" | "pdf">("manual");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [topic, setTopic] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [distribution, setDistribution] = useState<QuizDistribution>(defaultDistribution);
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [questionDraft, setQuestionDraft] = useState<QuizBankQuestionInput>({ type: "mcq", text: "", options: ["", "", "", ""], correctIndex: 0, marks: 1, difficulty: "medium" });
  const [manualQuestions, setManualQuestions] = useState<QuizBankQuestionInput[]>([]);
  const [quizBanks, setQuizBanks] = useState<QuizBank[]>([]);
  const [instructorCourses, setInstructorCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [courseDetail, setCourseDetail] = useState<Awaited<ReturnType<typeof getCourseDetail>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = async () => {
    try {
      const data = await getInstructorQuizBanks();
      setQuizBanks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quiz banks");
    }
  };

  useEffect(() => {
    refresh();
    getInstructorCourses().then((data) => setInstructorCourses(data || [])).catch(() => setInstructorCourses([]));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setCourseDetail(null);
      setSelectedModuleId("");
      setSelectedLessonId("");
      return;
    }

    let mounted = true;
    const loadCourse = async () => {
      try {
        const detail = await getCourseDetail(selectedCourseId);
        if (!mounted) return;
        setCourseDetail(detail);
      } catch {
        if (!mounted) return;
        setCourseDetail(null);
      }
    };

    void loadCourse();
    return () => {
      mounted = false;
    };
  }, [selectedCourseId]);

  const totalConfigured = useMemo(
    () => Number(distribution.mcqCount) + Number(distribution.briefCount) + Number(distribution.descriptiveCount),
    [distribution],
  );
  const totalDifficultyConfigured = useMemo(
    () => Number(distribution.easyCount) + Number(distribution.mediumCount) + Number(distribution.hardCount),
    [distribution],
  );

  const addDraftQuestion = () => {
    if (!questionDraft.text?.trim()) return;
    setManualQuestions((prev) => [...prev, questionDraft]);
    setQuestionDraft({ type: "mcq", text: "", options: ["", "", "", ""], correctIndex: 0, marks: 1, difficulty: "medium" });
  };

  const onCreateOrGenerate = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!title.trim()) throw new Error("Quiz title is required");
      if (totalConfigured <= 0) throw new Error("Question type distribution cannot be empty");
      if (totalDifficultyConfigured <= 0) throw new Error("Difficulty distribution cannot be empty");

      if (mode === "manual") {
        if (!manualQuestions.length) throw new Error("Add at least one manual question");
        await createManualQuizBank({
          title: title.trim(),
          questions: manualQuestions,
          distribution: { ...distribution, questionsPerStudent: totalConfigured },
          maxWarnings,
          courseId: selectedCourseId || undefined,
          moduleId: selectedModuleId || undefined,
          lessonId: selectedLessonId || undefined,
        });
      } else {
        await generateQuizBank({
          title: title.trim(),
          sourceType: mode,
          prompt: prompt.trim() || undefined,
          topic: topic.trim() || undefined,
          pdfFile,
          distribution: { ...distribution, questionsPerStudent: totalConfigured },
          maxWarnings,
          courseId: selectedCourseId || undefined,
          moduleId: selectedModuleId || undefined,
          lessonId: selectedLessonId || undefined,
        });
      }

      setTitle("");
      setPrompt("");
      setTopic("");
      setPdfFile(null);
      setManualQuestions([]);
      setSelectedCourseId("");
      setSelectedModuleId("");
      setSelectedLessonId("");
      setCourseDetail(null);
      await refresh();
      setSuccess(mode === "manual" ? "Question bank created." : "AI question bank generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save quiz bank");
    } finally {
      setLoading(false);
    }
  };

  const onTogglePublish = async (bank: QuizBank) => {
    try {
      setError("");
      setSuccess("");
      await publishQuizBank(bank._id, !bank.isPublished);
      await refresh();
      setSuccess(bank.isPublished ? "Quiz bank unpublished." : "Quiz bank published.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quiz bank");
    }
  };

  return (
    <AppFrame
      roleLabel="Instructor"
      title="Quiz Builder"
      subtitle="Create professional question banks, generate with AI, and control student distribution."
      navItems={instructorNav}
    >
      <div className="space-y-5">
        {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p> : null}
        {success ? <p className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">{success}</p> : null}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="dei-card p-5 md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Create Question Bank</h2>
            <p className="text-sm text-muted-foreground">Choose a mode, define distribution, then publish when ready.</p>
          </div>

          <div className="mb-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {modeConfig.map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id)}
                className={`rounded-xl border p-3 text-left transition ${mode === item.id
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
                  }`}
              >
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Quiz Title</span>
              <input
                className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 outline-none ring-primary/30 focus:ring-2"
                placeholder="e.g. PostgreSQL Advanced Assessment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Max Cheat Warnings</span>
              <input
                type="number"
                min={1}
                value={maxWarnings}
                onChange={(e) => setMaxWarnings(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 outline-none ring-primary/30 focus:ring-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Course (optional)</span>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedModuleId("");
                  setSelectedLessonId("");
                }}
                className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 outline-none ring-primary/30 focus:ring-2"
              >
                <option value="">Any course</option>
                {instructorCourses.map((course) => (
                  <option key={course._id} value={course._id}>{course.title}</option>
                ))}
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-muted-foreground">Module (optional)</span>
              <select
                value={selectedModuleId}
                onChange={(e) => {
                  setSelectedModuleId(e.target.value);
                  setSelectedLessonId("");
                }}
                className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 outline-none ring-primary/30 focus:ring-2"
                disabled={!selectedCourseId || !courseDetail?.modules?.length}
              >
                <option value="">Course-level quiz</option>
                {(courseDetail?.modules || []).map((module) => (
                  <option key={module._id} value={module._id}>{module.title}</option>
                ))}
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-muted-foreground">Topic Lesson (optional)</span>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 outline-none ring-primary/30 focus:ring-2"
                disabled={!selectedCourseId || !selectedModuleId || !courseDetail?.modules?.length}
              >
                <option value="">Module-level quiz</option>
                {(courseDetail?.modules || [])
                  .filter((module) => module._id === selectedModuleId)
                  .flatMap((module) =>
                    (module.lessons || []).map((lesson) => (
                      <option key={lesson._id} value={lesson._id}>{module.title} - {lesson.title}</option>
                    ))
                  )}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Choose only course for course-level gating, choose module for module-level, or pick lesson for topic-level unlock.
              </span>
            </label>
          </div>

          <div className="mb-5 rounded-xl border border-border/60 bg-muted/20 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Student Distribution</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input type="number" min={0} value={distribution.mcqCount} onChange={(e) => setDistribution((prev) => ({ ...prev, mcqCount: Number(e.target.value) }))} className="h-10 rounded-xl border border-border px-3 text-sm" placeholder="MCQ count" />
              <input type="number" min={0} value={distribution.briefCount} onChange={(e) => setDistribution((prev) => ({ ...prev, briefCount: Number(e.target.value) }))} className="h-10 rounded-xl border border-border px-3 text-sm" placeholder="Brief count" />
              <input type="number" min={0} value={distribution.descriptiveCount} onChange={(e) => setDistribution((prev) => ({ ...prev, descriptiveCount: Number(e.target.value) }))} className="h-10 rounded-xl border border-border px-3 text-sm" placeholder="Descriptive count" />
              <select
                value={distribution.strategy}
                onChange={(e) => setDistribution((prev) => ({ ...prev, strategy: e.target.value as QuizDistribution["strategy"] }))}
                className="h-10 rounded-xl border border-border px-3 text-sm"
              >
                <option value="balanced">Balanced</option>
                <option value="random">Random</option>
              </select>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input type="number" min={0} value={distribution.easyCount} onChange={(e) => setDistribution((prev) => ({ ...prev, easyCount: Number(e.target.value) }))} className="h-10 rounded-xl border border-border px-3 text-sm" placeholder="Easy count" />
              <input type="number" min={0} value={distribution.mediumCount} onChange={(e) => setDistribution((prev) => ({ ...prev, mediumCount: Number(e.target.value) }))} className="h-10 rounded-xl border border-border px-3 text-sm" placeholder="Medium count" />
              <input type="number" min={0} value={distribution.hardCount} onChange={(e) => setDistribution((prev) => ({ ...prev, hardCount: Number(e.target.value) }))} className="h-10 rounded-xl border border-border px-3 text-sm" placeholder="Hard count" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Total by type: {totalConfigured} | Total by difficulty: {totalDifficultyConfigured}
            </p>
          </div>

          {mode === "prompt" ? (
            <textarea
              className="mb-4 min-h-28 w-full rounded-xl border border-border bg-muted/30 p-3 text-sm outline-none ring-primary/30 focus:ring-2"
              placeholder="Describe coverage, difficulty, and focus areas for AI generation..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          ) : null}

          {mode === "topic" ? (
            <input
              className="mb-4 h-11 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm outline-none ring-primary/30 focus:ring-2"
              placeholder="Enter topic (e.g. Dynamic Programming, React Hooks, SQL Joins)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          ) : null}

          {mode === "pdf" ? (
            <label className="mb-4 block rounded-xl border border-dashed border-border p-4 text-sm">
              <span className="mb-2 block font-medium text-foreground">Upload Reference PDF</span>
              <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="w-full text-sm" />
              <span className="mt-2 block text-xs text-muted-foreground">{pdfFile ? `Selected: ${pdfFile.name}` : "No file selected"}</span>
            </label>
          ) : null}

          {mode === "manual" ? (
            <div className="mb-4 rounded-xl border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Manual Question Composer</h3>
              <div className="space-y-2">
                <select value={questionDraft.type} onChange={(e) => setQuestionDraft((prev) => ({ ...prev, type: e.target.value as QuizBankQuestionInput["type"] }))} className="h-10 w-full rounded-lg border border-border px-3 text-sm">
                  <option value="mcq">MCQ</option>
                  <option value="brief">Brief</option>
                  <option value="descriptive">Descriptive</option>
                </select>
                <select
                  value={questionDraft.difficulty || "medium"}
                  onChange={(e) => setQuestionDraft((prev) => ({ ...prev, difficulty: e.target.value as "easy" | "medium" | "hard" }))}
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input value={questionDraft.text} onChange={(e) => setQuestionDraft((prev) => ({ ...prev, text: e.target.value }))} placeholder="Question text" className="h-10 w-full rounded-lg border border-border px-3 text-sm" />
                {questionDraft.type === "mcq" ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {(questionDraft.options || []).map((opt, i) => (
                      <input key={i} value={opt} onChange={(e) => setQuestionDraft((prev) => ({ ...prev, options: (prev.options || []).map((it, idx) => (idx === i ? e.target.value : it)) }))} placeholder={`Option ${i + 1}`} className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                    ))}
                    <input type="number" min={0} max={3} value={Number(questionDraft.correctIndex ?? 0)} onChange={(e) => setQuestionDraft((prev) => ({ ...prev, correctIndex: Number(e.target.value) }))} className="h-9 w-full rounded-lg border border-border px-3 text-sm md:col-span-2" placeholder="Correct option index (0-3)" />
                  </div>
                ) : (
                  <textarea value={questionDraft.expectedAnswer || ""} onChange={(e) => setQuestionDraft((prev) => ({ ...prev, expectedAnswer: e.target.value }))} placeholder="Expected answer (optional for auto evaluation)" className="min-h-20 w-full rounded-lg border border-border p-2 text-sm" />
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{manualQuestions.length} question(s) added</p>
                  <Button className="rounded-xl" onClick={addDraftQuestion}>Add Question</Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
            <p className="text-sm text-muted-foreground">
              Ready to {mode === "manual" ? "create" : "generate"} bank with <span className="font-semibold text-foreground">{totalConfigured}</span> assigned questions.
            </p>
            <Button className="rounded-xl px-6" onClick={onCreateOrGenerate} disabled={loading}>
              {loading ? "Saving..." : mode === "manual" ? "Create Bank" : "Generate with AI"}
            </Button>
          </div>
        </section>

        <section className="dei-card p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">My Question Banks</h2>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{quizBanks.length} total</span>
          </div>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {quizBanks.length === 0 ? <p className="text-sm text-muted-foreground">No quiz banks yet.</p> : null}
            {quizBanks.map((bank) => (
              <article key={bank._id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{bank.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Source: {bank.sourceType.toUpperCase()} | Questions: {bank.questions?.length || 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scope: {bank.lesson ? "Lesson" : bank.module ? "Module" : bank.course ? "Course" : "Global"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5">MCQ {bank.distribution?.mcqCount || 0}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5">Brief {bank.distribution?.briefCount || 0}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5">Descriptive {bank.distribution?.descriptiveCount || 0}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5">Easy {bank.distribution?.easyCount || 0}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5">Medium {bank.distribution?.mediumCount || 0}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5">Hard {bank.distribution?.hardCount || 0}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${bank.isPublished ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {bank.isPublished ? "Published" : "Draft"}
                    </span>
                    <div>
                      <Button variant={bank.isPublished ? "outline" : "default"} className="rounded-xl" onClick={() => onTogglePublish(bank)}>
                        {bank.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
