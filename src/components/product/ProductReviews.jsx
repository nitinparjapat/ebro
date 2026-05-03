import { useState } from "react";
import { FaStar } from "react-icons/fa";

const formatDate = (dateValue) =>
  new Date(dateValue).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function ProductReviews({ reviews = [], onSubmitReview }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!rating || text.trim().length < 5) {
      setMessage("Choose a rating and write a short review.");
      return;
    }

    onSubmitReview({
      rating,
      text,
    });

    setRating(0);
    setText("");
    setMessage("Review submitted for admin approval.");
  };

  return (
    <div className="mt-8 rounded-xl bg-white p-6">
      <h2 className="mb-4 text-xl font-bold">Customer Reviews</h2>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(star);
                setMessage("");
              }}
              className="text-xl"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <FaStar
                className={star <= rating ? "text-yellow-500" : "text-gray-300"}
              />
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setMessage("");
          }}
          placeholder="Write your review..."
          className="mb-3 w-full resize-none rounded-lg border border-gray-300 p-3 outline-none focus:border-black"
          rows="4"
        />

        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 font-semibold text-white"
        >
          Submit Review
        </button>

        {message && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            {message}
          </p>
        )}
      </form>

      {reviews.length === 0 ? (
        <p className="text-gray-500">No approved reviews yet</p>
      ) : (
        reviews.map((review) => (
          <div key={review.id} className="mt-3 border-t border-gray-100 pt-3">
            <div className="mb-1 flex gap-1">
              {[...Array(review.rating)].map((_, index) => (
                <FaStar key={index} className="text-yellow-500" />
              ))}
            </div>

            <p className="text-gray-700">{review.text}</p>

            <p className="mt-1 text-xs text-gray-400">
              {review.customerName} · {formatDate(review.approvedAt ?? review.createdAt)}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
