import { apiRequest } from "@/lib/api-client";

export type Course = {
    _id: string;
    title: string;
    description?: string;
    category?: string;
    level?: string;
    language?: string;
    price?: number;
    thumbnail?: string;
    status?: string;
    isApproved?: boolean;
    enrollmentCount?: number;
    averageRating?: number;
    totalReviews?: number;
    totalDuration?: number;
    instructor?: {
        _id?: string;
        fullname?: string;
        email?: string;
        avatar?: string;
    };
    createdAt?: string;
    updatedAt?: string;
};

export type Enrollment = {
    _id: string;
    course: Course;
    completionPercentage?: number;
    isCompleted?: boolean;
    enrolledAt?: string;
};

export type CourseProgress = {
    completionPercentage: number;
    isCompleted: boolean;
    completedLessons: number;
    totalLessons: number;
    lessons: Array<{
        _id: string;
        title: string;
        duration?: number;
        order?: number;
        module?: string;
        isCompleted: boolean;
    }>;
};

export type AdminStats = {
    totalUsers: number;
    totalStudents: number;
    totalInstructors: number;
    totalCourses: number;
    publishedCourses: number;
    pendingApproval: number;
    totalEnrollments: number;
    newUsers: number;
    flaggedChats: number;
    flaggedReviews: number;
    enrollmentTrend: Array<{ _id: string; count: number }>;
};

export async function getPublishedCourses(params?: {
    category?: string;
    level?: string;
    search?: string;
    page?: number;
    limit?: number;
}) {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.level) query.set("level", params.level);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const data = await apiRequest<{ courses: Course[]; total: number; page: number; totalPages: number }>(
        `/api/v1/courses${query.toString() ? `?${query.toString()}` : ""}`
    );

    return data.courses;
}

export async function getCourseDetail(courseId: string) {
    return apiRequest<{ course: Course; modules: Array<{ _id: string; title: string; description?: string; order: number; lessons: Array<{ _id: string; title: string; duration?: number; order?: number; isFree?: boolean }> }> }>(
        `/api/v1/courses/${courseId}`
    );
}

export async function getLessonDetail(lessonId: string) {
    return apiRequest<{
        _id: string;
        title: string;
        description?: string;
        videoUrl: string;
        duration?: number;
        resources?: Array<{ title: string; url: string; type?: string }>;
        isFree?: boolean;
    }>(`/api/v1/lessons/${lessonId}`);
}

export async function getMyLearning() {
    return apiRequest<Enrollment[]>("/api/v1/users/my-learning");
}

export async function checkEnrollmentStatus(courseId: string) {
    return apiRequest<{ isEnrolled: boolean; enrollment: Enrollment | null }>(`/api/v1/enrollments/status/${courseId}`);
}

export async function enrollInCourse(courseId: string, studyGoal?: string, deadline?: string) {
    return apiRequest("/api/v1/enrollments", {
        method: "POST",
        body: { courseId, studyGoal, deadline },
    });
}

export async function getCourseProgress(courseId: string) {
    return apiRequest<CourseProgress>(`/api/v1/progress/course/${courseId}`);
}

export async function getInstructorCourses() {
    return apiRequest<Course[]>("/api/v1/courses/my-courses");
}

export async function getAdminStats() {
    return apiRequest<AdminStats>("/api/v1/admin/stats");
}

export async function getAdminCourses(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const data = await apiRequest<{ courses: Course[]; total: number }>(
        `/api/v1/admin/courses${query.toString() ? `?${query.toString()}` : ""}`
    );

    return data.courses;
}

export async function getPendingCourses() {
    return apiRequest<Course[]>("/api/v1/admin/courses/pending");
}

export async function approveAdminCourse(courseId: string, approve: boolean, reason?: string) {
    return apiRequest(`/api/v1/admin/courses/${courseId}/approve`, {
        method: "PATCH",
        body: { approve, reason },
    });
}

export async function getAllUsers(params?: { role?: string; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    return apiRequest<{ users: Array<{ _id: string; fullname: string; email: string; role: string; createdAt?: string }>; total: number; page: number }>(
        `/api/v1/admin/users${query.toString() ? `?${query.toString()}` : ""}`
    );
}

export async function getFlaggedChats() {
    return apiRequest<Array<{ _id: string; flagReason?: string; updatedAt?: string; student?: { fullname?: string; email?: string }; course?: { title?: string } }>>(
        "/api/v1/admin/ai/flagged-chats"
    );
}
