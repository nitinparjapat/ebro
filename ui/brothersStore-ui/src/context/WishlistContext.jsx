import { createContext, useContext, useEffect, useState } from "react";

import { useAuth } from "./AuthContext";
import { apiClient, createAuthHeaders } from "../lib/api";
import { normalizeProduct } from "../lib/storeApi";

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
  const { currentUser, token, logout } = useAuth();
  const userId = currentUser?.id || currentUser?.email || "";
  const [wishlist, setWishlist] = useState(() => readWishlist(""));

  const pruneWishlist = async (storageUserId, items) => {
    if (items.length === 0) {
      return items;
    }

    const checks = await Promise.allSettled(
      items.map((item) => apiClient.get(`/products/${item.id}`))
    );

    const nextWishlist = checks.flatMap((result) => {
      if (result.status !== "fulfilled") {
        return [];
      }

      const product = normalizeProduct(result.value?.data);
      return product?.isActive ? [product] : [];
    });

    if (nextWishlist.length !== items.length) {
      setWishlist(nextWishlist);
      saveWishlist(storageUserId, nextWishlist);
    }

    return nextWishlist;
  };

  const refreshServerWishlist = async () => {
    if (!token) {
      return [];
    }

    const { data } = await apiClient.get("/wishlist", {
      headers: createAuthHeaders(token),
    });

    const normalized = Array.isArray(data) ? data.map(normalizeProduct) : [];
    setWishlist(normalized);
    return normalized;
  };

  useEffect(() => {
    queueMicrotask(() => {
      if (!userId) {
        const nextWishlist = readWishlist("");
        setWishlist(nextWishlist);
        pruneWishlist("", nextWishlist).catch(() => {
        });
        return;
      }

      if (!token) {
        const guestWishlist = readWishlist("");
        const userWishlist = readWishlist(userId);
        const mergedWishlist = mergeWishlists(userWishlist, guestWishlist);

        setWishlist(mergedWishlist);
        saveWishlist(userId, mergedWishlist);
        clearGuestWishlist();
        pruneWishlist(userId, mergedWishlist).catch(() => {
        });
        return;
      }

      // Logged in: wishlist is account-based. Sync any guest wishlist items once.
      const guestWishlist = readWishlist("");

      refreshServerWishlist()
        .then((serverWishlist) => {
          if (guestWishlist.length === 0) {
            return serverWishlist;
          }

          const serverIds = new Set(serverWishlist.map((item) => item.id));
          const missing = guestWishlist.filter((item) => !serverIds.has(item.id));

          return Promise.allSettled(
            missing.map((item) =>
              apiClient.post(
                "/wishlist/items/toggle",
                { productId: item.id },
                { headers: createAuthHeaders(token) }
              )
            )
          ).then(() => refreshServerWishlist());
        })
        .then(() => {
          clearGuestWishlist();
          saveWishlist(userId, []);
        })
        .catch((apiError) => {
          if (apiError?.response?.status === 401) {
            logout();
            return;
          }
        });
    });
  }, [logout, token, userId]);

  const toggleWishlist = (product) => {
    if (token) {
      apiClient
        .post(
          "/wishlist/items/toggle",
          { productId: product.id },
          { headers: createAuthHeaders(token) }
        )
        .then(() => refreshServerWishlist())
        .catch((apiError) => {
          if (apiError?.response?.status === 401) {
            logout();
          }
        });
      return;
    }

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

    if (!token) {
      saveWishlist(userId || "", []);
      return;
    }

    // Best-effort clear: remove items individually.
    Promise.allSettled(
      wishlist.map((item) =>
        apiClient.delete(`/wishlist/items/${item.id}`, {
          headers: createAuthHeaders(token),
        })
      )
    ).finally(() => refreshServerWishlist().catch(() => {}));
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
