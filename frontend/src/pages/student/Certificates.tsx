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
            <section className="mx-auto max-w-4xl dei-card p-5 md:p-8">
                <div className="rounded-2xl border border-border bg-gradient-to-br from-dei-sky/10 to-dei-peach/10 p-6 md:p-8">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Blockchain-Style Certificate</p>
                    <h2 className="mt-2 text-2xl font-bold text-foreground">Issue certificate for a course</h2>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <input
                            value={courseId}
                            onChange={(e) => setCourseId(e.target.value)}
                            placeholder="Enter course id"
                            className="h-11 flex-1 rounded-xl border border-border bg-background/70 px-3 text-sm outline-none ring-primary/30 focus:ring-2"
                        />
                        <Button variant="outline" className="h-11 rounded-xl" onClick={onCheck} disabled={checking}>
                            {checking ? "Checking..." : "Check Eligibility"}
                        </Button>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground">{statusMessage}</p>

                    <div className="mt-6 flex flex-wrap gap-3">
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
            </section>
        </AppFrame>
    );
}
