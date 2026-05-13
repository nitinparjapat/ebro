const RESPONSIVE_WIDTHS = [320, 480, 768, 1200];

export const isMediaProxyUrl = (url) =>
  typeof url === "string" && url.includes("/media/");

// Supabase direct URLs contain /storage/v1/object/public/
export const isSupabaseImageUrl = (url) =>
  typeof url === "string" &&
  url.includes("/storage/v1/object/public/");

const normalizeBaseUrl = (value) => {
  if (!value) return "";
  return String(value).trim().replace(/\/+$/, "");
};

const MEDIA_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_MEDIA_BASE_URL) ||
  (() => {
    const apiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
    if (!apiBase) return "";
    if (!/^https?:\/\//i.test(apiBase)) return "";
    try {
      return new URL(apiBase).origin;
    } catch {
      return "";
    }
  })();

export const resolveMediaUrl = (url) => {
  if (typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (/^(data:|https?:\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/media/") || trimmed.startsWith("media/")) {
    if (!MEDIA_BASE_URL) return trimmed;
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${MEDIA_BASE_URL}${path}`;
  }

  return trimmed;
};

export const buildImageSrcSet = (url) => {
  const resolvedUrl = resolveMediaUrl(url);
  if (!resolvedUrl) return undefined;

  // Backend-proxied URLs append ?w params
  if (isMediaProxyUrl(resolvedUrl)) {
    const normalized = String(resolvedUrl).trim();

    return RESPONSIVE_WIDTHS.map(
      (width) => `${normalized}?w=${width} ${width}w`
    ).join(", ");
  }

  // Direct Supabase URLs replace the size variants in the path
  if (isSupabaseImageUrl(resolvedUrl)) {
    const normalized = String(resolvedUrl).trim();

    return RESPONSIVE_WIDTHS.map((width) => {
      const variantUrl = normalized.replace(
        /\/md\//,
        `/w-${width}/`
      );

      return `${variantUrl} ${width}w`;
    }).join(", ");
  }

  return undefined;
};
