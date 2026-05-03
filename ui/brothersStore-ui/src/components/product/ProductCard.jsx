import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart } from "react-icons/fa";

import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import Rating from "../common/Rating";

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();

  const isWishlisted = wishlist.find((item) => item.id === product.id);
  const image = product.images?.[0];
  const isOutOfStock = product.stock <= 0;

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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_42px_rgba(15,23,42,0.12)]">
      <button
        type="button"
        onClick={() => toggleWishlist(product)}
        className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/92 shadow-sm backdrop-blur transition hover:scale-105 ${
          isWishlisted ? "text-red-500" : "text-slate-300 hover:text-red-400"
        }`}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <FaHeart className="text-lg" />
      </button>

      <div className="relative overflow-hidden">
        <img
          src={image}
          alt={product.title}
          onClick={() => navigate(`/product/${product.id}`)}
          loading="lazy"
          decoding="async"
          className="h-48 w-full cursor-pointer object-cover transition duration-500 group-hover:scale-[1.035] sm:h-52"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/35 to-transparent" />
      </div>

      <div className="p-4 sm:p-5">
        <h3
          onClick={() => navigate(`/product/${product.id}`)}
          className="line-clamp-2 cursor-pointer text-base font-bold leading-snug text-slate-900 hover:underline"
        >
          {product.title}
        </h3>

        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{product.category}</p>

        <Rating rating={product.rating} />

        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg font-black text-slate-900">Rs. {product.price.toLocaleString("en-IN")}</span>

          <span className="text-sm text-gray-400 line-through">
            Rs. {product.oldPrice.toLocaleString("en-IN")}
          </span>
        </div>

        <p className={`mt-1 text-xs font-medium ${isOutOfStock ? "text-red-600" : "text-green-700"}`}>
          {isOutOfStock ? "Out of stock" : `${product.stock} left in stock`}
        </p>

        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full rounded-xl bg-slate-950 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Add to Cart
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="cod-button w-full rounded-xl py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
            <span className="cod-button__label">Buy Now (COD)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
