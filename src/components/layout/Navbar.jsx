import { useEffect, useMemo, useState } from "react";
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
  const { categories, products } = useProducts();
  const { searchTerm, setSearchTerm } = useSearch();
  const { wishlist } = useWishlist();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [placeholderText, setPlaceholderText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isDeletingPlaceholder, setIsDeletingPlaceholder] = useState(false);

  const searchPlaceholders = useMemo(
    () =>
      products.length > 0
        ? products.map((product) => `Search for ${product.title}`)
        : ["Search products"],
    [products]
  );
  const selectedCategory =
    new URLSearchParams(location.search).get("category") ?? "All";
  const accountLabel = currentUser?.fullName
    ? currentUser.fullName.split(" ")[0]
    : "Account";

  useEffect(() => {
    const currentText = searchPlaceholders[placeholderIndex];
    const isComplete = placeholderText === currentText;
    const delay = isComplete && !isDeletingPlaceholder
      ? 1200
      : isDeletingPlaceholder
        ? 45
        : 75;

    const timeoutId = setTimeout(() => {
      if (!isDeletingPlaceholder) {
        if (isComplete) {
          setIsDeletingPlaceholder(true);
          return;
        }

        setPlaceholderText(currentText.slice(0, placeholderText.length + 1));
        return;
      }

      if (placeholderText.length === 0) {
        setIsDeletingPlaceholder(false);
        setPlaceholderIndex((placeholderIndex + 1) % searchPlaceholders.length);
        return;
      }

      setPlaceholderText(currentText.slice(0, placeholderText.length - 1));
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [placeholderIndex, placeholderText, isDeletingPlaceholder, searchPlaceholders]);

  const handleCategoryNavigate = (categoryName) => {
    if (categoryName === "All") {
      navigate("/");
      return;
    }

    navigate(`/?category=${encodeURIComponent(categoryName)}`);
  };

  const renderSearchInput = (className) => (
    <div className={className}>
      <FiSearch className="shrink-0 text-gray-500" />

      <input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        className="ml-2 w-full bg-transparent outline-none"
        placeholder={placeholderText || "Search products"}
      />
    </div>
  );

  return (
    <div className="sticky top-0 z-40 bg-white shadow">
      <MobileDrawer open={drawerOpen} setOpen={setDrawerOpen} />

      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 md:gap-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-800 md:hidden"
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
              className="block w-44 max-w-[48vw] object-contain sm:w-52"
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

            {isAdmin && (
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
            "ml-auto hidden flex-1 items-center rounded-lg border border-gray-300 px-3 py-2 md:flex md:max-w-xl"
          )}

          <div className="ml-auto flex items-center gap-4 md:ml-0 md:gap-5">
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
              className="relative flex items-center gap-2 text-sm font-semibold text-gray-700"
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
              className="relative flex items-center gap-2 text-sm font-semibold text-gray-700"
            >
              <FiShoppingCart size={20} />
              <span className="hidden md:inline">Cart</span>
              {cartQuantity > 0 && (
                <span className="absolute -right-2 -top-2 rounded bg-black px-1 text-xs text-white">
                  {cartQuantity}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="pt-3 md:hidden">
          {renderSearchInput(
            "flex items-center rounded-lg border border-gray-300 px-3 py-2"
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="hidden border-t border-gray-100 md:block">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-6 py-3">
            {categories.map((category) => {
              const isActive =
                location.pathname === "/" && selectedCategory === category.name;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryNavigate(category.name)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
