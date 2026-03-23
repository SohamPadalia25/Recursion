import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import { AppFrame } from "@/components/platform/AppFrame";
import { Button } from "@/components/ui/button";
import { verifyCertificateByHash } from "@/lib/certificate-api";
import { studentNav } from "../roleNav";

type CertificateView = {
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  hash: string;
  previousHash: string;
  qrCodeUrl: string;
  onChainTxHash: string | null;
  onChainBlockNumber: number | null;
  onChainContractAddress: string | null;
  onChainChainId: number | null;
  onChainIssuerAddress: string | null;
  onChainExplorerUrl: string | null;
};

export default function StudentCertificateDetailPage() {
  const { hash = "" } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<CertificateView | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!hash) {
        setError("Missing certificate hash.");
        setLoading(false);
        return;
      }

      try {
        const result = await verifyCertificateByHash(hash);
        if (!result.valid || !result.certificate) {
          setError("Certificate is invalid or not found.");
          setLoading(false);
          return;
        }

        const cert = result.certificate;
        const user = typeof cert.userId === "string" ? null : cert.userId;
        const course = typeof cert.courseId === "string" ? null : cert.courseId;

        setCertificate({
          studentName: user?.fullname || user?.email || "Student",
          courseTitle: course?.title || "Course",
          issuedAt: cert.issuedAt,
          hash: cert.hash,
          previousHash: cert.previousHash,
          qrCodeUrl: cert.qrCodeUrl,
          onChainTxHash: cert.onChainTxHash || null,
          onChainBlockNumber: cert.onChainBlockNumber || null,
          onChainContractAddress: cert.onChainContractAddress || null,
          onChainChainId: cert.onChainChainId || null,
          onChainIssuerAddress: cert.onChainIssuerAddress || null,
          onChainExplorerUrl: cert.onChainExplorerUrl || null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load certificate.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [hash]);

  const issuedDate = useMemo(() => {
    if (!certificate) return "";
    return new Date(certificate.issuedAt).toLocaleDateString();
  }, [certificate]);

  const onDownloadPdf = () => {
    if (!certificate) return;

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    pdf.setFillColor(247, 249, 255);
    pdf.rect(0, 0, 842, 595, "F");

    pdf.setDrawColor(95, 150, 255);
    pdf.setLineWidth(2);
    pdf.rect(28, 28, 786, 539);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(32);
    pdf.text("Certificate of Completion", 421, 120, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(16);
    pdf.text("Awarded to", 421, 170, { align: "center" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.text(certificate.studentName, 421, 215, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(16);
    pdf.text("For successful completion of", 421, 255, { align: "center" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text(certificate.courseTitle, 421, 290, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.text(`Issued on ${issuedDate}`, 140, 430);
    pdf.text(`Hash: ${certificate.hash.slice(0, 26)}...`, 140, 455);
    pdf.text(`Previous: ${certificate.previousHash.slice(0, 26)}...`, 140, 480);

    if (certificate.qrCodeUrl.startsWith("data:image")) {
      pdf.addImage(certificate.qrCodeUrl, "PNG", 610, 350, 140, 140);
    }

    pdf.save(`certificate-${certificate.hash.slice(0, 8)}.pdf`);
  };

  return (
    <AppFrame
      roleLabel="Student"
      title="Certificate"
      subtitle="Blockchain-style verifiable completion certificate"
      navItems={studentNav}
    >
      <section className="mx-auto max-w-5xl">
        {loading && <p className="text-sm text-muted-foreground">Loading certificate...</p>}

        {!loading && error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button className="mt-4 rounded-xl" onClick={() => navigate("/student/certificates")}>
              Back to certificates
            </Button>
          </div>
        )}

        {!loading && certificate && (
          <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/10 p-6 md:p-10">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Certificate of Completion</p>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">AI Learning Achievement</h2>

            <p className="mt-8 text-sm text-muted-foreground">Awarded to</p>
            <p className="text-2xl font-bold text-foreground md:text-3xl">{certificate.studentName}</p>

            <p className="mt-6 text-sm text-muted-foreground">Course</p>
            <p className="text-xl font-semibold text-foreground">{certificate.courseTitle}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Issued On</p>
                <p className="mt-2 text-sm text-foreground">{issuedDate}</p>
                <p className="mt-4 text-xs text-muted-foreground">Hash</p>
                <p className="mt-1 break-all text-xs text-foreground">{certificate.hash}</p>
                <p className="mt-4 text-xs text-muted-foreground">Previous Hash</p>
                <p className="mt-1 break-all text-xs text-foreground">{certificate.previousHash}</p>

                <p className="mt-4 text-xs text-muted-foreground">On-Chain Tx</p>
                <p className="mt-1 break-all text-xs text-foreground">{certificate.onChainTxHash || "Not configured"}</p>
                <p className="mt-4 text-xs text-muted-foreground">Chain</p>
                <p className="mt-1 text-xs text-foreground">{certificate.onChainChainId || "-"}</p>
                <p className="mt-4 text-xs text-muted-foreground">Contract</p>
                <p className="mt-1 break-all text-xs text-foreground">{certificate.onChainContractAddress || "-"}</p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Verification QR</p>
                <img src={certificate.qrCodeUrl} alt="Certificate verification QR" className="mt-3 h-40 w-40 rounded-md border border-border bg-white p-2" />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="rounded-xl" onClick={onDownloadPdf}>Download PDF</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate(`/verify?hash=${certificate.hash}`)}>
                Verify Publicly
              </Button>
              {certificate.onChainExplorerUrl && (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => window.open(certificate.onChainExplorerUrl || "", "_blank", "noopener,noreferrer")}
                >
                  View On Explorer
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
    </AppFrame>
  );
}
