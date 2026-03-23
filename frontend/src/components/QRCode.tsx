import { QRCodeSVG } from "qrcode.react";

type Props = {
  value: string;
  size?: number;
  className?: string;
};

export default function QRCode({ value, size = 176, className }: Props) {
  return (
    <div className={className}>
      <QRCodeSVG value={value} size={size} level="M" includeMargin />
    </div>
  );
}
