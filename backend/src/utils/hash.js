import crypto from "node:crypto";

export const buildCertificateHashPayload = ({ userId, courseId, issuedAt }) => {
  return `${String(userId)}:${String(courseId)}:${new Date(issuedAt).toISOString()}`;
};

export const generateSha256Hash = (value) => {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
};

export const generateCertificateHash = ({ userId, courseId, issuedAt }) => {
  return generateSha256Hash(
    buildCertificateHashPayload({ userId, courseId, issuedAt })
  );
};
