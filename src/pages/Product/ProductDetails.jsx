import { useEffect, useMemo, useState } from "react";
import { FaHeart } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

import Rating from "../../components/common/Rating";
import Navbar from "../../components/layout/Navbar";
import ProductGrid from "../../components/product/ProductGrid";
import ProductMediaGallery from "../../components/product/ProductMediaGallery";
import ProductReviews from "../../components/product/ProductReviews";
import { useCart } from "../../context/CartContext";
import { useProducts } from "../../context/ProductsContext";
import { useReviews } from "../../context/ReviewsContext";
import { useWishlist } from "../../context/WishlistContext";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { loadProduct, productLookup, products } = useProducts();
  const { getApprovedReviewsForProduct, submitReview } = useReviews();
  const { wishlist, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const productId = Number(id);

  useEffect(() => {
    let ignore = false;
    const cachedProduct = productLookup[productId];

    if (Number.isNaN(productId)) {
      queueMicrotask(() => {
        setLoading(false);
        setPageError("Product not found.");
      });
      return undefined;
    }

    if (cachedProduct) {
      queueMicrotask(() => {
        if (ignore) {
          return;
        }

        setProduct(cachedProduct);
        setLoading(false);
        setPageError("");
      });
      return () => {
        ignore = true;
      };
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const loadedProduct = await loadProduct(productId);

        if (ignore) {
          return;
        }

        setProduct(loadedProduct);
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

    fetchProduct();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const productCategory = product?.category;
  const currentProductId = product?.id;
  const relatedProducts = useMemo(
    () =>
      products.filter(
        (item) => item.id !== currentProductId && item.category === productCategory
      ),
    [currentProductId, productCategory, products]
  );

  const isWishlisted = wishlist.find((item) => item.id === product?.id);
  const approvedReviews = getApprovedReviewsForProduct(productId);

  const handleSubmitReview = (review) => {
    submitReview({
      ...review,
      productId,
      productTitle: product.title,
    });
  };

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

      <div className="mx-auto grid max-w-6xl gap-8 p-4 md:p-6 lg:grid-cols-2">
        <ProductMediaGallery
          images={product.images}
          videos={product.videos}
          title={product.title}
        />

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>

          <p className="mt-2 text-sm font-medium text-gray-500">
            {product.category}
          </p>

          <Rating rating={product.rating} />

          <p className="text-gray-500">
            {approvedReviews.length} approved review
            {approvedReviews.length === 1 ? "" : "s"}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-900">
              Rs. {product.price.toLocaleString("en-IN")}
            </span>

            <span className="text-gray-400 line-through">
              Rs. {product.oldPrice.toLocaleString("en-IN")}
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold text-green-700">
            {product.stock > 0 ? `${product.stock} pieces available` : "Out of stock"}
          </p>

          <p className="mt-4 whitespace-pre-line text-gray-600">
            {product.description}
          </p>

          <div className="mt-6 flex gap-3">
            <div className="grid flex-1 gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="w-full rounded-lg bg-black py-3 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Add To Cart
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
                className="cod-button w-full rounded-lg py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        <ProductReviews
          reviews={approvedReviews}
          onSubmitReview={handleSubmitReview}
        />
      </div>

      {relatedProducts.length > 0 && (
        <div className="mx-auto mt-8 max-w-6xl px-4 pb-10 md:px-6">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Related products</h2>
          <ProductGrid products={relatedProducts.slice(0, 8)} />
        </div>
      )}
    </div>
  );
}
