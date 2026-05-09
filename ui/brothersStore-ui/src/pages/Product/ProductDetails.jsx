import { useEffect, useMemo, useState } from "react";
import { FaHeart } from "react-icons/fa";
import {
  FiChevronLeft,
  FiChevronRight,
  FiMinus,
  FiPlay,
  FiPlus,
  FiShield,
  FiTag,
  FiTruck,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import Rating from "../../components/common/Rating";
import Navbar from "../../components/layout/Navbar";
import ProductGrid from "../../components/product/ProductGrid";
import ProductReviews from "../../components/product/ProductReviews";
import { useCart } from "../../context/CartContext";
import { useProducts } from "../../context/ProductsContext";
import { useReviews } from "../../context/ReviewsContext";
import { useWishlist } from "../../context/WishlistContext";
import { getDiscountPercent } from "../../lib/storeApi";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart, decreaseQuantity } = useCart();
  const { loadProduct, productLookup, products } = useProducts();
  const {
    getApprovedReviewsForProduct,
    loadApprovedReviewsForProduct,
    submitReview,
  } = useReviews();
  const { wishlist, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [shouldLoadActiveVideo, setShouldLoadActiveVideo] = useState(false);
  const [isActiveVideoLoading, setIsActiveVideoLoading] = useState(false);

  const productId = Number(id);

  useEffect(() => {
    let ignore = false;
    const cachedProduct = productLookup[productId];

    if (cachedProduct) {
      queueMicrotask(() => {
        setProduct(cachedProduct);
        setSelectedImageIndex(0);
        setLoading(false);
      });
    }

    const fetchProduct = async () => {
      try {
        setLoading(!cachedProduct);
        const loadedProduct = await loadProduct(productId);

        if (ignore) {
          return;
        }

        setProduct(loadedProduct);
        setSelectedImageIndex(0);
        setPageError("");
      } catch (error) {
        if (ignore) {
          return;
        }

        setPageError(error.message);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    if (Number.isNaN(productId)) {
      queueMicrotask(() => {
        setLoading(false);
        setPageError("Product not found.");
      });
      return undefined;
    }

    fetchProduct();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (Number.isNaN(productId)) {
      return;
    }

    loadApprovedReviewsForProduct(productId).catch(() => {
    });
  }, [loadApprovedReviewsForProduct, productId]);

  const productCategory = product?.category;
  const currentProductId = product?.id;
  const galleryImages = product?.images ?? [];
  const galleryVideos = product?.videos ?? [];
  const galleryMedia = [
    ...galleryImages.map((src) => ({ type: "image", src })),
    ...galleryVideos.map((src) => ({ type: "video", src })),
  ];
  const relatedProducts = useMemo(
    () =>
      products.filter(
        (item) => item.id !== currentProductId && item.category === productCategory
      ),
    [currentProductId, productCategory, products]
  );

  const currentMedia = galleryMedia[selectedImageIndex] ?? galleryMedia[0];
  const isWishlisted = wishlist.find((item) => item.id === product?.id);
  const cartItem = cart.find((item) => item.id === product?.id);
  const cartQuantity = cartItem?.quantity ?? 0;

  const approvedReviews = getApprovedReviewsForProduct(productId);
  const discountPercent = product
    ? product.discountPercent || getDiscountPercent(product.oldPrice, product.price)
    : 0;

  useEffect(() => {
    if (galleryMedia.length <= 1 || currentMedia?.type === "video") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedImageIndex((currentIndex) => (currentIndex + 1) % galleryMedia.length);
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [currentMedia?.type, galleryMedia.length, selectedImageIndex]);

  useEffect(() => {
    if (currentMedia?.type !== "video") {
      setShouldLoadActiveVideo(false);
      setIsActiveVideoLoading(false);
      return undefined;
    }

    setShouldLoadActiveVideo(false);
    setIsActiveVideoLoading(true);

    let cancelled = false;
    let timeoutId;
    let idleId;

    const enableVideoLoad = () => {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setShouldLoadActiveVideo(true);
        }
      }, 250);
    };

    const scheduleVideoLoad = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(enableVideoLoad, { timeout: 1500 });
        return;
      }

      enableVideoLoad();
    };

    const handleWindowLoad = () => {
      scheduleVideoLoad();
    };

    if (document.readyState === "complete") {
      scheduleVideoLoad();
    } else {
      window.addEventListener("load", handleWindowLoad, { once: true });
    }

    return () => {
      cancelled = true;

      if (typeof idleId === "number" && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }

      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }

      window.removeEventListener("load", handleWindowLoad);
    };
  }, [currentMedia?.src, currentMedia?.type]);

  const moveMedia = (direction) => {
    if (galleryMedia.length <= 1) {
      return;
    }

    setSelectedImageIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0) {
        return galleryMedia.length - 1;
      }

      if (nextIndex >= galleryMedia.length) {
        return 0;
      }

      return nextIndex;
    });
  };

  const handleVideoEnded = () => {
    if (galleryMedia.length > 1) {
      moveMedia(1);
    }
  };

  const handleSubmitReview = async (review) => {
    await submitReview({
      ...review,
      productId,
      productTitle: product.title,
    });
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(product.id, 1, {
        title: product.title,
        price: product.price,
      });
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleBuyNow = async () => {
    try {
      await addToCart(product.id, 1, {
        title: product.title,
        price: product.price,
      });
      navigate("/cart?pay=prepaid");
    } catch (error) {
      window.alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <p className="mx-auto max-w-6xl p-6 text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (pageError || !product) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <p className="mx-auto max-w-6xl p-6 text-red-600">
          {pageError || "Product not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-5 sm:px-6 md:gap-10 md:py-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            {currentMedia?.type === "video" ? (
              <div className="relative aspect-square w-full bg-black">
                {shouldLoadActiveVideo ? (
                  <>
                    <video
                      key={currentMedia.src}
                      src={currentMedia.src}
                      autoPlay
                      muted
                      playsInline
                      controls
                      preload="none"
                      onLoadedData={() => setIsActiveVideoLoading(false)}
                      onCanPlay={() => setIsActiveVideoLoading(false)}
                      onEnded={handleVideoEnded}
                      className="h-full w-full object-contain"
                    />
                    {isActiveVideoLoading && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55">
                        <span className="rounded-full bg-white/14 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                          Loading video...
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
                        <FiPlay className="text-2xl" />
                      </span>
                      <div>
                        <p className="text-base font-semibold">Video ready</p>
                        <p className="text-sm text-white/70">
                          Loading after the page finishes rendering
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <img
                src={currentMedia?.src}
                alt={product.title}
                className="aspect-[4/4] w-full object-cover"
              />
            )}

            {galleryMedia.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => moveMedia(-1)}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white shadow-lg"
                  aria-label="Show previous media"
                >
                  <FiChevronLeft className="text-xl" />
                </button>

                <button
                  type="button"
                  onClick={() => moveMedia(1)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white shadow-lg"
                  aria-label="Show next media"
                >
                  <FiChevronRight className="text-xl" />
                </button>
              </>
            )}
          </div>

          {galleryMedia.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {galleryMedia.map((media, index) => (
                <button
                  key={`${media.src}-${index}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 ${
                    selectedImageIndex === index ? "border-slate-900" : "border-slate-200"
                  }`}
                >
                  {media.type === "video" ? (
                    <>
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
                        <FiPlay className="text-lg" />
                      </div>
                      <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Video
                      </span>
                    </>
                  ) : (
                    <img
                      src={media.src}
                      alt={`${product.title} image ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
          <h1 className="text-2xl font-bold">{product.title}</h1>

          <p className="mt-2 text-sm font-medium text-gray-500">{product.category}</p>

          <Rating rating={product.rating} />

          <p className="text-gray-500">
            {approvedReviews.length} approved review
            {approvedReviews.length === 1 ? "" : "s"}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold">
              Rs. {product.price.toLocaleString("en-IN")}
            </span>

            {product.oldPrice > product.price && (
              <>
                <span className="text-gray-400 line-through">
                  Rs. {product.oldPrice.toLocaleString("en-IN")}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {discountPercent}% OFF
                </span>
              </>
            )}
          </div>

          <div className="mt-4 space-y-2 text-sm font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <FiTruck className="shrink-0 text-slate-500" />
              <span>FREE Shipping &amp; Delivery in 2–3 Days</span>
            </div>
            <div className="flex items-center gap-2">
              <FiShield className="shrink-0 text-slate-500" />
              <span>RAZORPAY – Secure Online Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <FiTag className="shrink-0 text-slate-500" />
              <span>Save Rs. 30 off per item on prepaid orders</span>
            </div>
          </div>

          <p className="mt-3 text-sm font-semibold text-green-700">
            {product.stock > 0 ? `${product.stock} pcs left` : "Out of stock"}
          </p>

          <p className="mt-4 text-gray-600">{product.description}</p>

          <div className="mt-6 flex gap-3">
            <div className="grid flex-1 gap-3">
              {cartQuantity > 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => decreaseQuantity(product.id).catch((error) => window.alert(error.message))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800"
                    aria-label={`Decrease ${product.title} quantity`}
                  >
                    <FiMinus />
                  </button>
                  <span className="min-w-10 text-center text-base font-bold text-slate-900">
                    {cartQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0 || cartQuantity >= 10}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Increase ${product.title} quantity`}
                  >
                    <FiPlus />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className="w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Add To Cart
                </button>
              )}

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
                className="cod-button w-full rounded-lg py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  aria-hidden="true"
                  className="cod-button__spark cod-button__spark--left"
                />
                <span
                  aria-hidden="true"
                  className="cod-button__spark cod-button__spark--center"
                />
                <span
                  aria-hidden="true"
                  className="cod-button__spark cod-button__spark--right"
                />
                <span className="cod-button__label">Pay Online &amp; Save Rs. 30 / item</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => toggleWishlist(product)}
              className="flex items-center justify-center rounded-lg border px-4"
            >
              <FaHeart
                className={`text-xl ${
                  isWishlisted ? "text-red-500" : "text-gray-400"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-6xl px-6">
        <ProductReviews
          reviews={approvedReviews}
          onSubmitReview={handleSubmitReview}
        />
      </div>

      {relatedProducts.length > 0 && (
        <div className="mx-auto mt-8 max-w-6xl px-6 pb-10">
          <h2 className="mb-4 text-xl font-bold">Related Products</h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}
    </div>
  );
}
