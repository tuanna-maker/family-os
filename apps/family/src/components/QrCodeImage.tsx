/** Hiển thị mã QR (dùng cho pass khách, ca giúp việc). */
export function QrCodeImage({
  value,
  size = 200,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  if (!value.trim()) return null;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=8`;
  return (
    <img
      src={src}
      alt="Mã QR"
      width={size}
      height={size}
      className={className ?? "mx-auto rounded-2xl border border-border bg-white p-2"}
      loading="lazy"
    />
  );
}
