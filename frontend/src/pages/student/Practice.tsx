import { useEffect, useMemo, useRef, useState } from "react";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import { Button } from "@/components/ui/button";
import { getAvailableQuizzes, startQuiz, submitQuiz, type QuizBank, type StartQuizResponse } from "@/lib/quiz-api";

export default function StudentPracticePage() {
  const [availableQuizzes, setAvailableQuizzes] = useState<QuizBank[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<StartQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selectedIndex?: number; answerText?: string }>>({});
  const [activityLogs, setActivityLogs] = useState<Array<{ eventType: string; timestamp: string; meta?: string }>>([]);
  const [warningCount, setWarningCount] = useState(0);
  const [result, setResult] = useState<{ score: number; isPassed: boolean; isTerminatedForCheating: boolean } | null>(null);
  const [error, setError] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<number>(0);

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
    setWarningCount(0);
    setActivityLogs([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitting(false);
    try {
      const data = await startQuiz(quizId);
      setActiveQuiz(data);
      startTimeRef.current = Date.now();
      await document.documentElement.requestFullscreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start quiz");
    }
  };

  const questions = activeQuiz?.questions || [];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const currentQuestion = questions[currentQuestionIndex] || null;
  const isLastQuestion = questions.length > 0 && currentQuestionIndex === questions.length - 1;

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
      const formattedAnswers = questions.map((q) => ({
        questionId: q.questionId,
        selectedIndex: answers[q.questionId]?.selectedIndex,
        answerText: answers[q.questionId]?.answerText || "",
      }));
      const data = await submitQuiz(activeQuiz.quizId, {
        attemptId: activeQuiz.attemptId,
        timeTaken: Math.floor((Date.now() - startTimeRef.current) / 1000),
        warningCount,
        answers: formattedAnswers,
        activityLogs,
      });
      setResult(data);
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
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, activeQuiz.questions.length - 1));
  };

  return (
    <AppFrame roleLabel="Student" title="Practice Quiz" subtitle="Attempt published quizzes with fullscreen proctoring and activity monitoring." navItems={studentNav}>
      {!activeQuiz ? (
        <section className="mx-auto max-w-3xl space-y-3">
          {result ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              Score: <span className="font-semibold">{result.score}%</span> • {result.isPassed ? "Passed" : "Not passed"} {result.isTerminatedForCheating ? "• Marked for cheating" : ""}
            </div>
          ) : null}
          {error ? <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
          <div className="dei-card space-y-3 p-5">
            <h2 className="text-base font-semibold">Available Quizzes</h2>
            {!availableQuizzes.length ? <p className="text-sm text-muted-foreground">No published quizzes available yet.</p> : null}
            {availableQuizzes.map((quiz) => (
              <article key={quiz._id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="font-medium">{quiz.title}</p>
                  <p className="text-xs text-muted-foreground">Max warnings: {quiz.maxWarnings}</p>
                </div>
                <Button className="rounded-xl" onClick={() => start(quiz._id)}>Start Quiz</Button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold">{activeQuiz.title}</p>
            <p className="text-muted-foreground">Fullscreen is required. Warnings: {warningCount}/{activeQuiz.maxWarnings}</p>
          </div>
          {warningMessage ? (
            <div className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm text-amber-700">
              Warning: {warningMessage}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">Answered {answeredCount} of {questions.length}</p>
          {currentQuestion ? (
            <article key={currentQuestion.questionId} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-xs text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
              <p className="mb-3 font-medium">{currentQuestion.text}</p>
              {currentQuestion.type === "mcq" ? (
                <div className="space-y-2">
                  {currentQuestion.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
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
                  className="min-h-24 w-full rounded-lg border border-border p-2 text-sm"
                  placeholder={currentQuestion.type === "brief" ? "Write a short answer..." : "Write a detailed answer..."}
                />
              )}
            </article>
          ) : null}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
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
        </section>
      )}
    </AppFrame>
  );
}
