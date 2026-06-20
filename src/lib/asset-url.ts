export const assetUrlMessage =
  "Use https://..., http://localhost..., or /uploads/...";

export function isAssetUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("/uploads/")) return true;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return true;
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}
