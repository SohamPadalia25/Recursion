import { apiRequest } from "@/lib/api-client";

export type AdaptiveLessonMetric = {
    lessonId: string;
    title: string;
    order: number;
    moduleTitle: string;
    mastery: number;
    engagement: number;
    watchRatio: number;
    completed: boolean;
    hasQuizData: boolean;
    bestQuizScore: number | null;
    flashcardCount: number;
};

export type AdaptivePrimaryNext = {
    lessonId: string;
    title: string;
    reason: string;
    priority: number;
};

export type AdaptiveLearningSnapshot = {
    courseEngagementIndex: number;
    masterySummary: {
        mean: number;
        weakest: AdaptiveLessonMetric | null;
        weakLessonCount: number;
    };
    lessonMetrics: AdaptiveLessonMetric[];
    personalizedPath: {
        primaryNext: AdaptivePrimaryNext | null;
        reviewQueue: AdaptiveLessonMetric[];
        resumeLesson: AdaptiveLessonMetric | null;
    };
    quizDifficulty: { level: string; reason: string };
    pacing: string;
    contentDensity: string;
    focusAreas: string[];
    coachingBrief: string;
    nextBestAction: {
        type: string;
        lessonId: string | null;
        reason: string;
    } | null;
};

export async function getAdaptiveLearningSnapshot(courseId: string): Promise<AdaptiveLearningSnapshot> {
    return apiRequest<AdaptiveLearningSnapshot>(`/api/v1/ai/adaptive/${courseId}`);
}
