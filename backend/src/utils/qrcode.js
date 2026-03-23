import QRCode from "qrcode";

export const generateQRCodeDataUrl = async (text) => {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
};
