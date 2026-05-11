import { useMemo, useState } from "react";
import { FaHeart } from "react-icons/fa";
import { FiMenu, FiSearch, FiShoppingCart, FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useProducts } from "../../context/ProductsContext";
import { useSearch } from "../../context/SearchContext";
import { useWishlist } from "../../context/WishlistContext";
import MobileDrawer from "./MobileDrawer";

const desktopLinks = [
  { label: "Home", path: "/" },
  { label: "Orders", path: "/orders" },
  { label: "About Us", path: "/about" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartQuantity } = useCart();
  const { currentUser, isAdmin, openAuthModal } = useAuth();
  const { products } = useProducts();
  const { searchTerm, setSearchTerm } = useSearch();
  const { wishlist } = useWishlist();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const searchPlaceholder = useMemo(
    () =>
      products.length > 0
        ? `Search for ${products[0].title}`
        : "Search products",
    [products]
  );
  const showDashboard = Boolean(currentUser && isAdmin);
  const accountLabel = currentUser?.fullName?.trim()
    ? currentUser.fullName.trim().split(" ")[0]
    : currentUser?.email?.trim()
      ? currentUser.email.trim().split("@")[0]
      : "Account";

  const renderSearchInput = (className) => (
    <div className={className}>
      <FiSearch className="shrink-0 text-gray-500" />

      <input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        className="ml-2 w-full bg-transparent outline-none"
        placeholder={searchPlaceholder}
      />
    </div>
  );

  return (
    <>
      <MobileDrawer open={drawerOpen} setOpen={setDrawerOpen} />

      <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur">

      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 md:gap-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-gray-800 md:hidden"
            aria-label="Open menu"
          >
            <FiMenu size={22} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex shrink-0 items-center justify-center border-0 bg-transparent p-0"
            aria-label="Go to homepage"
          >
            <img
              src="/bs_logo_hd.png"
              alt="BrothersStore"
              className="block w-40 max-w-[46vw] object-contain sm:w-52"
            />
          </button>

          <nav className="ml-3 hidden items-center gap-5 md:flex">
            {desktopLinks.map((link) => {
              const isActive = link.path === "/"
                ? location.pathname === "/"
                : location.pathname === link.path;

              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`text-sm font-semibold transition ${
                    isActive ? "text-black" : "text-gray-500 hover:text-black"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}

            {showDashboard && (
              <button
                type="button"
                onClick={() => navigate("/owner-dashboard")}
                className={`text-sm font-semibold transition ${
                  location.pathname === "/owner-dashboard"
                    ? "text-black"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                Dashboard
              </button>
            )}
          </nav>

          {renderSearchInput(
            "ml-auto hidden flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-2.5 md:flex md:max-w-xl"
          )}

          <div className="ml-auto flex items-center gap-3 md:ml-0 md:gap-5">
            <button
              type="button"
              onClick={openAuthModal}
              className="hidden items-center gap-2 text-sm font-semibold text-gray-700 md:flex"
            >
              <FiUser className="text-lg" />
              <span>{accountLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/wishlist")}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-sm font-semibold text-rose-700 md:h-auto md:w-auto md:bg-transparent md:text-gray-700"
            >
              <FaHeart size={18} />
              <span className="hidden md:inline">Wishlist</span>
              {wishlist.length > 0 && (
                <span className="absolute -right-2 -top-2 rounded bg-red-500 px-1 text-xs text-white">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white md:h-auto md:w-auto md:bg-transparent md:text-gray-700"
            >
              <FiShoppingCart size={20} />
              <span className="hidden md:inline">Cart</span>
              {cartQuantity > 0 && (
                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-slate-900 md:bg-black md:px-1 md:text-xs md:text-white">
                  {cartQuantity}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="pt-3 md:hidden">
          {renderSearchInput(
            "flex items-center rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3"
          )}
        </div>
      </div>
      </div>
    </>
  );
}
