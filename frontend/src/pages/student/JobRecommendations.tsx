import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";
import { useAuth } from "@/auth/AuthContext";
import { findJobs, getTrendingJobs, type RecommendedJob } from "@/lib/job-recommendation-api";

export default function StudentJobRecommendationsPage() {
    const { user } = useAuth();
    const token = user?.accessToken || "";

    const [filters, setFilters] = useState({
        location: "",
        jobType: "all" as "all" | "internship" | "full-time" | "contract",
        remoteOnly: true,
        experienceLevel: "entry-level",
        limit: 12,
    });

    const [finderResult, setFinderResult] = useState<{
        summary: string;
        skillGaps: string[];
        jobs: RecommendedJob[];
        totalFetched: number;
        skillTerms: string[];
    } | null>(null);
    const [finderError, setFinderError] = useState("");
    const [runningFinder, setRunningFinder] = useState(false);

    const trendingQuery = useQuery({
        queryKey: ["jobs-trending"],
        queryFn: () => getTrendingJobs(token),
        enabled: Boolean(token),
    });

    const trendingJobs = trendingQuery.data?.trendingJobs || [];
    const trendingSkills = trendingQuery.data?.trendingSkills || [];

    const topSkillLine = useMemo(() => {
        if (!trendingSkills.length) return "";
        return trendingSkills.slice(0, 6).map((item) => item.skill).join(" • ");
    }, [trendingSkills]);

    const handleFindJobs = async () => {
        if (!token) {
            setFinderError("Please login again to use Job Finder.");
            return;
        }

        setRunningFinder(true);
        setFinderError("");

        try {
            const result = await findJobs(token, filters);
            setFinderResult({
                summary: result.summary,
                skillGaps: result.skillGaps,
                jobs: result.jobs,
                totalFetched: result.totalFetched,
                skillTerms: result.skillTerms,
            });
        } catch (error) {
            setFinderResult(null);
            setFinderError(error instanceof Error ? error.message : "Failed to fetch personalized jobs.");
        } finally {
            setRunningFinder(false);
        }
    };

    return (
        <AppFrame
            roleLabel="Student"
            title="Job Recommendations"
            subtitle="Explore trending openings and use AI Job Finder powered by your earned certificates"
            navItems={studentNav}
        >
            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Trending Openings</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{trendingJobs.length}</p>
                </article>
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Trending Skills</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{trendingSkills.length}</p>
                </article>
                <article className="dei-card p-5">
                    <p className="text-sm text-muted-foreground">Web Jobs Fetched</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{trendingQuery.data?.totalFetched || 0}</p>
                </article>
            </section>

            <section className="mb-6 rounded-xl border border-border bg-card p-4">
                <h2 className="text-base font-semibold text-foreground">Most Trending Skills Right Now</h2>
                {trendingQuery.isLoading ? (
                    <p className="mt-2 text-sm text-muted-foreground">Loading trending skills...</p>
                ) : null}
                {trendingQuery.error ? (
                    <p className="mt-2 text-sm text-destructive">{(trendingQuery.error as Error).message}</p>
                ) : null}
                {!trendingQuery.isLoading && !trendingQuery.error ? (
                    <>
                        <p className="mt-2 text-sm text-muted-foreground">{topSkillLine || "No skill trend available yet."}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {trendingSkills.map((skill) => (
                                <span
                                    key={skill.skill}
                                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                                >
                                    {skill.skill} ({skill.count})
                                </span>
                            ))}
                        </div>
                    </>
                ) : null}
            </section>

            <section className="mb-6 rounded-xl border border-border bg-card p-4">
                <h2 className="text-base font-semibold text-foreground">Job Finder</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Click Job Finder to let Gemini analyze your earned certificate courses and find matching jobs or internships.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <input
                        value={filters.location}
                        onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
                        placeholder="Location (optional)"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />

                    <select
                        value={filters.jobType}
                        onChange={(e) =>
                            setFilters((prev) => ({ ...prev, jobType: e.target.value as "all" | "internship" | "full-time" | "contract" }))
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">All Roles</option>
                        <option value="internship">Internships</option>
                        <option value="full-time">Full-Time</option>
                        <option value="contract">Contract</option>
                    </select>

                    <select
                        value={filters.experienceLevel}
                        onChange={(e) => setFilters((prev) => ({ ...prev, experienceLevel: e.target.value }))}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                        <option value="entry-level">Entry Level</option>
                        <option value="junior">Junior</option>
                        <option value="mid-level">Mid Level</option>
                    </select>

                    <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                        <input
                            type="checkbox"
                            checked={filters.remoteOnly}
                            onChange={(e) => setFilters((prev) => ({ ...prev, remoteOnly: e.target.checked }))}
                        />
                        Remote only
                    </label>
                </div>

                <div className="mt-4">
                    <button
                        type="button"
                        onClick={handleFindJobs}
                        disabled={runningFinder}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                        {runningFinder ? "Finding Jobs..." : "Job Finder"}
                    </button>
                </div>

                {finderError ? <p className="mt-3 text-sm text-destructive">{finderError}</p> : null}
            </section>

            <section className="mb-6 rounded-xl border border-border bg-card p-4">
                <h2 className="text-base font-semibold text-foreground">Trending Jobs</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {trendingJobs.map((job) => (
                        <article key={`${job.url}-${job.title}`} className="rounded-lg border border-border p-3">
                            <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{job.company} • {job.location} • {job.type}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {(job.requiredSkills || []).slice(0, 5).map((skill) => (
                                    <span key={skill} className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                            <a
                                href={job.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block text-xs font-medium text-primary"
                            >
                                Apply now
                            </a>
                        </article>
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-base font-semibold text-foreground">Personalized Results</h2>
                {finderResult ? (
                    <>
                        <p className="mt-2 text-sm text-muted-foreground">{finderResult.summary}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Total fetched from web: {finderResult.totalFetched} • Your certificate skills: {finderResult.skillTerms.join(", ") || "None"}
                        </p>

                        {finderResult.skillGaps.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {finderResult.skillGaps.map((gap) => (
                                    <span key={gap} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                                        Skill Gap: {gap}
                                    </span>
                                ))}
                            </div>
                        ) : null}

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {finderResult.jobs.map((job) => (
                                <article key={`${job.url}-${job.title}-${job.company}`} className="rounded-lg border border-border p-3">
                                    <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">{job.company} • {job.location} • {job.type}</p>
                                    {typeof job.matchScore === "number" ? (
                                        <p className="mt-1 text-xs text-muted-foreground">Match score: {job.matchScore}%</p>
                                    ) : null}
                                    {job.matchReason ? <p className="mt-1 text-xs text-muted-foreground">{job.matchReason}</p> : null}
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {(job.requiredSkills || []).slice(0, 6).map((skill) => (
                                            <span key={skill} className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                    <a
                                        href={job.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-block text-xs font-medium text-primary"
                                    >
                                        Open Job
                                    </a>
                                </article>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Run Job Finder to see personalized job matches.</p>
                )}
            </section>
        </AppFrame>
    );
}
