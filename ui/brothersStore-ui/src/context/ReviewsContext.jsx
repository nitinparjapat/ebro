import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { apiClient, createAuthHeaders } from "../lib/api";
import { getApiErrorMessage } from "../lib/storeApi";
import { useAuth } from "./AuthContext";

const ReviewsContext = createContext(null);

const normalizeReview = (review) => ({
  id: review?.id ?? 0,
  productId: review?.productId ?? 0,
  productTitle: review?.productTitle ?? "",
  rating: review?.rating ?? 0,
  text: review?.text ?? "",
  status: String(review?.status ?? "Pending").toLowerCase(),
  customerName: review?.customerName ?? "BrothersStore Customer",
  customerEmail: review?.customerEmail ?? "",
  createdAt: review?.createdAt ?? new Date().toISOString(),
  approvedAt: review?.approvedAt ?? null,
});

export function ReviewsProvider({ children }) {
  const { token, isAdmin, currentUser, profile } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pendingApprovedReviewLoadsRef = useRef({});

  const refreshReviews = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get("/admin/reviews", {
        headers: createAuthHeaders(token),
      });
      const nextReviews = Array.isArray(data) ? data.map(normalizeReview) : [];

      setReviews(nextReviews);
      setError("");
      return nextReviews;
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, "Unable to load reviews.");
      setError(message);
      throw new Error(message, { cause: apiError });
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadApprovedReviewsForProduct = useCallback(async (productId) => {
    const existingApprovedReviews = reviews.filter(
      (review) =>
        String(review.productId) === String(productId) &&
        review.status === "approved"
    );

    if (existingApprovedReviews.length > 0) {
      return existingApprovedReviews;
    }

    const pendingApprovedReviewLoad = pendingApprovedReviewLoadsRef.current[productId];
    if (pendingApprovedReviewLoad) {
      return pendingApprovedReviewLoad;
    }

    try {
      const approvedReviewLoadPromise = apiClient.get(`/products/${productId}/reviews`)
        .then(({ data }) => {
          const approvedProductReviews = Array.isArray(data)
            ? data.map(normalizeReview)
            : [];

          setReviews((currentReviews) => {
            const otherReviews = currentReviews.filter(
              (review) =>
                String(review.productId) !== String(productId) ||
                review.status !== "approved"
            );

            return [...otherReviews, ...approvedProductReviews];
          });
          setError("");

          return approvedProductReviews;
        })
        .finally(() => {
          delete pendingApprovedReviewLoadsRef.current[productId];
        });

      pendingApprovedReviewLoadsRef.current[productId] = approvedReviewLoadPromise;
      return await approvedReviewLoadPromise;
    } catch (apiError) {
      const message = getApiErrorMessage(
        apiError,
        "Unable to load product reviews."
      );
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  }, [reviews]);

  useEffect(() => {
    if (!token || !isAdmin) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      refreshReviews().catch(() => {
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshReviews, token, isAdmin]);

  const submitReview = useCallback(async ({ productId, productTitle, rating, text }) => {
    try {
      const payload = {
        productTitle,
        rating,
        text: text.trim(),
        customerName:
          currentUser?.fullName ||
          profile?.fullName ||
          currentUser?.name ||
          "BrothersStore Customer",
        customerEmail: currentUser?.email || profile?.email || "",
      };

      const { data } = await apiClient.post(
        `/products/${productId}/reviews`,
        payload
      );
      const nextReview = normalizeReview(data);

      setReviews((currentReviews) => [nextReview, ...currentReviews]);
      setError("");

      return nextReview;
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, "Unable to submit review.");
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  }, [currentUser, profile]);

  const approveReview = useCallback(async (reviewId) => {
    try {
      const { data } = await apiClient.put(
        `/admin/reviews/${reviewId}/approve`,
        {},
        {
          headers: createAuthHeaders(token),
        }
      );
      const approvedReview = normalizeReview(data?.review);

      setReviews((currentReviews) =>
        currentReviews.map((review) =>
          review.id === reviewId ? approvedReview : review
        )
      );
      setError("");

      return approvedReview;
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, "Unable to approve review.");
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  }, [token]);

  const deleteReview = useCallback(async (reviewId) => {
    try {
      await apiClient.put(
        `/admin/reviews/${reviewId}/reject`,
        {},
        {
          headers: createAuthHeaders(token),
        }
      );

      setReviews((currentReviews) =>
        currentReviews.filter((review) => review.id !== reviewId)
      );
      setError("");
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, "Unable to delete review.");
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  }, [token]);

  const pendingReviews = useMemo(
    () => reviews.filter((review) => review.status === "pending"),
    [reviews]
  );

  const approvedReviews = useMemo(
    () => reviews.filter((review) => review.status === "approved"),
    [reviews]
  );

  const getApprovedReviewsForProduct = (productId) =>
    approvedReviews.filter(
      (review) => String(review.productId) === String(productId)
    );

  return (
    <ReviewsContext.Provider
      value={{
        reviews,
        loading,
        error,
        pendingReviews,
        approvedReviews,
        refreshReviews,
        loadApprovedReviewsForProduct,
        submitReview,
        approveReview,
        deleteReview,
        getApprovedReviewsForProduct,
      }}
    >
      {children}
    </ReviewsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useReviews = () => useContext(ReviewsContext);
