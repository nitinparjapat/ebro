import { FaTimes } from "react-icons/fa";

import { useAuth } from "../../context/AuthContext";
import AuthPanel from "./AuthPanel";

export default function AuthModal() {
  const { authModalOpen, closeAuthModal } = useAuth();

  if (!authModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        onClick={closeAuthModal}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div className="absolute left-1/2 top-1/2 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              BrothersStore Account
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Sign in to save your cart and place orders
            </h2>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600"
            aria-label="Close login popup"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <AuthPanel
          className="mt-5"
          introText="Continue with Google to save your cart and place orders."
          onSuccess={closeAuthModal}
        />
      </div>
    </div>
  );
}
