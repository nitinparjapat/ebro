import { createContext, useContext, useEffect, useState } from "react";

import { useAuth } from "./AuthContext";

const WishlistContext = createContext();
const GUEST_WISHLIST_STORAGE_KEY = "brothersStoreGuestWishlist";
const USER_WISHLIST_STORAGE_PREFIX = "brothersStoreWishlist";

const getStorageKey = (userId) =>
  userId
    ? `${USER_WISHLIST_STORAGE_PREFIX}:${userId}`
    : GUEST_WISHLIST_STORAGE_KEY;

const readWishlist = (userId) => {
  if (typeof window === "undefined") {
    return [];
  }

  const rawWishlist = window.localStorage.getItem(getStorageKey(userId));

  if (!rawWishlist) {
    return [];
  }

  try {
    const parsedWishlist = JSON.parse(rawWishlist);
    return Array.isArray(parsedWishlist) ? parsedWishlist : [];
  } catch {
    return [];
  }
};

const saveWishlist = (userId, wishlist) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(wishlist));
};

const clearGuestWishlist = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
};

const mergeWishlists = (primaryList, secondaryList) => {
  const itemsById = new Map();

  for (const item of [...primaryList, ...secondaryList]) {
    itemsById.set(item.id, item);
  }

  return Array.from(itemsById.values());
};

export function WishlistProvider({ children }) {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || currentUser?.email || "";
  const [wishlist, setWishlist] = useState(() => readWishlist(""));

  useEffect(() => {
    queueMicrotask(() => {
      if (!userId) {
        setWishlist(readWishlist(""));
        return;
      }

      const guestWishlist = readWishlist("");
      const userWishlist = readWishlist(userId);
      const mergedWishlist = mergeWishlists(userWishlist, guestWishlist);

      setWishlist(mergedWishlist);
      saveWishlist(userId, mergedWishlist);
      clearGuestWishlist();
    });
  }, [userId]);

  const toggleWishlist = (product) => {
    const storageUserId = userId || "";
    const exists = wishlist.find((item) => item.id === product.id);
    const nextWishlist = exists
      ? wishlist.filter((item) => item.id !== product.id)
      : [...wishlist, product];

    setWishlist(nextWishlist);
    saveWishlist(storageUserId, nextWishlist);
  };

  const clearWishlist = () => {
    setWishlist([]);
    saveWishlist(userId || "", []);
  };

  return (
    <WishlistContext.Provider
      value={{ wishlist, toggleWishlist, clearWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWishlist = () => useContext(WishlistContext);
