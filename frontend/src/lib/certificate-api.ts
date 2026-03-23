export type VerifyCompletionResult = {
  eligible: boolean;
  details: {
    allLecturesCompleted: boolean;
    watchedDuration: number;
    totalDuration: number;
    watchRatio: number;
    watchThreshold: number;
    courseTitle: string;
    lectureCount: number;
    completedLectureCount: number;
  };
};

export type CertificateRecord = {
  _id: string;
  userId:
    | string
    | {
        _id: string;
        fullname?: string;
        email?: string;
      };
  courseId:
    | string
    | {
        _id: string;
        title?: string;
      };
  issuedAt: string;
  hash: string;
  previousHash: string;
  qrCodeUrl: string;
  onChainTxHash?: string | null;
  onChainBlockNumber?: number | null;
  onChainContractAddress?: string | null;
  onChainChainId?: number | null;
  onChainIssuerAddress?: string | null;
  onChainExplorerUrl?: string | null;
  onChainRecipientIdHash?: string | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  data: T;
  message: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_ROOT_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/i, "");

const getAuthHeaders = () => {
  try {
    const raw = localStorage.getItem("dei-auth-user");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { accessToken?: string };
    return parsed?.accessToken
      ? { Authorization: `Bearer ${parsed.accessToken}` }
      : {};
  } catch {
    return {};
  }
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const raw = await response.text();
    const hint = raw.startsWith("<!DOCTYPE")
      ? "Received HTML instead of API JSON. Ensure backend is running and VITE_API_BASE_URL points to backend."
      : "Received non-JSON response from API.";

    throw new Error(`${hint} Status: ${response.status}`);
  }

  const data = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !data.success) {
    throw new Error(data?.message || "Request failed");
  }
  return data.data;
};

export const verifyCompletion = async (courseId: string, userEmail?: string) => {
  const response = await fetch(`${API_ROOT_BASE_URL}/api/verify-completion/${courseId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ userEmail }),
  });

  return parseResponse<VerifyCompletionResult>(response);
};

export const issueCertificate = async (courseId: string, userEmail?: string) => {
  const response = await fetch(`${API_ROOT_BASE_URL}/api/certificate/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ courseId, userEmail }),
  });

  return parseResponse<CertificateRecord>(response);
};

export const verifyCertificateByHash = async (hash: string) => {
  const response = await fetch(`${API_ROOT_BASE_URL}/api/certificate/verify/${hash}`, {
    headers: {
      ...getAuthHeaders(),
    },
    credentials: "include",
  });

  return parseResponse<{
    valid: boolean;
    hashMatches: boolean;
    onChainValid: boolean;
    onChainState: {
      enabled: boolean;
      exists: boolean;
      revoked: boolean;
      chainId: number | null;
      contractAddress: string | null;
      issuer: string | null;
      issuedAtUnix: number | null;
      previousHash: string | null;
    };
    certificate: CertificateRecord | null;
  }>(response);
};

export const getCertificateForCourse = async (courseId: string, userEmail?: string) => {
  const query = userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : "";
  const response = await fetch(`${API_ROOT_BASE_URL}/api/certificate/course/${courseId}${query}`, {
    headers: {
      ...getAuthHeaders(),
    },
    credentials: "include",
  });

  return parseResponse<CertificateRecord | null>(response);
};
