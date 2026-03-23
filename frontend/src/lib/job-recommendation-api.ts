import { API_BASE_URL, apiFetch } from "./api-client";

const API_V1_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/i, "") + "/api/v1";

export type TrendingSkill = {
    skill: string;
    count: number;
};

export type RecommendedJob = {
    title: string;
    company: string;
    location: string;
    type: "internship" | "full-time" | "contract" | "other";
    url: string;
    source: string;
    requiredSkills: string[];
    matchReason?: string;
    matchScore?: number;
};

export type TrendingJobsResponse = {
    trendingJobs: RecommendedJob[];
    trendingSkills: TrendingSkill[];
    totalFetched: number;
};

export type JobFinderResponse = {
    certificateCourses: Array<{
        courseId: string;
        title: string;
        category: string;
        tags: string[];
        level: string;
    }>;
    skillTerms: string[];
    summary: string;
    skillGaps: string[];
    jobs: RecommendedJob[];
    totalFetched: number;
};

export async function getTrendingJobs(token: string): Promise<TrendingJobsResponse> {
    return apiFetch<TrendingJobsResponse>(`${API_V1_BASE_URL}/ai/jobs/trending`, {
        method: "GET",
        token,
    });
}

export async function findJobs(token: string, payload: {
    location?: string;
    jobType?: "all" | "internship" | "full-time" | "contract";
    remoteOnly?: boolean;
    experienceLevel?: string;
    limit?: number;
}): Promise<JobFinderResponse> {
    return apiFetch<JobFinderResponse>(`${API_V1_BASE_URL}/ai/jobs/finder`, {
        method: "POST",
        token,
        body: payload,
    });
}
