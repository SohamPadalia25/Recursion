import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppFrame } from "@/components/platform/AppFrame";
import { useAuth } from "@/auth/AuthContext";
import {
    getCertificateForCourse,
    issueCertificate,
    verifyCompletion,
} from "@/lib/certificate-api";
import { studentNav } from "../roleNav";

export default function StudentCertificatesPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [courseId, setCourseId] = useState(params.get("courseId") || "");
    const [checking, setChecking] = useState(false);
    const [issuing, setIssuing] = useState(false);
    const [eligible, setEligible] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Check your course completion status to issue certificate.");
    const [existingHash, setExistingHash] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId.trim()) return;

        const loadExisting = async () => {
            try {
                const existing = await getCertificateForCourse(courseId.trim(), user?.email);
                if (existing?.hash) {
                    setExistingHash(existing.hash);
                    setStatusMessage("Certificate already issued for this course.");
                }
            } catch {
                // Ignore existing certificate lookup errors here.
            }
        };

        loadExisting();
    }, [courseId, user?.email]);

    const isActionableCourse = useMemo(() => courseId.trim().length > 0, [courseId]);
    const hasCertificate = Boolean(existingHash);
    const statusTone = eligible
        ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-700"
        : hasCertificate
            ? "border-sky-300/60 bg-sky-500/10 text-sky-700"
            : "border-border bg-muted/30 text-muted-foreground";

    const onCheck = async () => {
        if (!isActionableCourse) {
            setStatusMessage("Please enter a course id.");
            return;
        }

        setChecking(true);
        setExistingHash(null);

        try {
            const result = await verifyCompletion(courseId.trim(), user?.email);
            setEligible(result.eligible);

            const ratio = (result.details.watchRatio * 100).toFixed(1);
            setStatusMessage(
                result.eligible
                    ? `Eligible now: ${result.details.completedLectureCount}/${result.details.lectureCount} lectures completed and ${ratio}% watch time.`
                    : `Not eligible: ${result.details.completedLectureCount}/${result.details.lectureCount} lectures completed and ${ratio}% watch time.`
            );
        } catch (error) {
            setEligible(false);
            setStatusMessage(error instanceof Error ? error.message : "Eligibility check failed.");
        } finally {
            setChecking(false);
        }
    };

    const onIssue = async () => {
        if (!isActionableCourse) return;

        setIssuing(true);

        try {
            const certificate = await issueCertificate(courseId.trim(), user?.email);
            setExistingHash(certificate.hash);
            setStatusMessage("Certificate issued successfully.");
            navigate(`/student/certificate/${certificate.hash}`);
        } catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Certificate issuance failed.");
        } finally {
            setIssuing(false);
        }
    };

    return (
        <AppFrame
            roleLabel="Student"
            title="Certificates"
            subtitle="Issue verifiable certificates only after true completion checks."
            navItems={studentNav}
        >
            <section className="w-full p-2 md:p-3">
                <div className="space-y-4 rounded-3xl border-2 border-orange-300 bg-card p-3 shadow-[0_8px_24px_rgba(249,115,22,0.08)] md:p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Course ID Status</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">
                                {isActionableCourse ? "Provided" : "Not provided"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Eligibility</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">
                                {eligible ? "Eligible" : "Pending check"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Certificate</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">
                                {hasCertificate ? "Already issued" : "Not issued"}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border-2 border-orange-400 bg-white p-4 shadow-[0_8px_24px_rgba(249,115,22,0.15)] md:p-6">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Blockchain-Style Certificate</p>
                        <h2 className="mt-2 text-2xl font-bold text-foreground">Issue certificate for a course</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Check completion first, then issue only if criteria are met.</p>

                        <div className="mt-5 rounded-xl border border-border bg-background/70 p-3 md:p-4">
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <input
                                    value={courseId}
                                    onChange={(e) => setCourseId(e.target.value)}
                                    placeholder="Enter course id"
                                    className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2"
                                />
                                <Button variant="outline" className="h-11 rounded-xl" onClick={onCheck} disabled={checking}>
                                    {checking ? "Checking..." : "Check Eligibility"}
                                </Button>
                            </div>
                        </div>

                        <div className={`mt-4 rounded-xl border p-3 text-sm ${statusTone}`}>
                            {statusMessage}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                            {eligible && (
                                <Button className="rounded-xl" onClick={onIssue} disabled={issuing}>
                                    {issuing ? "Issuing..." : "Get Certificate"}
                                </Button>
                            )}

                            {existingHash && (
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => navigate(`/student/certificate/${existingHash}`)}
                                >
                                    Open Existing Certificate
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </AppFrame>
    );
}
