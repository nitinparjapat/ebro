const RESPONSIVE_WIDTHS = [320, 640, 960, 1280];

export const isMediaImageUrl = (url) =>
  typeof url === "string" && url.includes("/media/images/");

export const buildImageSrcSet = (url) => {
  if (!isMediaImageUrl(url)) {
    return undefined;
  }

  const normalized = String(url).trim();
  return RESPONSIVE_WIDTHS.map((width) => `${normalized}?w=${width} ${width}w`).join(", ");
};

