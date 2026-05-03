import { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiPlayCircle } from "react-icons/fi";

import { normalizeMediaList } from "../../lib/storeApi";

export default function ProductMediaGallery({
  images = [],
  videos = [],
  title = "Product media",
  className = "",
}) {
  const mediaItems = useMemo(() => {
    const imageItems = normalizeMediaList(images, { preferAbsolute: true }).map(
      (src) => ({
        src,
        type: "image",
      })
    );
    const videoItems = normalizeMediaList(videos, { preferAbsolute: true }).map(
      (src) => ({
        src,
        type: "video",
      })
    );

    return [...imageItems, ...videoItems];
  }, [images, videos]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [title, mediaItems.length]);

  const activeMedia = mediaItems[activeIndex] ?? mediaItems[0];

  if (mediaItems.length === 0) {
    return (
      <div
        className={`flex aspect-square items-center justify-center rounded-2xl bg-gray-100 text-sm font-medium text-gray-500 ${className}`}
      >
        No media available
      </div>
    );
  }

  const moveTo = (delta) => {
    setActiveIndex((currentIndex) => {
      const nextIndex = currentIndex + delta;
      return (nextIndex + mediaItems.length) % mediaItems.length;
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="relative aspect-square w-full bg-gray-100">
          {activeMedia?.type === "video" ? (
            <video
              key={`${title}-video-${activeIndex}`}
              src={activeMedia.src}
              controls
              playsInline
              className="h-full w-full bg-black object-cover"
            />
          ) : (
            <img
              key={`${title}-image-${activeIndex}`}
              src={activeMedia?.src}
              alt={title}
              className="h-full w-full object-cover"
            />
          )}

          {mediaItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => moveTo(-1)}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-md backdrop-blur"
                aria-label="Previous media"
              >
                <FiChevronLeft className="text-xl" />
              </button>

              <button
                type="button"
                onClick={() => moveTo(1)}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-md backdrop-blur"
                aria-label="Next media"
              >
                <FiChevronRight className="text-xl" />
              </button>
            </>
          )}

          <div className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {activeMedia?.type === "video" ? "Video" : "Image"}
          </div>
        </div>
      </div>

      {mediaItems.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mediaItems.map((media, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`${media.type}-${media.src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  isActive ? "border-black" : "border-transparent"
                }`}
                aria-label={`Show ${media.type} ${index + 1}`}
              >
                {media.type === "video" ? (
                  <div className="flex h-full w-full items-center justify-center bg-gray-900 text-white">
                    <FiPlayCircle className="text-3xl" />
                  </div>
                ) : (
                  <img
                    src={media.src}
                    alt={`${title} preview ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
