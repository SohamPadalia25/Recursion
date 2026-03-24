import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, PlayCircle } from "lucide-react";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { studentNav } from "../roleNav";
import {
    analyzeLessonNotes,
    analyzeLessonDoubt,
    getCourseDetail,
    getCourseProgress,
    getLessonDetail,
    getLessonTranscript,
    saveLessonAttentionScore,
    updateLessonWatchTime,
} from "@/lib/course-api";

type FaceLandmarkPoint = {
    x: number;
    y: number;
};

type FaceLandmarkerResultLike = {
    faceLandmarks?: FaceLandmarkPoint[][];
};

type FaceLandmarkerLike = {
    detectForVideo: (video: HTMLVideoElement, timestampMs: number) => FaceLandmarkerResultLike;
    close?: () => Promise<void> | void;
};

const FAST_FORWARD_THRESHOLD = 1.5;
const SEEK_EVENT_WINDOW_MS = 60_000;
const SEEK_EVENT_THRESHOLD = 4;
const SUSPICIOUS_EVENT_THRESHOLD = 3;

type TranscriptSegment = {
    id: string;
    start: number;
    end: number;
    text: string;
};

type TimestampNote = {
    id: string;
    timestamp: string;
    second: number;
    text: string;
    tags: string[];
};

type PlainTextNote = {
    id: string;
    text: string;
    createdAt: number;
};

type DoubtEntry = {
    id: string;
    timestamp: string;
    second: number;
    transcript: string;
    frameDataUrl: string;
    createdAt: number;
    loading: boolean;
    error: string;
    aiExplanation: string;
    aiSimplerExplanation: string;
    aiPrerequisite: string;
    aiPrerequisiteWhy: string;
};

function formatDuration(seconds: number) {
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const remainingSeconds = total % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function StudentCoursePlayerPage() {
    const { courseId, weekIdx, lectureIdx } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [courseData, setCourseData] = useState<Awaited<ReturnType<typeof getCourseDetail>> | null>(null);
    const [lessonData, setLessonData] = useState<Awaited<ReturnType<typeof getLessonDetail>> | null>(null);
    const [watchedSeconds, setWatchedSeconds] = useState(0);
    const [requiredWatchSeconds, setRequiredWatchSeconds] = useState(0);
    const [isLessonCompleted, setIsLessonCompleted] = useState(false);
    const [isSyncingWatch, setIsSyncingWatch] = useState(false);
    const [attentionScore, setAttentionScore] = useState<number | null>(null);
    const [serverLimited, setServerLimited] = useState(false);
    const [cvAttentionScore, setCvAttentionScore] = useState<number | null>(null);
    const [trackerStatus, setTrackerStatus] = useState("Tracker loading...");
    const [trackerEnabled, setTrackerEnabled] = useState(true);
    const [effectiveLessonDuration, setEffectiveLessonDuration] = useState(0);
    const [lessonProgressMap, setLessonProgressMap] = useState<
        Record<string, { watchedSeconds: number; requiredWatchSeconds: number; isCompleted: boolean }>
    >({});
    const [suspiciousEvents, setSuspiciousEvents] = useState(0);
    const [currentVideoTime, setCurrentVideoTime] = useState(0);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [transcriptError, setTranscriptError] = useState("");
    const [transcriptQuery, setTranscriptQuery] = useState("");
    const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
    const [noteInput, setNoteInput] = useState("");
    const [noteTagsInput, setNoteTagsInput] = useState("");
    const [notes, setNotes] = useState<TimestampNote[]>([]);
    const [notesSavedAt, setNotesSavedAt] = useState("");
    const [notesSearch, setNotesSearch] = useState("");
    const [aiNotesLoading, setAiNotesLoading] = useState(false);
    const [aiNotesError, setAiNotesError] = useState("");
    const [aiSummary, setAiSummary] = useState<string[]>([]);
    const [aiFlashcards, setAiFlashcards] = useState<Array<{ question: string; answer: string; timestamp?: string }>>([]);
    const [aiConcepts, setAiConcepts] = useState<Array<{ concept: string; reason?: string; timestamp?: string }>>([]);
    const [plainNoteInput, setPlainNoteInput] = useState("");
    const [plainNotes, setPlainNotes] = useState<PlainTextNote[]>([]);
    const [doubtEntries, setDoubtEntries] = useState<DoubtEntry[]>([]);

    const moduleIndex = Number(weekIdx ?? 0);
    const lessonIndex = Number(lectureIdx ?? 0);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
    const webcamCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const trackerLoopRef = useRef<number | null>(null);
    const faceLandmarkerRef = useRef<FaceLandmarkerLike | null>(null);
    const lastSyncAtRef = useRef(0);
    const persistedWatchRef = useRef(0);
    const lastPlaybackTimeRef = useRef<number | null>(null);
    const lastPlaybackTickAtRef = useRef<number | null>(null);
    const isSeekingRef = useRef(false);
    const seekEventsRef = useRef<number[]>([]);
    const hasWindowFocusRef = useRef(typeof document !== "undefined" ? document.hasFocus() : true);
    const lastAttentionSyncAtRef = useRef(0);
    const persistedAttentionRef = useRef<number | null>(null);
    const cvAttentionRef = useRef<number | null>(null);
    const cvUiThrottleRef = useRef(0);

    useEffect(() => {
        let mounted = true;

        async function loadCourse() {
            if (!courseId) return;

            setLoading(true);
            setError("");

            try {
                const detail = await getCourseDetail(courseId);
                if (!mounted) return;
                setCourseData(detail);
            } catch (err) {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : "Failed to load course player");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadCourse();

        return () => {
            mounted = false;
        };
    }, [courseId]);

    const activeLessonId = useMemo(() => {
        const module = courseData?.modules?.[moduleIndex];
        const lesson = module?.lessons?.[lessonIndex];
        return lesson?._id;
    }, [courseData, moduleIndex, lessonIndex]);

    const notesStorageKey = useMemo(() => {
        return activeLessonId ? `course-player-notes:${activeLessonId}` : "";
    }, [activeLessonId]);

    const activeLessonDuration = useMemo(() => {
        const module = courseData?.modules?.[moduleIndex];
        const lesson = module?.lessons?.[lessonIndex];
        return Number(lesson?.duration || 0);
    }, [courseData, moduleIndex, lessonIndex]);

    const getRequiredWatchForDuration = useCallback((duration: number) => {
        const numericDuration = Number(duration || 0);
        if (numericDuration <= 0) return 1;
        return Math.ceil(numericDuration * 0.9);
    }, []);

    useEffect(() => {
        if (!courseData?.modules?.length) return;

        const defaults: Record<string, { watchedSeconds: number; requiredWatchSeconds: number; isCompleted: boolean }> = {};
        courseData.modules.forEach((module) => {
            module.lessons.forEach((lesson) => {
                defaults[lesson._id] = {
                    watchedSeconds: 0,
                    requiredWatchSeconds: getRequiredWatchForDuration(Number(lesson.duration || 0)),
                    isCompleted: false,
                };
            });
        });

        setLessonProgressMap((prev) => ({ ...defaults, ...prev }));
    }, [courseData, getRequiredWatchForDuration]);

    useEffect(() => {
        let mounted = true;

        async function loadLesson() {
            if (!activeLessonId) {
                setLessonData(null);
                return;
            }

            try {
                const lesson = await getLessonDetail(activeLessonId);
                if (mounted) {
                    setLessonData(lesson);
                }
            } catch (err) {
                if (mounted) {
                    setLessonData(null);
                    setError(err instanceof Error ? err.message : "Failed to load lesson details");
                }
            }
        }

        loadLesson();

        return () => {
            mounted = false;
        };
    }, [activeLessonId]);

    useEffect(() => {
        if (!notesStorageKey) {
            setNotes([]);
            setAiSummary([]);
            setAiFlashcards([]);
            setAiConcepts([]);
            setNotesSavedAt("");
            return;
        }

        const raw = localStorage.getItem(notesStorageKey);
        if (!raw) {
            setNotes([]);
            setAiSummary([]);
            setAiFlashcards([]);
            setAiConcepts([]);
            setNotesSavedAt("");
            return;
        }

        try {
            const parsed = JSON.parse(raw) as {
                notes?: TimestampNote[];
                aiSummary?: string[];
                aiFlashcards?: Array<{ question: string; answer: string; timestamp?: string }>;
                aiConcepts?: Array<{ concept: string; reason?: string; timestamp?: string }>;
                plainNoteInput?: string;
                plainNotes?: PlainTextNote[];
                doubtEntries?: DoubtEntry[];
                updatedAt?: number;
            };

            setNotes(Array.isArray(parsed.notes) ? parsed.notes : []);
            setAiSummary(Array.isArray(parsed.aiSummary) ? parsed.aiSummary : []);
            setAiFlashcards(Array.isArray(parsed.aiFlashcards) ? parsed.aiFlashcards : []);
            setAiConcepts(Array.isArray(parsed.aiConcepts) ? parsed.aiConcepts : []);
            setPlainNoteInput(typeof parsed.plainNoteInput === "string" ? parsed.plainNoteInput : "");
            setPlainNotes(Array.isArray(parsed.plainNotes) ? parsed.plainNotes : []);
            setDoubtEntries(
                Array.isArray(parsed.doubtEntries)
                    ? parsed.doubtEntries.map((entry) => ({
                          ...entry,
                          loading: false,
                          error: "",
                          aiExplanation: String(entry?.aiExplanation || ""),
                          aiSimplerExplanation: String(entry?.aiSimplerExplanation || ""),
                          aiPrerequisite: String(entry?.aiPrerequisite || ""),
                          aiPrerequisiteWhy: String(entry?.aiPrerequisiteWhy || ""),
                      }))
                    : []
            );
            setNotesSavedAt(parsed.updatedAt ? new Date(parsed.updatedAt).toLocaleTimeString() : "");
        } catch {
            setNotes([]);
            setAiSummary([]);
            setAiFlashcards([]);
            setAiConcepts([]);
            setPlainNoteInput("");
            setPlainNotes([]);
            setDoubtEntries([]);
            setNotesSavedAt("");
        }
    }, [notesStorageKey]);

    useEffect(() => {
        if (!notesStorageKey) return;
        const payload = {
            notes,
            aiSummary,
            aiFlashcards,
            aiConcepts,
            plainNoteInput,
            plainNotes,
            doubtEntries: doubtEntries.map((entry) => ({
                ...entry,
                loading: false,
                error: "",
            })),
            updatedAt: Date.now(),
        };
        localStorage.setItem(notesStorageKey, JSON.stringify(payload));
        setNotesSavedAt(new Date(payload.updatedAt).toLocaleTimeString());
    }, [aiConcepts, aiFlashcards, aiSummary, notes, notesStorageKey, plainNoteInput, plainNotes, doubtEntries]);

    useEffect(() => {
        let mounted = true;

        async function loadTranscript() {
            if (!activeLessonId) {
                setTranscriptSegments([]);
                setTranscriptError("");
                return;
            }

            setTranscriptLoading(true);
            setTranscriptError("");

            try {
                const transcript = await getLessonTranscript(activeLessonId);
                if (!mounted) return;

                const normalized = (transcript.segments || [])
                    .map((segment, index) => ({
                        id: String(segment.id || index),
                        start: Number(segment.start || 0),
                        end: Number(segment.end || Number(segment.start || 0) + 2),
                        text: String(segment.text || "").trim(),
                    }))
                    .filter((segment) => Boolean(segment.text));

                setTranscriptSegments(normalized);
            } catch (err) {
                if (!mounted) return;
                setTranscriptSegments([]);
                setTranscriptError(err instanceof Error ? err.message : "Failed to load transcript");
            } finally {
                if (mounted) setTranscriptLoading(false);
            }
        }

        void loadTranscript();

        return () => {
            mounted = false;
        };
    }, [activeLessonId]);

    useEffect(() => {
        let mounted = true;

        async function loadLessonProgress() {
            if (!courseId || !activeLessonId) return;

            try {
                const progress = await getCourseProgress(courseId);
                if (!mounted) return;

                const activeLessonProgress = progress.lessons.find((lesson) => lesson._id === activeLessonId);
                const initialWatch = Number(activeLessonProgress?.progress?.watchedDuration || 0);
                const durationFromProgress = Number(activeLessonProgress?.duration || 0);
                const baseDuration = Math.max(durationFromProgress, Number(activeLessonDuration || 0));
                const required = Math.ceil(baseDuration * 0.9);
                const savedAttention =
                    typeof activeLessonProgress?.progress?.attentionScore === "number"
                        ? Number(activeLessonProgress.progress.attentionScore)
                        : null;

                setWatchedSeconds(initialWatch);
                setRequiredWatchSeconds(required);
                setIsLessonCompleted(Boolean(activeLessonProgress?.isCompleted));
                setAttentionScore(savedAttention);
                setEffectiveLessonDuration(baseDuration);
                const nextProgressMap: Record<string, { watchedSeconds: number; requiredWatchSeconds: number; isCompleted: boolean }> = {};
                progress.lessons.forEach((lesson) => {
                    const lessonDuration = Number(lesson.duration || 0);
                    const lessonRequired = getRequiredWatchForDuration(lessonDuration);
                    const lessonWatch = Number(lesson.progress?.watchedDuration || 0);
                    nextProgressMap[lesson._id] = {
                        watchedSeconds: lessonWatch,
                        requiredWatchSeconds: lessonRequired,
                        isCompleted: Boolean(lesson.isCompleted),
                    };
                });
                setLessonProgressMap((prev) => ({ ...prev, ...nextProgressMap }));
                persistedWatchRef.current = initialWatch;
                persistedAttentionRef.current = savedAttention;
            } catch {
                if (!mounted) return;
                setWatchedSeconds(0);
                setRequiredWatchSeconds(Math.ceil(activeLessonDuration * 0.9));
                setIsLessonCompleted(false);
                setAttentionScore(null);
                setEffectiveLessonDuration(activeLessonDuration);
                persistedWatchRef.current = 0;
                persistedAttentionRef.current = null;
            }
        }

        loadLessonProgress();

        return () => {
            mounted = false;
        };
    }, [activeLessonDuration, activeLessonId, courseId, getRequiredWatchForDuration]);

    const persistWatchProgress = useCallback(
        async (force = false) => {
            if (!courseId || !activeLessonId) return;

            const currentWatch = Math.floor(Math.max(0, watchedSeconds));
            const effectiveWatch = Math.max(currentWatch, persistedWatchRef.current);
            const shouldSync = force || effectiveWatch - persistedWatchRef.current >= 10;

            if (!shouldSync) return;

            try {
                setIsSyncingWatch(true);
                const result = await updateLessonWatchTime(
                    activeLessonId,
                    courseId,
                    effectiveWatch,
                    effectiveLessonDuration > 0 ? effectiveLessonDuration : undefined,
                );

                const syncedWatch = Math.floor(Number(result?.progress?.watchedDuration || effectiveWatch));
                persistedWatchRef.current = syncedWatch;
                setWatchedSeconds(syncedWatch);
                setRequiredWatchSeconds(Number(result?.requiredWatchSeconds || requiredWatchSeconds));
                setIsLessonCompleted(Boolean(result?.progress?.isCompleted));
                setServerLimited(Boolean(result?.serverCappedIncrement));
                setLessonProgressMap((prev) => ({
                    ...prev,
                    [activeLessonId]: {
                        watchedSeconds: syncedWatch,
                        requiredWatchSeconds: Number(result?.requiredWatchSeconds || requiredWatchSeconds || 1),
                        isCompleted: Boolean(result?.progress?.isCompleted),
                    },
                }));
                if (typeof result?.effectiveLessonDurationSeconds === "number") {
                    setEffectiveLessonDuration(result.effectiveLessonDurationSeconds);
                }
            } catch {
                // silently ignore transient sync errors while video is playing
            } finally {
                setIsSyncingWatch(false);
            }
        },
        [activeLessonId, courseId, effectiveLessonDuration, requiredWatchSeconds, watchedSeconds]
    );

    const computeAttentionScore = useCallback(() => {
        const video = videoRef.current;
        if (!video || video.paused || video.ended) return null;

        let behaviorScore = 100;
        if (document.visibilityState !== "visible") behaviorScore -= 45;
        if (!hasWindowFocusRef.current) behaviorScore -= 25;
        if (video.playbackRate > 1.25) behaviorScore -= 20;
        if (isSeekingRef.current) behaviorScore -= 20;

        const now = Date.now();
        seekEventsRef.current = seekEventsRef.current.filter((ts) => now - ts <= 60000);
        behaviorScore -= Math.min(40, seekEventsRef.current.length * 8);

        behaviorScore = Math.max(0, Math.min(100, Math.round(behaviorScore)));

        const cvScore = cvAttentionRef.current;
        if (typeof cvScore === "number") {
            return Math.round(cvScore * 0.65 + behaviorScore * 0.35);
        }

        return behaviorScore;
    }, []);

    const persistAttentionScore = useCallback(async () => {
        if (!courseId || !activeLessonId) return;

        const now = Date.now();
        if (now - lastAttentionSyncAtRef.current < 15000) return;

        const score = computeAttentionScore();
        if (score === null) return;

        lastAttentionSyncAtRef.current = now;
        setAttentionScore(score);

        const previous = persistedAttentionRef.current;
        if (previous !== null && Math.abs(previous - score) < 3) return;

        try {
            await saveLessonAttentionScore(activeLessonId, courseId, score);
            persistedAttentionRef.current = score;
        } catch {
            // ignore telemetry sync failures to avoid interrupting playback
        }
    }, [activeLessonId, computeAttentionScore, courseId]);

    const getIrisPoint = useCallback((landmarks: Array<{ x: number; y: number }>, eye: "left" | "right") => {
        const irisIndexes = eye === "left" ? [468, 469, 470, 471, 472] : [473, 474, 475, 476, 477];
        const hasIris = irisIndexes.every((idx) => landmarks[idx]);

        if (hasIris) {
            const sum = irisIndexes.reduce(
                (acc, idx) => ({ x: acc.x + landmarks[idx].x, y: acc.y + landmarks[idx].y }),
                { x: 0, y: 0 },
            );
            return { x: sum.x / irisIndexes.length, y: sum.y / irisIndexes.length };
        }

        const outer = eye === "left" ? landmarks[33] : landmarks[362];
        const inner = eye === "left" ? landmarks[133] : landmarks[263];
        return {
            x: ((outer?.x || 0) + (inner?.x || 0)) / 2,
            y: ((outer?.y || 0) + (inner?.y || 0)) / 2,
        };
    }, []);

    const calculateCvAttentionScore = useCallback((landmarks: Array<{ x: number; y: number }>, width: number, height: number) => {
        const leftOuter = { x: landmarks[33].x * width, y: landmarks[33].y * height };
        const leftInner = { x: landmarks[133].x * width, y: landmarks[133].y * height };
        const rightOuter = { x: landmarks[362].x * width, y: landmarks[362].y * height };
        const rightInner = { x: landmarks[263].x * width, y: landmarks[263].y * height };
        const leftIrisBase = getIrisPoint(landmarks, "left");
        const rightIrisBase = getIrisPoint(landmarks, "right");
        const leftIris = { x: leftIrisBase.x * width, y: leftIrisBase.y * height };
        const rightIris = { x: rightIrisBase.x * width, y: rightIrisBase.y * height };

        const calc = (outer: { x: number; y: number }, inner: { x: number; y: number }, iris: { x: number; y: number }) => {
            const midX = (outer.x + inner.x) / 2;
            const midY = (outer.y + inner.y) / 2;
            const eyeWidth = Math.max(1, Math.hypot(outer.x - inner.x, outer.y - inner.y));
            return Math.hypot(iris.x - midX, iris.y - midY) / eyeWidth;
        };

        const gazeDeviation = (calc(leftOuter, leftInner, leftIris) + calc(rightOuter, rightInner, rightIris)) / 2;
        const gazeScore = Math.max(0, Math.min(100, Math.round(100 - gazeDeviation * 180)));
        return gazeScore;
    }, [getIrisPoint]);

    useEffect(() => {
        return () => {
            void persistWatchProgress(true);
        };
    }, [persistWatchProgress]);

    useEffect(() => {
        const onFocus = () => {
            hasWindowFocusRef.current = true;
        };
        const onBlur = () => {
            hasWindowFocusRef.current = false;
        };
        const onVisibilityChange = () => {
            hasWindowFocusRef.current = document.visibilityState === "visible" && document.hasFocus();
        };

        window.addEventListener("focus", onFocus);
        window.addEventListener("blur", onBlur);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("blur", onBlur);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    useEffect(() => {
        lastPlaybackTimeRef.current = null;
        lastPlaybackTickAtRef.current = null;
        isSeekingRef.current = false;
        seekEventsRef.current = [];
        lastAttentionSyncAtRef.current = 0;
        setServerLimited(false);
        setSuspiciousEvents(0);
    }, [activeLessonId]);

    useEffect(() => {
        let isDisposed = false;

        const stopTracker = async () => {
            if (trackerLoopRef.current) {
                cancelAnimationFrame(trackerLoopRef.current);
                trackerLoopRef.current = null;
            }

            if (webcamStreamRef.current) {
                webcamStreamRef.current.getTracks().forEach((track) => track.stop());
                webcamStreamRef.current = null;
            }

            if (faceLandmarkerRef.current?.close) {
                await faceLandmarkerRef.current.close();
                faceLandmarkerRef.current = null;
            }
        };

        const startTracker = async () => {
            if (!trackerEnabled || !activeLessonId) {
                setTrackerStatus("Tracker paused");
                return;
            }

            if (!navigator.mediaDevices?.getUserMedia) {
                setTrackerStatus("Camera API unavailable");
                return;
            }

            try {
                setTrackerStatus("Starting camera...");
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
                if (isDisposed) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                webcamStreamRef.current = stream;

                const webcamVideo = webcamVideoRef.current;
                if (!webcamVideo) return;
                webcamVideo.srcObject = stream;
                await webcamVideo.play();

                setTrackerStatus("Loading eye model...");
                // @ts-expect-error: package resolves at runtime; local TS env may miss its type declarations.
                const vision = await import("@mediapipe/tasks-vision");
                const filesetResolver = await vision.FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
                );

                const landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
                    },
                    runningMode: "VIDEO",
                    numFaces: 1,
                });

                if (isDisposed) {
                    await landmarker.close();
                    return;
                }

                faceLandmarkerRef.current = landmarker;
                setTrackerStatus("Tracking active");

                const runLoop = () => {
                    if (isDisposed) return;

                    const video = webcamVideoRef.current;
                    const canvas = webcamCanvasRef.current;
                    const detector = faceLandmarkerRef.current;

                    if (!video || !canvas || !detector || video.readyState < 2) {
                        trackerLoopRef.current = requestAnimationFrame(runLoop);
                        return;
                    }

                    const width = video.videoWidth || 320;
                    const height = video.videoHeight || 240;

                    if (canvas.width !== width) canvas.width = width;
                    if (canvas.height !== height) canvas.height = height;

                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.clearRect(0, 0, width, height);
                    }

                    const result = detector.detectForVideo(video, performance.now());
                    const landmarks = result?.faceLandmarks?.[0];

                    if (!landmarks) {
                        cvAttentionRef.current = null;
                        const now = Date.now();
                        if (now - cvUiThrottleRef.current > 600) {
                            cvUiThrottleRef.current = now;
                            setCvAttentionScore(null);
                            setTrackerStatus("Face not detected");
                        }
                        trackerLoopRef.current = requestAnimationFrame(runLoop);
                        return;
                    }

                    const score = calculateCvAttentionScore(landmarks, width, height);
                    cvAttentionRef.current = score;

                    if (ctx) {
                        const leftIris = getIrisPoint(landmarks, "left");
                        const rightIris = getIrisPoint(landmarks, "right");

                        ctx.fillStyle = "#1d9bf0";
                        ctx.beginPath();
                        ctx.arc(leftIris.x * width, leftIris.y * height, 4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(rightIris.x * width, rightIris.y * height, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    const now = Date.now();
                    if (now - cvUiThrottleRef.current > 600) {
                        cvUiThrottleRef.current = now;
                        setCvAttentionScore(score);
                        setTrackerStatus("Tracking active");
                    }

                    trackerLoopRef.current = requestAnimationFrame(runLoop);
                };

                trackerLoopRef.current = requestAnimationFrame(runLoop);
            } catch {
                setTrackerStatus("Camera permission denied or model failed");
            }
        };

        void startTracker();

        return () => {
            isDisposed = true;
            void stopTracker();
        };
    }, [activeLessonId, calculateCvAttentionScore, getIrisPoint, trackerEnabled]);

    const nextRoute = useMemo(() => {
        if (!courseData?.modules?.length) return null;

        const currentModule = courseData.modules[moduleIndex];
        if (!currentModule) return null;

        if (lessonIndex + 1 < currentModule.lessons.length) {
            return `/student/course/${courseData.course._id}/learn/${moduleIndex}/${lessonIndex + 1}`;
        }

        if (moduleIndex + 1 < courseData.modules.length && courseData.modules[moduleIndex + 1].lessons.length > 0) {
            return `/student/course/${courseData.course._id}/learn/${moduleIndex + 1}/0`;
        }

        return null;
    }, [courseData, moduleIndex, lessonIndex]);

    const watchProgressPercent = useMemo(() => {
        if (!requiredWatchSeconds) {
            return watchedSeconds > 0 ? 100 : 0;
        }
        return Math.min(100, Math.round((watchedSeconds / requiredWatchSeconds) * 100));
    }, [requiredWatchSeconds, watchedSeconds]);

    const overallSidebarProgress = useMemo(() => {
        const lessons = courseData?.modules?.flatMap((module) => module.lessons || []) || [];
        if (!lessons.length) {
            return {
                totalLessons: 0,
                completedLessons: 0,
                overallPercent: 0,
            };
        }

        let completedLessons = 0;
        let weightedWatched = 0;
        let weightedRequired = 0;

        lessons.forEach((lesson) => {
            const lessonProgress = lessonProgressMap[lesson._id] || {
                watchedSeconds: 0,
                requiredWatchSeconds: getRequiredWatchForDuration(Number(lesson.duration || 0)),
                isCompleted: false,
            };

            if (lessonProgress.isCompleted) {
                completedLessons += 1;
            }

            weightedWatched += Number(lessonProgress.watchedSeconds || 0);
            weightedRequired += Number(lessonProgress.requiredWatchSeconds || 1);
        });

        const overallPercent = weightedRequired > 0
            ? Math.min(100, Math.round((weightedWatched / weightedRequired) * 100))
            : 0;

        return {
            totalLessons: lessons.length,
            completedLessons,
            overallPercent,
        };
    }, [courseData, getRequiredWatchForDuration, lessonProgressMap]);

    const displayAttentionScore = useMemo(() => {
        if (attentionScore !== null) return attentionScore;
        return cvAttentionScore;
    }, [attentionScore, cvAttentionScore]);

    const filteredTranscript = useMemo(() => {
        const q = transcriptQuery.trim().toLowerCase();
        if (!q) return transcriptSegments;
        return transcriptSegments.filter((segment) => segment.text.toLowerCase().includes(q));
    }, [transcriptQuery, transcriptSegments]);

    const filteredNotes = useMemo(() => {
        const q = notesSearch.trim().toLowerCase();
        if (!q) return notes;
        return notes.filter((note) => {
            const inText = note.text.toLowerCase().includes(q);
            const inTags = note.tags.some((tag) => tag.toLowerCase().includes(q));
            return inText || inTags;
        });
    }, [notes, notesSearch]);

    const activeTranscriptId = useMemo(() => {
        const active = transcriptSegments.find((segment) => currentVideoTime >= segment.start && currentVideoTime < segment.end);
        return active?.id || null;
    }, [currentVideoTime, transcriptSegments]);

    const activeTranscriptSegment = useMemo(() => {
        return transcriptSegments.find((segment) => currentVideoTime >= segment.start && currentVideoTime < segment.end) || null;
    }, [currentVideoTime, transcriptSegments]);

    const handleVideoTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        const current = Number(video.currentTime || 0);
        setCurrentVideoTime(current);
        const previous = lastPlaybackTimeRef.current;
        const now = performance.now();
        const previousTick = lastPlaybackTickAtRef.current;

        if (previous === null || previousTick === null) {
            lastPlaybackTimeRef.current = current;
            lastPlaybackTickAtRef.current = now;
            return;
        }

        const delta = current - previous;
        const wallClockDelta = Math.max(0, (now - previousTick) / 1000);
        const playbackRate = Math.max(0.5, Number(video.playbackRate || 1));
        const expectedDelta = Math.max(0, wallClockDelta * playbackRate);
        const allowedEarnedDelta = Math.max(0, expectedDelta * 1.15);
        const isFastForward = playbackRate > FAST_FORWARD_THRESHOLD;
        const hasReliableClockWindow = expectedDelta >= 0.2;
        const isDeltaJump = hasReliableClockWindow && delta > allowedEarnedDelta * 2.2;
        const hasFrequentSeeks = seekEventsRef.current.length >= SEEK_EVENT_THRESHOLD;
        const abuseDetected = isSeekingRef.current || isFastForward || isDeltaJump || hasFrequentSeeks;
        const hasLiveFocus = typeof document.hasFocus === "function" ? document.hasFocus() : hasWindowFocusRef.current;
        const isLegitForwardProgress =
            !isSeekingRef.current &&
            delta > 0 &&
            !video.paused &&
            document.visibilityState === "visible" &&
            (hasWindowFocusRef.current || hasLiveFocus);

        if (isLegitForwardProgress) {
            const earnedDelta = Math.max(0, abuseDetected ? Math.min(delta, allowedEarnedDelta) : delta);
            setWatchedSeconds((prev) => {
                const next = prev + earnedDelta;
                setLessonProgressMap((map) => {
                    const current = map[activeLessonId || ""];
                    if (!activeLessonId || !current) return map;
                    return {
                        ...map,
                        [activeLessonId]: {
                            ...current,
                            watchedSeconds: next,
                        },
                    };
                });
                return next;
            });
        }

        if (abuseDetected) {
            setSuspiciousEvents((prev) => {
                const next = Math.min(prev + 1, 10);
                if (next >= SUSPICIOUS_EVENT_THRESHOLD) {
                    setServerLimited(true);
                }
                return next;
            });
        }

        lastPlaybackTimeRef.current = current;
        lastPlaybackTickAtRef.current = now;

        const nowMs = Date.now();
        if (nowMs - lastSyncAtRef.current >= 15000) {
            lastSyncAtRef.current = nowMs;
            void persistWatchProgress(false);
        }

        void persistAttentionScore();
    }, [activeLessonId, persistAttentionScore, persistWatchProgress]);

    const handleVideoPlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        lastPlaybackTimeRef.current = Number(video.currentTime || 0);
        lastPlaybackTickAtRef.current = performance.now();
        void persistAttentionScore();
    }, [persistAttentionScore]);

    const handleVideoLoadedMetadata = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        const duration = Number(video.duration || 0);
        if (Number.isFinite(duration) && duration > 0) {
            const rounded = Math.ceil(duration);
            setEffectiveLessonDuration((prev) => Math.max(prev, rounded));
            setRequiredWatchSeconds((prev) => Math.max(prev, Math.ceil(rounded * 0.9)));
        }
    }, []);

    const handleVideoSeeking = useCallback(() => {
        isSeekingRef.current = true;
        seekEventsRef.current.push(Date.now());
        const now = Date.now();
        seekEventsRef.current = seekEventsRef.current.filter((ts) => now - ts <= SEEK_EVENT_WINDOW_MS);
    }, []);

    const handleVideoSeeked = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            lastPlaybackTimeRef.current = Number(video.currentTime || 0);
            setCurrentVideoTime(Number(video.currentTime || 0));
        }
        isSeekingRef.current = false;
    }, []);

    const handleTranscriptSeek = useCallback((time: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, time);
        setCurrentVideoTime(Math.max(0, time));
        void video.play().catch(() => {});
    }, []);

    const addTimestampNote = () => {
        const text = noteInput.trim();
        if (!text) return;

        const second = Math.max(0, Math.floor(currentVideoTime));
        const timestamp = formatDuration(second);
        const tags = noteTagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 8);

        const newNote: TimestampNote = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp,
            second,
            text,
            tags,
        };

        setNotes((prev) => [newNote, ...prev]);
        setNoteInput("");
        setNoteTagsInput("");
    };

    const removeNote = (noteId: string) => {
        setNotes((prev) => prev.filter((note) => note.id !== noteId));
    };

    const addPlainNote = () => {
        const text = plainNoteInput.trim();
        if (!text) return;

        const nextNote: PlainTextNote = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            createdAt: Date.now(),
        };

        setPlainNotes((prev) => [nextNote, ...prev]);
        setPlainNoteInput("");
    };

    const removePlainNote = (noteId: string) => {
        setPlainNotes((prev) => prev.filter((note) => note.id !== noteId));
    };

    const captureCurrentFrame = () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return "";

        const maxWidth = 320;
        const sourceWidth = video.videoWidth || 320;
        const sourceHeight = video.videoHeight || 180;
        const width = Math.min(maxWidth, sourceWidth);
        const height = Math.max(1, Math.round((sourceHeight / sourceWidth) * width));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        ctx.drawImage(video, 0, 0, width, height);
        return canvas.toDataURL("image/jpeg", 0.65);
    };

    const markDoubt = async () => {
        const second = Math.max(0, Math.floor(currentVideoTime));
        const timestamp = formatDuration(second);
        const frameDataUrl = captureCurrentFrame();
        const transcript = activeTranscriptSegment?.text || "Transcript not available for this exact moment.";
        const id = `doubt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const entry: DoubtEntry = {
            id,
            timestamp,
            second,
            transcript,
            frameDataUrl,
            createdAt: Date.now(),
            loading: true,
            error: "",
            aiExplanation: "",
            aiSimplerExplanation: "",
            aiPrerequisite: "",
            aiPrerequisiteWhy: "",
        };

        setDoubtEntries((prev) => [entry, ...prev]);

        try {
            const idx = transcriptSegments.findIndex((segment) => segment.id === activeTranscriptSegment?.id);
            const nearby = idx >= 0
                ? transcriptSegments.slice(Math.max(0, idx - 2), Math.min(transcriptSegments.length, idx + 3))
                : transcriptSegments
                      .filter((segment) => Math.abs(segment.start - second) <= 10)
                      .slice(0, 5);

            const result = await analyzeLessonDoubt({
                lessonTitle: activeLesson?.title,
                courseTitle: courseData?.course?.title,
                timestamp,
                transcript,
                contextSegments: nearby.map((segment) => ({
                    timestamp: formatDuration(segment.start),
                    text: segment.text,
                })),
            });

            setDoubtEntries((prev) =>
                prev.map((item) =>
                    item.id === id
                        ? {
                              ...item,
                              loading: false,
                              aiExplanation: result.explanation || "",
                              aiSimplerExplanation: result.simplerExplanation || "",
                              aiPrerequisite: result.relatedPrerequisite || "",
                              aiPrerequisiteWhy: result.prerequisiteWhy || "",
                          }
                        : item
                )
            );
        } catch (err) {
            setDoubtEntries((prev) =>
                prev.map((item) =>
                    item.id === id
                        ? {
                              ...item,
                              loading: false,
                              error: err instanceof Error ? err.message : "Failed to analyze doubt",
                          }
                        : item
                )
            );
        }
    };

    const removeDoubt = (doubtId: string) => {
        setDoubtEntries((prev) => prev.filter((doubt) => doubt.id !== doubtId));
    };

    const savePlainNotes = () => {
        if (!notesStorageKey) return;
        const payload = {
            notes,
            aiSummary,
            aiFlashcards,
            aiConcepts,
            plainNoteInput,
            plainNotes,
            doubtEntries: doubtEntries.map((entry) => ({
                ...entry,
                loading: false,
                error: "",
            })),
            updatedAt: Date.now(),
        };
        localStorage.setItem(notesStorageKey, JSON.stringify(payload));
        setNotesSavedAt(new Date(payload.updatedAt).toLocaleTimeString());
    };

    const runAiNotesEnhancement = async () => {
        if (!notes.length) {
            setAiNotesError("Add notes first to generate AI insights.");
            return;
        }

        setAiNotesLoading(true);
        setAiNotesError("");

        try {
            const result = await analyzeLessonNotes({
                lessonTitle: activeLesson?.title,
                courseTitle: courseData?.course?.title,
                notes: notes.map((note) => ({
                    id: note.id,
                    timestamp: note.timestamp,
                    text: note.text,
                    tags: note.tags,
                })),
            });

            setAiSummary(result.summary || []);
            setAiFlashcards(result.flashcards || []);
            setAiConcepts(result.concepts || []);
        } catch (err) {
            setAiNotesError(err instanceof Error ? err.message : "Failed to run AI notes enhancements");
        } finally {
            setAiNotesLoading(false);
        }
    };

    const handleVideoPause = useCallback(() => {
        void persistWatchProgress(true);
        void persistAttentionScore();
        lastPlaybackTimeRef.current = null;
        lastPlaybackTickAtRef.current = null;
    }, [persistAttentionScore, persistWatchProgress]);

    const handleVideoEnded = useCallback(() => {
        void persistWatchProgress(true);
        void persistAttentionScore();
        lastPlaybackTimeRef.current = null;
        lastPlaybackTickAtRef.current = null;
    }, [persistAttentionScore, persistWatchProgress]);

    if (loading) {
        return (
            <AppFrame roleLabel="Student" title="Player" subtitle="Loading..." navItems={studentNav}>
                <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading video player...</div>
            </AppFrame>
        );
    }

    if (!courseData?.course) {
        return (
            <AppFrame roleLabel="Student" title="Player" subtitle="" navItems={studentNav}>
                <div className="rounded-xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">{error || "Course not found"}</p>
                    <Button className="mt-4" onClick={() => navigate("/student/courses")}>Back to courses</Button>
                </div>
            </AppFrame>
        );
    }

    const activeModule = courseData.modules[moduleIndex];
    const activeLesson = activeModule?.lessons?.[lessonIndex];

    if (!activeModule || !activeLesson) {
        return (
            <AppFrame roleLabel="Student" title={courseData.course.title} subtitle="Invalid lesson" navItems={studentNav}>
                <div className="rounded-xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">Lesson not found in this course.</p>
                    <Button className="mt-4" onClick={() => navigate(`/student/course/${courseData.course._id}`)}>Back to course</Button>
                </div>
            </AppFrame>
        );
    }

    return (
        <AppFrame
            roleLabel="Student"
            title={courseData.course.title}
            subtitle={`${activeModule.title} • ${activeLesson.title}`}
            navItems={studentNav}
        >
            {error ? (
                <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="space-y-4 min-w-0">
                    <div className="flex justify-end">
                        <div className="w-[220px] overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                            <div className="flex items-center justify-between border-b border-border px-2 py-1">
                                <p className="text-[11px] font-semibold text-foreground">Eye Tracking</p>
                                <button
                                    type="button"
                                    className="text-[10px] text-muted-foreground hover:text-foreground"
                                    onClick={() => setTrackerEnabled((prev) => !prev)}
                                >
                                    {trackerEnabled ? "Disable" : "Enable"}
                                </button>
                            </div>
                            <div className="relative aspect-video bg-black">
                                <video ref={webcamVideoRef} muted playsInline className="h-full w-full scale-x-[-1] object-contain" />
                                <canvas ref={webcamCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-contain" />
                                <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                                    {trackerStatus}
                                </div>
                            </div>
                        </div>
                    </div>

                    <article className="overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm">
                        <div className="relative aspect-video bg-black">
                            {lessonData?.videoUrl ? (
                                <video
                                    key={lessonData.videoUrl}
                                    ref={videoRef}
                                    controls
                                    className="h-full w-full"
                                    preload="metadata"
                                    onLoadedMetadata={handleVideoLoadedMetadata}
                                    onPlay={handleVideoPlay}
                                    onSeeking={handleVideoSeeking}
                                    onSeeked={handleVideoSeeked}
                                    onTimeUpdate={handleVideoTimeUpdate}
                                    onPause={handleVideoPause}
                                    onEnded={handleVideoEnded}
                                >
                                    <source src={lessonData.videoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                    <PlayCircle className="h-10 w-10" />
                                </div>
                            )}
                        </div>

                        <div className="border-t border-border px-4 py-3">
                            <h2 className="text-lg font-bold text-foreground">{activeLesson.title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{activeLesson.duration || 0} seconds • {activeLesson.isFree ? "Free lesson" : "Enrolled lesson"}</p>
                            <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                        Watched {Math.floor(watchedSeconds)}s
                                        {requiredWatchSeconds > 0 ? ` / ${requiredWatchSeconds}s required` : ""}
                                    </span>
                                    <span>{isLessonCompleted ? "Completed" : `${watchProgressPercent}%`}</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 rounded-full bg-primary" style={{ width: `${watchProgressPercent}%` }} />
                                </div>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    Progress is tracked from video watch time. Manual ticking is disabled.
                                    {isSyncingWatch ? " Syncing..." : ""}
                                </p>
                                {serverLimited ? (
                                    <p className="mt-1 text-[11px] text-amber-600">
                                        Threshold crossed (frequent seek/fast-forward): only validated watch time is counted.
                                    </p>
                                ) : null}
                                {!serverLimited ? (
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Normal viewing mode active. Watch time increases normally during standard playback.
                                    </p>
                                ) : null}
                                {displayAttentionScore !== null ? (
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Attention score: {displayAttentionScore}/100 (eye tracking + playback behavior)
                                    </p>
                                ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {nextRoute ? (
                                    <Button size="sm" className="rounded-lg" onClick={() => navigate(nextRoute)}>
                                        <CheckCircle2 className="mr-1 h-4 w-4" /> Next lesson
                                    </Button>
                                ) : null}
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => navigate(`/student/course/${courseData.course._id}`)}>
                                    Back to course
                                </Button>
                            </div>
                        </div>
                    </article>

                    {lessonData?.resources?.length ? (
                        <article className="rounded-xl border border-border bg-card p-4">
                            <h3 className="text-base font-semibold text-foreground">Lesson resources</h3>
                            <div className="mt-3 space-y-2">
                                {lessonData.resources.map((resource) => (
                                    <a
                                        key={`${resource.title}-${resource.url}`}
                                        href={resource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
                                    >
                                        <span>{resource.title}</span>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    </a>
                                ))}
                            </div>
                        </article>
                    ) : null}

                    <article className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-semibold text-foreground">AI Transcript (LIVE)</h3>
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Real-time</span>
                        </div>

                        <div className="mt-3">
                            <input
                                type="search"
                                value={transcriptQuery}
                                onChange={(e) => setTranscriptQuery(e.target.value)}
                                placeholder="Search inside video transcript..."
                                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                            />
                        </div>

                        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-2">
                            {transcriptLoading ? (
                                <p className="px-2 py-3 text-sm text-muted-foreground">Generating transcript from video...</p>
                            ) : transcriptError ? (
                                <p className="px-2 py-3 text-sm text-destructive">{transcriptError}</p>
                            ) : filteredTranscript.length ? (
                                filteredTranscript.map((segment) => {
                                    const isActive = segment.id === activeTranscriptId;
                                    return (
                                        <button
                                            key={segment.id}
                                            type="button"
                                            onClick={() => handleTranscriptSeek(segment.start)}
                                            className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${isActive ? "bg-primary/15 text-primary" : "hover:bg-muted text-foreground"}`}
                                        >
                                            <span className="mr-2 text-xs text-muted-foreground">[{formatDuration(segment.start)}]</span>
                                            <span className={isActive ? "font-semibold" : ""}>{segment.text}</span>
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="px-2 py-3 text-sm text-muted-foreground">
                                    {transcriptSegments.length ? "No transcript lines match your search." : "No transcript available for this lesson yet."}
                                </p>
                            )}
                        </div>
                    </article>

                    <article className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-foreground">Doubt Marking System</h3>
                            <Button type="button" size="sm" onClick={markDoubt}>
                                Mark Doubt @ {formatDuration(currentVideoTime)}
                            </Button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Captures timestamp, current video frame, and transcript. AI explains instantly with a simpler version and prerequisite.
                        </p>

                        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-2">
                            {doubtEntries.length ? (
                                doubtEntries.map((doubt) => (
                                    <div key={doubt.id} className="rounded-md border border-border bg-background p-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleTranscriptSeek(doubt.second)}
                                                className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary"
                                            >
                                                {doubt.timestamp}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeDoubt(doubt.id)}
                                                className="ml-auto text-xs text-destructive"
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        {doubt.frameDataUrl ? (
                                            <img
                                                src={doubt.frameDataUrl}
                                                alt={`Doubt frame at ${doubt.timestamp}`}
                                                className="mt-2 h-24 w-full rounded border border-border object-cover"
                                            />
                                        ) : null}

                                        <p className="mt-2 text-xs text-muted-foreground">Transcript</p>
                                        <p className="text-sm text-foreground">{doubt.transcript}</p>

                                        {doubt.loading ? <p className="mt-2 text-xs text-muted-foreground">AI is analyzing this doubt...</p> : null}
                                        {doubt.error ? <p className="mt-2 text-xs text-destructive">{doubt.error}</p> : null}

                                        {doubt.aiExplanation ? (
                                            <div className="mt-2 rounded-md border border-border/80 p-2">
                                                <p className="text-xs font-semibold text-foreground">AI Explanation</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{doubt.aiExplanation}</p>
                                            </div>
                                        ) : null}

                                        {doubt.aiSimplerExplanation ? (
                                            <div className="mt-2 rounded-md border border-border/80 p-2">
                                                <p className="text-xs font-semibold text-foreground">Simpler Explanation</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{doubt.aiSimplerExplanation}</p>
                                            </div>
                                        ) : null}

                                        {doubt.aiPrerequisite ? (
                                            <div className="mt-2 rounded-md border border-border/80 p-2">
                                                <p className="text-xs font-semibold text-foreground">Related Prerequisite</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{doubt.aiPrerequisite}</p>
                                                {doubt.aiPrerequisiteWhy ? (
                                                    <p className="mt-1 text-xs text-muted-foreground">Why: {doubt.aiPrerequisiteWhy}</p>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            ) : (
                                <p className="px-2 py-3 text-sm text-muted-foreground">No doubts marked yet.</p>
                            )}
                        </div>
                    </article>

                    <article className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-foreground">Normal Text Notepad</h3>
                            <p className="text-xs text-muted-foreground">Saved{notesSavedAt ? ` at ${notesSavedAt}` : ""}</p>
                        </div>

                        <textarea
                            value={plainNoteInput}
                            onChange={(e) => setPlainNoteInput(e.target.value)}
                            placeholder="Write simple text notes here..."
                            className="mt-3 min-h-28 w-full rounded-md border border-border bg-background p-3 text-sm"
                        />

                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button type="button" size="sm" onClick={addPlainNote} disabled={!plainNoteInput.trim()}>
                                Add
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={savePlainNotes}>
                                Save
                            </Button>
                        </div>

                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-2">
                            {plainNotes.length ? (
                                plainNotes.map((note) => (
                                    <div key={note.id} className="rounded-md border border-border bg-background p-2">
                                        <div className="flex items-start gap-2">
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                                            <button
                                                type="button"
                                                onClick={() => removePlainNote(note.id)}
                                                className="ml-auto text-xs text-destructive"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="px-2 py-3 text-sm text-muted-foreground">No plain-text notes yet. Type and click Add.</p>
                            )}
                        </div>
                    </article>

                    <article className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-foreground">Timestamp Notes</h3>
                            <p className="text-xs text-muted-foreground">Current: {formatDuration(currentVideoTime)}</p>
                        </div>

                        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_200px_auto]">
                            <input
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                placeholder='Example: "React Hooks explanation"'
                                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                            />
                            <input
                                value={noteTagsInput}
                                onChange={(e) => setNoteTagsInput(e.target.value)}
                                placeholder="tags: react, hooks"
                                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                            />
                            <Button type="button" size="sm" className="h-9" onClick={addTimestampNote}>
                                Add @ {formatDuration(currentVideoTime)}
                            </Button>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <input
                                value={notesSearch}
                                onChange={(e) => setNotesSearch(e.target.value)}
                                placeholder="Search notes or tags..."
                                className="h-8 w-full max-w-[280px] rounded-md border border-border bg-background px-3 text-xs"
                            />
                            <p className="text-xs text-muted-foreground">Auto-saved{notesSavedAt ? ` at ${notesSavedAt}` : ""}</p>
                        </div>

                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border/80 bg-muted/20 p-2">
                            {filteredNotes.length ? (
                                filteredNotes.map((note) => (
                                    <div key={note.id} className="rounded-md border border-border bg-background p-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleTranscriptSeek(note.second)}
                                                className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary"
                                            >
                                                {note.timestamp}
                                            </button>
                                            <p className="text-sm text-foreground">{note.text}</p>
                                            <button
                                                type="button"
                                                onClick={() => removeNote(note.id)}
                                                className="ml-auto text-xs text-destructive"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        {note.tags.length ? (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {note.tags.map((tag) => (
                                                    <span key={`${note.id}-${tag}`} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">#{tag}</span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            ) : (
                                <p className="px-2 py-3 text-sm text-muted-foreground">No notes yet. Add your first timestamp note.</p>
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button type="button" size="sm" onClick={runAiNotesEnhancement} disabled={aiNotesLoading || !notes.length}>
                                {aiNotesLoading ? "Generating AI insights..." : "AI: Summary + Flashcards + Concepts"}
                            </Button>
                            {aiNotesError ? <p className="text-xs text-destructive">{aiNotesError}</p> : null}
                        </div>

                        {aiSummary.length ? (
                            <div className="mt-3 rounded-lg border border-border bg-background p-3">
                                <h4 className="text-sm font-semibold text-foreground">Auto-generated summary</h4>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                    {aiSummary.map((line, index) => (
                                        <li key={`summary-${index}`}>{line}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        {aiConcepts.length ? (
                            <div className="mt-3 rounded-lg border border-border bg-background p-3">
                                <h4 className="text-sm font-semibold text-foreground">Important concepts</h4>
                                <div className="mt-2 space-y-2">
                                    {aiConcepts.map((concept, index) => (
                                        <div key={`concept-${index}`} className="rounded-md border border-border/80 p-2">
                                            <p className="text-sm font-medium text-foreground">
                                                {concept.timestamp ? `${concept.timestamp} - ` : ""}
                                                {concept.concept}
                                            </p>
                                            {concept.reason ? <p className="mt-1 text-xs text-muted-foreground">{concept.reason}</p> : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {aiFlashcards.length ? (
                            <div className="mt-3 rounded-lg border border-border bg-background p-3">
                                <h4 className="text-sm font-semibold text-foreground">Notes to flashcards</h4>
                                <div className="mt-2 space-y-2">
                                    {aiFlashcards.map((card, index) => (
                                        <div key={`card-${index}`} className="rounded-md border border-border/80 p-2">
                                            <p className="text-xs text-muted-foreground">
                                                {card.timestamp ? `${card.timestamp} - ` : ""}Q
                                            </p>
                                            <p className="text-sm font-medium text-foreground">{card.question}</p>
                                            <p className="mt-1 text-sm text-muted-foreground">A: {card.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </article>
                </section>

                <aside className="rounded-xl border border-border/90 bg-card xl:sticky xl:top-24 self-start overflow-hidden shadow-sm">
                    <div className="border-b border-border px-4 py-3">
                        <h3 className="text-base font-bold text-foreground">Course content</h3>
                        <div className="mt-2">
                            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                    {overallSidebarProgress.completedLessons}/{overallSidebarProgress.totalLessons} lessons completed
                                </span>
                                <span>{overallSidebarProgress.overallPercent}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted">
                                <div
                                    className="h-1.5 rounded-full bg-primary"
                                    style={{ width: `${overallSidebarProgress.overallPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="max-h-[72vh] overflow-y-auto px-4 pb-3">
                        <Accordion type="multiple" defaultValue={[activeModule._id]}>
                            {courseData.modules.map((module, modIdx) => (
                                <AccordionItem key={module._id} value={module._id} className="border-border/80">
                                    <AccordionTrigger className="text-left text-sm font-semibold">
                                        <div>
                                            <p>{module.title}</p>
                                            <p className="text-xs text-muted-foreground font-normal">{module.lessons.length} lessons</p>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-1">
                                            {module.lessons.map((lesson, lesIdx) => {
                                                const isActive = modIdx === moduleIndex && lesIdx === lessonIndex;
                                                const lessonProgress = lessonProgressMap[lesson._id] || {
                                                    watchedSeconds: 0,
                                                    requiredWatchSeconds: getRequiredWatchForDuration(Number(lesson.duration || 0)),
                                                    isCompleted: false,
                                                };
                                                const lessonPercent = lessonProgress.requiredWatchSeconds > 0
                                                    ? Math.min(100, Math.round((lessonProgress.watchedSeconds / lessonProgress.requiredWatchSeconds) * 100))
                                                    : lessonProgress.watchedSeconds > 0
                                                        ? 100
                                                        : 0;
                                                return (
                                                    <button
                                                        key={lesson._id}
                                                        type="button"
                                                        onClick={() => navigate(`/student/course/${courseData.course._id}/learn/${modIdx}/${lesIdx}`)}
                                                        className={`w-full rounded-lg border px-3 py-2 text-left ${isActive ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/40"}`}
                                                    >
                                                        <p className="text-sm text-foreground">{lesson.title}</p>
                                                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                                            <span>{lesson.duration || 0} seconds</span>
                                                            <span>{lessonProgress.isCompleted ? "Completed" : `${lessonPercent}%`}</span>
                                                        </div>
                                                        <div className="mt-1 h-1.5 rounded-full bg-muted">
                                                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${lessonPercent}%` }} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </aside>
            </div>
        </AppFrame>
    );
}
