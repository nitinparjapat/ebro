import { FaTimes } from "react-icons/fa";
import { FiGrid, FiHeart, FiHome, FiInfo, FiPackage } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import AuthPanel from "../auth/AuthPanel";

export default function MobileDrawer({ open, setOpen }) {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();

  const closeDrawer = () => {
    setOpen(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    closeDrawer();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={closeDrawer} className="absolute inset-0 bg-black/40" />

      <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto bg-white shadow-xl sm:max-w-md">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <img
            src="/bs_logo_hd.png"
            alt="BrothersStore"
            className="block w-44 max-w-[70%] object-contain"
          />

          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700"
            aria-label="Close menu"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="px-4 py-5">
          {currentUser && (
            <div className="mb-5 rounded-lg bg-black px-4 py-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Signed In
              </p>
              <p className="mt-2 text-lg font-bold">
                {currentUser.fullName || "BrothersStore Customer"}
              </p>
              <p className="mt-1 text-sm text-white/80">{currentUser.phoneNumber}</p>
            </div>
          )}

          <div className="rounded-lg bg-gray-50 p-2">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Quick Links
            </p>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => handleNavigate("/")}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-3 text-left shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <FiHome className="text-lg text-gray-700" />
                  <span className="text-sm font-semibold text-gray-900">Home</span>
                </span>
                <span className="text-xs text-gray-400">Browse</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/wishlist")}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-3 text-left shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <FiHeart className="text-lg text-gray-700" />
                  <span className="text-sm font-semibold text-gray-900">
                    Wishlist
                  </span>
                </span>
                <span className="text-xs text-gray-400">Saved picks</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/orders")}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-3 text-left shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <FiPackage className="text-lg text-gray-700" />
                  <span className="text-sm font-semibold text-gray-900">Orders</span>
                </span>
                <span className="text-xs text-gray-400">Order history</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavigate("/owner-dashboard")}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-3 text-left shadow-sm"
                >
                  <span className="flex items-center gap-3">
                    <FiGrid className="text-lg text-gray-700" />
                    <span className="text-sm font-semibold text-gray-900">
                      Dashboard
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">Owner tools</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleNavigate("/about")}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-3 text-left shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <FiInfo className="text-lg text-gray-700" />
                  <span className="text-sm font-semibold text-gray-900">About Us</span>
                </span>
                <span className="text-xs text-gray-400">Our story</span>
              </button>
            </div>
          </div>

          <AuthPanel className="mt-5" onSuccess={closeDrawer} />
        </div>
      </div>
    </div>
  );
}
