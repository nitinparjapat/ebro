import { FaStar } from "react-icons/fa";

export default function Rating({ rating }) {

  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <FaStar
        key={i}
        className={
          i <= Math.round(rating)
            ? "text-yellow-500"
            : "text-gray-300"
        }
      />
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {stars}
      <span className="ml-1 text-gray-600">
        {rating}
      </span>
    </div>
  );
}