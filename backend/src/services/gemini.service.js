import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "../utils/ApiError.js";

let geminiClient;

function getGeminiClient() {
    if (geminiClient) return geminiClient;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new ApiError(503, "GEMINI_API_KEY is not configured. Job finder AI is unavailable.");
    }

    geminiClient = new GoogleGenerativeAI(apiKey);
    return geminiClient;
}

function parseJsonFromText(text) {
    const trimmed = String(text || "").trim();

    if (trimmed.startsWith("```")) {
        const cleaned = trimmed
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
        return JSON.parse(cleaned);
    }

    return JSON.parse(trimmed);
}

export async function rankJobsWithGemini({
    certificateContext,
    jobs,
    filters,
}) {
    const client = getGeminiClient();
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = client.getGenerativeModel({ model: modelName });

    const prompt = `You are a career recommendation assistant.

Return ONLY valid JSON with this shape:
{
  "summary": "string",
  "skillGaps": ["string"],
  "jobs": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "type": "internship|full-time|contract|other",
      "url": "string",
      "source": "string",
      "requiredSkills": ["string"],
      "matchReason": "string",
      "matchScore": 0
    }
  ]
}

Rules:
- Pick at most ${Math.max(1, Math.min(Number(filters?.limit || 12), 20))} jobs from the candidate list.
- Prefer internships if filters.jobType is internship.
- Prefer higher match score when job text aligns to certificate/course skills.
- matchScore must be integer between 0 and 100.
- Do not fabricate URLs. Only use provided URLs.

Certificate and skill context:
${JSON.stringify(certificateContext, null, 2)}

Filters:
${JSON.stringify(filters || {}, null, 2)}

Candidate jobs:
${JSON.stringify(jobs, null, 2)}
`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const parsed = parseJsonFromText(text);

    const safeJobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];

    return {
        summary: typeof parsed.summary === "string" ? parsed.summary : "Personalized opportunities based on your certificates.",
        skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
        jobs: safeJobs,
    };
}
