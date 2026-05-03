import { useNavigate } from "react-router-dom";
import { FaHeart } from "react-icons/fa";

import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import Rating from "../common/Rating";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();

  const isWishlisted = wishlist.find((item) => item.id === product.id);
  const image = product.images?.[0];
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = async () => {
    try {
      await addToCart(product);
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleBuyNow = async () => {
    try {
      await addToCart(product);
      navigate("/cart");
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <div className="relative rounded-xl bg-white shadow transition hover:shadow-lg">
      <FaHeart
        onClick={() => toggleWishlist(product)}
        className={`absolute right-2 top-2 cursor-pointer text-lg ${
          isWishlisted ? "text-red-500" : "text-gray-300"
        }`}
      />

      <img
        src={image}
        alt={product.title}
        onClick={() => navigate(`/product/${product.id}`)}
        className="h-48 w-full cursor-pointer rounded-t-xl object-cover"
      />

      <div className="p-3">
        <h3
          onClick={() => navigate(`/product/${product.id}`)}
          className="cursor-pointer text-sm font-medium hover:underline"
        >
          {product.title}
        </h3>

        <p className="mt-1 text-xs text-gray-500">{product.category}</p>

        <Rating rating={product.rating} />

        <div className="mt-1 flex items-center gap-2">
          <span className="font-bold">Rs. {product.price.toLocaleString("en-IN")}</span>

          <span className="text-sm text-gray-400 line-through">
            Rs. {product.oldPrice.toLocaleString("en-IN")}
          </span>
        </div>

        <p className={`mt-1 text-xs font-medium ${isOutOfStock ? "text-red-600" : "text-green-700"}`}>
          {isOutOfStock ? "Out of stock" : `${product.stock} left in stock`}
        </p>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full rounded-lg bg-black py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Add to Cart
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="cod-button w-full rounded-lg py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
