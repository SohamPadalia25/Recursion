import { API_BASE_URL } from "@/lib/api-client";

export type GraphNode = {
  id: string;
  label: string;
  type: "course" | "module" | "lesson";
  color: string;
  completionStatus: "completed" | "in-progress" | "not-started";
  completionPercentage: number;
  category?: string;
  courseId?: string;
  moduleId?: string;
};

export type GraphLink = {
  source: string;
  target: string;
  type: string;
};

export type StudentProgressGraph = {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    totalNodes: number;
  };
};

export type Neo4jInsights = {
  context: {
    studentId: string;
    courseId: string;
    roadmapId: string;
    roleRoadmapId: string;
  };
  courseStructure: Array<{
    course: string;
    module: string;
    moduleOrder: number;
    topic: string;
    topicOrder: number;
    contentType: string;
  }>;
  coursesSummary: Array<{
    id: string;
    title: string;
    level: string;
    moduleCount: number;
    totalDurationMins: number;
  }>;
  mastery: Array<{
    concept: string;
    domain: string;
    masteryScore: number;
    lastSeen: string;
    status: "mastered" | "learning" | "struggling";
  }>;
  readyToLearn: Array<{
    readyToLearn: string;
    domain: string;
    difficulty: number;
  }>;
  decayingConcepts: Array<{
    concept: string;
    currentMastery: number;
    daysSinceReview: number;
  }>;
  heatmap: Array<{
    domain: string;
    avgMastery: number;
    conceptCount: number;
    weakestScore: number;
  }>;
  linearRoadmap: Array<{
    roadmap: string;
    step: number;
    course: string;
    level: string;
  }>;
  roadmapProgress: Array<{
    roadmap: string;
    type: string;
    status: string;
    total: number;
    done: number;
    completionPct: number;
  }>;
  roleGap: Array<{
    conceptGap: string;
    domain: string;
    masteryPct: number;
  }>;
  studyDebt: {
    student: string;
    studyDebtPoints: number;
    debtStatus: "healthy" | "moderate" | "high" | "critical";
  } | null;
};

export async function getNeo4jInsights(params?: {
  studentId?: string;
  courseId?: string;
  roadmapId?: string;
  roleRoadmapId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.studentId) qs.set("studentId", params.studentId);
  if (params?.courseId) qs.set("courseId", params.courseId);
  if (params?.roadmapId) qs.set("roadmapId", params.roadmapId);
  if (params?.roleRoadmapId) qs.set("roleRoadmapId", params.roleRoadmapId);

  const query = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/neo4j/insights${query}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Failed to load Neo4j insights (${response.status}): ${txt.slice(0, 160)}`);
  }

  return (await response.json()) as Neo4jInsights;
}

export async function getStudentProgressGraph() {
  const response = await fetch(`${API_BASE_URL}/api/student-progress`, {
    credentials: "include",
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Failed to load student progress graph (${response.status}): ${txt.slice(0, 160)}`);
  }

  return (await response.json()) as StudentProgressGraph;
}
