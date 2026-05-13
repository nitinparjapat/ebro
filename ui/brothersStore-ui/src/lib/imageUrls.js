const RESPONSIVE_WIDTHS = [320, 480, 768, 1200];

export const isMediaProxyUrl = (url) =>
  typeof url === "string" && url.includes("/media/");

// Supabase direct URLs contain /storage/v1/object/public/
export const isSupabaseImageUrl = (url) =>
  typeof url === "string" &&
  url.includes("/storage/v1/object/public/");

export const buildImageSrcSet = (url) => {
  if (!url) return undefined;

  // Backend-proxied URLs append ?w params
  if (isMediaProxyUrl(url)) {
    const normalized = String(url).trim();

    return RESPONSIVE_WIDTHS.map(
      (width) => `${normalized}?w=${width} ${width}w`
    ).join(", ");
  }

  // Direct Supabase URLs replace the size variants in the path
  if (isSupabaseImageUrl(url)) {
    const normalized = String(url).trim();

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
