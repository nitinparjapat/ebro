import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart } from "react-icons/fa";
import { FiMinus, FiPlus } from "react-icons/fi";

import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { getDiscountPercent } from "../../lib/storeApi";
import Rating from "../common/Rating";

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { cart, addToCart, decreaseQuantity } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();

  const productId = product?.id;
  const productImages = product?.images;

  const images = useMemo(
    () => (Array.isArray(productImages) ? productImages.filter(Boolean) : []).slice(0, 6),
    [productImages]
  );
  const image = images[0];
  const goToDetails = () => {
    if (!productId) {
      return;
    }
    navigate(`/product/${productId}`);
  };
  const stopPropagation = (event) => event.stopPropagation();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [productId]);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) {
      return undefined;
    }

    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      setIsInView(true);
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => setIsInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "120px 0px", threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (images.length <= 1 || !isInView || isHovered) {
      return undefined;
    }

    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (prefersReducedMotion) {
        return undefined;
      }
    }

    const intervalId = globalThis.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % images.length);
    }, 2600);

    return () => globalThis.clearInterval(intervalId);
  }, [images.length, isHovered, isInView]);

  if (!product) {
    return null;
  }

  const isWishlisted = wishlist.find((item) => item.id === product.id);
  const isOutOfStock = (product.stock ?? 0) <= 0;
  const cartItem = cart.find((item) => item.id === product.id);
  const cartQuantity = cartItem?.quantity ?? 0;
  const originalPrice = Number(product.originalPrice ?? product.oldPrice ?? product.price ?? 0);
  const discountedPrice = Number(product.price ?? 0);
  const discountPercent =
    product.discountPercent ?? getDiscountPercent(originalPrice, discountedPrice);
  const hasDiscount = originalPrice > discountedPrice && discountPercent > 0;

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
      navigate("/cart");
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_42px_rgba(15,23,42,0.12)]"
    >
      <button
        type="button"
        onClick={(event) => {
          stopPropagation(event);
          toggleWishlist(product);
        }}
        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/92 shadow-sm backdrop-blur transition hover:scale-105 ${
          isWishlisted ? "text-red-500" : "text-slate-300 hover:text-red-400"
        }`}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <FaHeart className="text-base" />
      </button>

      <div className="relative overflow-hidden">
        <img
          src={images[activeImageIndex] || image}
          alt={product.title}
          onClick={goToDetails}
          loading="lazy"
          decoding="async"
          className="h-44 w-full cursor-pointer object-cover transition duration-500 group-hover:scale-[1.035] sm:h-48"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/35 to-transparent" />
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, index) => (
              <span
                key={`dot-${product.id}-${index}`}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  index === activeImageIndex ? "bg-white" : "bg-white/45"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={goToDetails}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goToDetails();
          }
        }}
        className="p-3 sm:p-4"
        aria-label={`View ${product.title} details`}
      >
        <h3
          className="line-clamp-2 cursor-pointer text-base font-bold leading-snug text-slate-900 hover:underline sm:text-[0.95rem]"
        >
          {product.title}
        </h3>

        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{product.category}</p>

        <Rating rating={product.rating} />

        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Discounted price
            </span>
            <span className="shrink-0 text-right text-base font-black leading-none text-slate-900 sm:text-lg">
              Rs. {discountedPrice.toLocaleString("en-IN")}
            </span>
          </div>

          {hasDiscount && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="min-w-0 text-slate-500">
                Main price:
                {" "}
                <span className="font-semibold line-through">
                  Rs. {originalPrice.toLocaleString("en-IN")}
                </span>
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                {discountPercent}% OFF
              </span>
            </div>
          )}
        </div>

        <p className={`mt-1 text-xs font-medium ${isOutOfStock ? "text-red-600" : "text-green-700"}`}>
          {isOutOfStock ? "Out of stock" : `${product.stock} pcs left`}
        </p>

        <div className="mt-3 grid gap-2">
          {cartQuantity > 0 ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
              <button
                type="button"
                onClick={(event) => {
                  stopPropagation(event);
                  decreaseQuantity(product.id).catch((error) => window.alert(error.message));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800"
                aria-label={`Decrease ${product.title} quantity`}
              >
                <FiMinus />
              </button>
              <span className="min-w-8 text-center text-sm font-bold text-slate-900">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  stopPropagation(event);
                  handleAddToCart();
                }}
                disabled={isOutOfStock || cartQuantity >= 10}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Increase ${product.title} quantity`}
              >
                <FiPlus />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                stopPropagation(event);
                handleAddToCart();
              }}
              disabled={isOutOfStock}
              className="w-full rounded-xl bg-slate-950 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Add to Cart
            </button>
          )}

          <button
            type="button"
            onClick={(event) => {
              stopPropagation(event);
              handleBuyNow();
            }}
            disabled={isOutOfStock}
            className="cod-button w-full rounded-xl py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
            <span className="cod-button__label">Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
