import { createContext, useContext, useMemo, useState } from "react";

import { useAuth } from "./AuthContext";

const ReviewsContext = createContext(null);
const REVIEWS_STORAGE_KEY = "brothersStoreProductReviews";

const readStoredReviews = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const rawReviews = window.localStorage.getItem(REVIEWS_STORAGE_KEY);

  if (!rawReviews) {
    return [];
  }

  try {
    const parsedReviews = JSON.parse(rawReviews);
    return Array.isArray(parsedReviews) ? parsedReviews : [];
  } catch {
    return [];
  }
};

const saveStoredReviews = (reviews) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
};

export function ReviewsProvider({ children }) {
  const { currentUser, profile } = useAuth();
  const [reviews, setReviews] = useState(() => readStoredReviews());

  const persistReviews = (updater) => {
    setReviews((currentReviews) => {
      const nextReviews =
        typeof updater === "function" ? updater(currentReviews) : updater;

      saveStoredReviews(nextReviews);
      return nextReviews;
    });
  };

  const submitReview = ({ productId, productTitle, rating, text }) => {
    const review = {
      id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId,
      productTitle,
      rating,
      text: text.trim(),
      status: "pending",
      customerName:
        currentUser?.fullName || profile.fullName || "BrothersStore Customer",
      customerEmail: currentUser?.email || profile.email || "",
      createdAt: new Date().toISOString(),
    };

    persistReviews((currentReviews) => [review, ...currentReviews]);
    return review;
  };

  const approveReview = (reviewId) => {
    persistReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              status: "approved",
              approvedAt: new Date().toISOString(),
            }
          : review
      )
    );
  };

  const deleteReview = (reviewId) => {
    persistReviews((currentReviews) =>
      currentReviews.filter((review) => review.id !== reviewId)
    );
  };

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
        pendingReviews,
        approvedReviews,
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
