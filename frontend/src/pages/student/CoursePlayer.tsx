import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, PlayCircle } from "lucide-react";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { studentNav } from "../roleNav";
import {
    getCourseDetail,
    getCourseProgress,
    getLessonDetail,
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
    const hasWindowFocusRef = useRef(true);
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

        window.addEventListener("focus", onFocus);
        window.addEventListener("blur", onBlur);

        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("blur", onBlur);
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

    const handleVideoTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        const current = Number(video.currentTime || 0);
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
        const allowedEarnedDelta = Math.max(0, wallClockDelta * playbackRate * 1.1);
        const isFastForward = playbackRate > FAST_FORWARD_THRESHOLD;
        const isDeltaJump = delta > allowedEarnedDelta * 1.6;
        const hasFrequentSeeks = seekEventsRef.current.length >= SEEK_EVENT_THRESHOLD;
        const abuseDetected = isSeekingRef.current || isFastForward || isDeltaJump || hasFrequentSeeks;
        const isLegitForwardProgress =
            !isSeekingRef.current &&
            delta > 0 &&
            !video.paused &&
            document.visibilityState === "visible" &&
            hasWindowFocusRef.current;

        if (isLegitForwardProgress) {
            const earnedDelta = abuseDetected ? Math.min(delta, allowedEarnedDelta) : delta;
            setWatchedSeconds((prev) => {
                const next = Number((prev + earnedDelta).toFixed(2));
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
        }
        isSeekingRef.current = false;
    }, []);

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
