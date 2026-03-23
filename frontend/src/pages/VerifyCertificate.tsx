import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRCode from "@/components/QRCode";
import { Button } from "@/components/ui/button";
import { verifyCertificateByHash } from "@/lib/certificate-api";

export default function VerifyCertificatePage() {
  const [params, setParams] = useSearchParams();
  const [hashInput, setHashInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    studentName?: string;
    courseTitle?: string;
    issuedAt?: string;
    hash?: string;
    hashMatches?: boolean;
    onChainValid?: boolean;
    onChainEnabled?: boolean;
    onChainExists?: boolean;
    onChainRevoked?: boolean;
    onChainContractAddress?: string | null;
    onChainChainId?: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hashFromQuery = params.get("hash") || "";

  const verificationUrl = useMemo(() => {
    if (!result?.hash) return "";
    return `${window.location.origin}/verify?hash=${result.hash}`;
  }, [result?.hash]);

  const runVerification = async (rawHash: string) => {
    const hash = rawHash.trim();
    if (!hash) {
      setError("Please enter a certificate hash.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await verifyCertificateByHash(hash);

      if (!response.valid || !response.certificate) {
        setResult({ valid: false });
        return;
      }

      const cert = response.certificate;
      const user = typeof cert.userId === "string" ? null : cert.userId;
      const course = typeof cert.courseId === "string" ? null : cert.courseId;

      setResult({
        valid: true,
        studentName: user?.fullname || user?.email || "Student",
        courseTitle: course?.title || "Course",
        issuedAt: cert.issuedAt,
        hash: cert.hash,
        hashMatches: response.hashMatches,
        onChainValid: response.onChainValid,
        onChainEnabled: response.onChainState?.enabled,
        onChainExists: response.onChainState?.exists,
        onChainRevoked: response.onChainState?.revoked,
        onChainContractAddress: response.onChainState?.contractAddress || cert.onChainContractAddress || null,
        onChainChainId: response.onChainState?.chainId || cert.onChainChainId || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify certificate.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hashFromQuery) return;
    setHashInput(hashFromQuery);
    runVerification(hashFromQuery);
  }, [hashFromQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-dei-sky/5 to-dei-peach/10 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Certificate Verification</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste a certificate hash or open the page with a QR code link.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="Enter certificate hash"
              className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2"
            />
            <Button
              className="h-11 rounded-xl"
              onClick={() => {
                const trimmed = hashInput.trim();
                setParams(trimmed ? { hash: trimmed } : {});
                runVerification(trimmed);
              }}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>

        {result && (
          <section
            className={`rounded-3xl border p-6 md:p-8 ${
              result.valid
                ? "border-emerald-400/40 bg-emerald-500/5"
                : "border-destructive/40 bg-destructive/5"
            }`}
          >
            <p className="text-lg font-bold text-foreground">
              {result.valid ? "Valid Certificate" : "Invalid Certificate"}
            </p>

            {result.valid && (
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_190px]">
                <div className="space-y-2 text-sm text-foreground">
                  <p>
                    <span className="text-muted-foreground">Student:</span> {result.studentName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Course:</span> {result.courseTitle}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Issued:</span>{" "}
                    {result.issuedAt ? new Date(result.issuedAt).toLocaleString() : "-"}
                  </p>
                  <p className="break-all">
                    <span className="text-muted-foreground">Hash:</span> {result.hash}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Local Hash Check:</span> {result.hashMatches ? "Pass" : "Fail"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">On-Chain Validation:</span> {result.onChainValid ? "Pass" : "Fail"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">On-Chain Mode:</span> {result.onChainEnabled ? "Enabled" : "Disabled"}
                  </p>
                  {result.onChainEnabled && (
                    <>
                      <p>
                        <span className="text-muted-foreground">On-Chain Record Exists:</span> {result.onChainExists ? "Yes" : "No"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Revoked:</span> {result.onChainRevoked ? "Yes" : "No"}
                      </p>
                      <p className="break-all">
                        <span className="text-muted-foreground">Contract:</span> {result.onChainContractAddress || "-"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Chain ID:</span> {result.onChainChainId || "-"}
                      </p>
                    </>
                  )}
                </div>

                {verificationUrl && (
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="mb-2 text-xs text-muted-foreground">QR link</p>
                    <QRCode value={verificationUrl} size={150} />
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
