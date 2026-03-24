import { useEffect, useMemo, useRef, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import { Button } from "@/components/ui/button";
import { getAvailableQuizzes, startQuiz, submitQuiz, getQuizAttemptReport, type QuizBank, type StartQuizResponse, type QuizAttemptReport } from "@/lib/quiz-api";

export default function StudentPracticePage() {
  const [availableQuizzes, setAvailableQuizzes] = useState<QuizBank[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<StartQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selectedIndex?: number; answerText?: string }>>({});
  const [timeByQuestion, setTimeByQuestion] = useState<Record<string, number>>({});
  const [activityLogs, setActivityLogs] = useState<Array<{ eventType: string; timestamp: string; meta?: string }>>([]);
  const [warningCount, setWarningCount] = useState(0);
  const [result, setResult] = useState<{ score: number; isPassed: boolean; isTerminatedForCheating: boolean } | null>(null);
  const [lastAttemptId, setLastAttemptId] = useState<string>("");
  const [report, setReport] = useState<QuizAttemptReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);
  const currentQuestionIdRef = useRef<string>("");

  const pushActivity = (eventType: string, meta = "") => {
    setActivityLogs((prev) => [...prev, { eventType, timestamp: new Date().toISOString(), meta }]);
  };

  const addWarning = (reason: string) => {
    setWarningCount((prev) => prev + 1);
    pushActivity("click", `warning:${reason}`);
    setWarningMessage(reason);
  };

  useEffect(() => {
    getAvailableQuizzes().then(setAvailableQuizzes).catch(() => setAvailableQuizzes([]));
  }, []);

  useEffect(() => {
    if (!activeQuiz) return;

    const onCopy = () => {
      pushActivity("copy");
      addWarning("Copy detected");
    };
    const onPaste = () => {
      pushActivity("paste");
      addWarning("Paste detected");
    };
    const onSelection = () => pushActivity("selection", window.getSelection()?.toString().slice(0, 50) || "");
    const onClick = () => pushActivity("click");
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      pushActivity("context_menu");
      addWarning("Context menu blocked");
    };
    const onVisibility = () => {
      if (document.hidden) {
        pushActivity("visibility_hidden");
        addWarning("Tab switch detected");
      }
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        pushActivity("fullscreen_exit");
        addWarning("Fullscreen exited");
      }
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("selectionchange", onSelection);
    document.addEventListener("click", onClick);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("selectionchange", onSelection);
      document.removeEventListener("click", onClick);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [activeQuiz]);

  const start = async (quizId: string) => {
    setError("");
    setWarningMessage("");
    setResult(null);
    setReport(null);
    setLastAttemptId("");
    setWarningCount(0);
    setActivityLogs([]);
    setAnswers({});
    setTimeByQuestion({});
    setCurrentQuestionIndex(0);
    setIsSubmitting(false);
    try {
      const data = await startQuiz(quizId);
      setActiveQuiz(data);
      startTimeRef.current = Date.now();
      questionStartRef.current = Date.now();
      currentQuestionIdRef.current = data.questions?.[0]?.questionId || "";
      await document.documentElement.requestFullscreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start quiz");
    }
  };

  const questions = activeQuiz?.questions || [];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const currentQuestion = questions[currentQuestionIndex] || null;
  const isLastQuestion = questions.length > 0 && currentQuestionIndex === questions.length - 1;

  const commitTimeForCurrent = () => {
    const qid = currentQuestionIdRef.current;
    if (!qid) return;
    const started = questionStartRef.current;
    if (!started) return;
    const elapsed = Math.max(0, Math.round((Date.now() - started) / 1000));
    if (elapsed <= 0) return;
    setTimeByQuestion((prev) => ({ ...prev, [qid]: (prev[qid] || 0) + elapsed }));
    questionStartRef.current = Date.now();
  };

  const clearQuizState = async () => {
    setActiveQuiz(null);
    setCurrentQuestionIndex(0);
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  const submit = async (forcedReason?: string) => {
    if (!activeQuiz || isSubmitting) return;
    setIsSubmitting(true);
    try {
      commitTimeForCurrent();
      const formattedAnswers = questions.map((q) => ({
        questionId: q.questionId,
        selectedIndex: answers[q.questionId]?.selectedIndex,
        answerText: answers[q.questionId]?.answerText || "",
        timeSpentSeconds: Math.max(0, Math.round(Number(timeByQuestion[q.questionId] || 0))),
      }));
      const data = await submitQuiz(activeQuiz.quizId, {
        attemptId: activeQuiz.attemptId,
        timeTaken: Math.floor((Date.now() - startTimeRef.current) / 1000),
        warningCount,
        answers: formattedAnswers,
        activityLogs,
      });
      setResult({ score: data.score, isPassed: data.isPassed, isTerminatedForCheating: data.isTerminatedForCheating });
      setLastAttemptId(data.attemptId);
      if (forcedReason) {
        setError(`Quiz was auto-submitted: ${forcedReason}`);
      }
      await clearQuizState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!activeQuiz) return;
    if (warningCount >= activeQuiz.maxWarnings) {
      void submit("Maximum warning limit reached");
    }
  }, [activeQuiz, warningCount]);

  useEffect(() => {
    if (!warningMessage) return;
    const id = window.setTimeout(() => setWarningMessage(""), 2600);
    return () => window.clearTimeout(id);
  }, [warningMessage]);

  const goNextQuestion = () => {
    if (!activeQuiz) return;
    commitTimeForCurrent();
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, activeQuiz.questions.length - 1));
  };

  useEffect(() => {
    if (!activeQuiz) return;
    const qid = activeQuiz.questions?.[currentQuestionIndex]?.questionId || "";
    currentQuestionIdRef.current = qid;
    questionStartRef.current = Date.now();
  }, [activeQuiz, currentQuestionIndex]);

  const loadReport = async () => {
    if (!lastAttemptId || loadingReport) return;
    setLoadingReport(true);
    setError("");
    try {
      const data = await getQuizAttemptReport(lastAttemptId);
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load report");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!lastAttemptId) return;
    let cancelled = false;
    let tries = 0;
    const maxTries = 24; // ~48s at 2s interval

    const tick = async () => {
      if (cancelled) return;
      tries += 1;
      try {
        const data = await getQuizAttemptReport(lastAttemptId);
        if (cancelled) return;
        setReport(data);
        if (data.status === "ready") {
          setLoadingReport(false);
          return;
        }
        if (data.status === "failed") {
          setLoadingReport(false);
          return;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load report");
        setLoadingReport(false);
        return;
      }

      if (tries >= maxTries) {
        setLoadingReport(false);
        return;
      }

      window.setTimeout(tick, 2000);
    };

    setLoadingReport(true);
    void tick();

    return () => {
      cancelled = true;
    };
  }, [lastAttemptId]);

  return (
    <AppFrame roleLabel="Student" title="Practice Quiz" subtitle="Attempt published quizzes with fullscreen proctoring and activity monitoring." navItems={studentNav}>
      {!activeQuiz ? (
        <section className="w-full space-y-4">
          {result ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
              Score: <span className="font-semibold">{result.score}%</span> • {result.isPassed ? "Passed" : "Not passed"} {result.isTerminatedForCheating ? "• Marked for cheating" : ""}
              {lastAttemptId ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="rounded-xl" onClick={() => void loadReport()} disabled={loadingReport}>
                    {loadingReport ? "Building report..." : "Refresh report"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <h2 className="text-base font-semibold text-foreground">Available Quizzes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pick a quiz to start a monitored fullscreen attempt.</p>
            </div>
            {!availableQuizzes.length ? <p className="text-sm text-muted-foreground">No published quizzes available yet.</p> : null}
            {availableQuizzes.map((quiz) => (
              <article key={quiz._id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{quiz.title}</p>
                  <p className="text-xs text-muted-foreground">Max warnings: {quiz.maxWarnings}</p>
                </div>
                <Button className="rounded-xl sm:min-w-32" onClick={() => start(quiz._id)}>Start Quiz</Button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="w-full space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Quiz</p>
              <p className="mt-1 font-semibold text-foreground">{activeQuiz.title}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
              <p className="mt-1 font-semibold text-foreground">{answeredCount}/{questions.length} answered</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Warnings</p>
              <p className="mt-1 font-semibold text-foreground">{warningCount}/{activeQuiz.maxWarnings}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">Fullscreen is required. Activity is monitored continuously during this attempt.</p>
          </div>

          {warningMessage ? (
            <div className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm text-amber-700">
              Warning: {warningMessage}
            </div>
          ) : null}

          {currentQuestion ? (
            <article key={currentQuestion.questionId} className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
              <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <p className="mt-1 font-medium text-foreground">{currentQuestion.text}</p>
              </div>
              {currentQuestion.type === "mcq" ? (
                <div className="space-y-2">
                  {currentQuestion.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <input
                        type="radio"
                        name={currentQuestion.questionId}
                        checked={answers[currentQuestion.questionId]?.selectedIndex === i}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.questionId]: { ...prev[currentQuestion.questionId], selectedIndex: i },
                          }))
                        }
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[currentQuestion.questionId]?.answerText || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.questionId]: { ...prev[currentQuestion.questionId], answerText: e.target.value },
                    }))
                  }
                  className="min-h-28 w-full rounded-lg border border-border bg-background p-3 text-sm"
                  placeholder={currentQuestion.type === "brief" ? "Write a short answer..." : "Write a detailed answer..."}
                />
              )}
            </article>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="rounded-xl sm:min-w-40"
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentQuestionIndex === 0 || isSubmitting}
            >
              Previous Question
            </Button>

            {!isLastQuestion ? (
              <Button className="flex-1 rounded-xl" onClick={goNextQuestion} disabled={!currentQuestion || isSubmitting}>
                Next Question
              </Button>
            ) : (
              <Button className="flex-1 rounded-xl" onClick={() => submit()} disabled={!currentQuestion || isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            )}
            </div>
          </div>
        </section>
      )}
    </AppFrame>
  );
}
