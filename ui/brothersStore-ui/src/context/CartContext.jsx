import { createContext, useContext, useEffect, useState } from "react";

import { apiClient, createAuthHeaders } from "../lib/api";
import { useAuth } from "./AuthContext";
import {
  getApiErrorMessage,
  normalizeCartResponse,
} from "../lib/storeApi";

const CartContext = createContext(null);
const GUEST_CART_STORAGE_KEY = "brothersStoreGuestCart";
const MAX_QUANTITY_PER_ITEM = 10;

const validateMaxQuantity = (nextQuantity) => {
  if (nextQuantity > MAX_QUANTITY_PER_ITEM) {
    throw new Error(
      `You can only add up to ${MAX_QUANTITY_PER_ITEM} quantity for a product.`
    );
  }
};

const getStoredCart = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const rawCart = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);

  if (!rawCart) {
    return [];
  }

  try {
    const parsedCart = JSON.parse(rawCart);
    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch {
    return [];
  }
};

const saveGuestCart = (nextCart) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(nextCart));
};

const clearGuestCart = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
};

const toCartItem = (productOrId, quantity, currentCart, fallbackProduct = null) => {
  if (typeof productOrId === "number") {
    const existingItem = currentCart.find((item) => item.id === productOrId);

    if (!existingItem) {
      if (!fallbackProduct) {
        throw new Error("Product details are not available for this cart item.");
      }

      return {
        id: productOrId,
        title: fallbackProduct.title,
        price: fallbackProduct.price,
        quantity,
      };
    }

    return {
      ...existingItem,
      quantity,
    };
  }

  return {
    id: productOrId.id,
    title: productOrId.title,
    price: productOrId.price,
    quantity,
  };
};

export function CartProvider({ children }) {
  const { token, logout } = useAuth();
  const [cart, setCart] = useState(() => getStoredCart());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyCartResponse = (response) => {
    const normalizedCart = normalizeCartResponse(response);
    setCart(normalizedCart.items);
    return normalizedCart;
  };

  const refreshCart = async () => {
    if (!token) {
      setCart(getStoredCart());
      setError("");
      return null;
    }

    setLoading(true);

    try {
      const { data } = await apiClient.get("/cart", {
        headers: createAuthHeaders(token),
      });

      setError("");
      return applyCartResponse(data);
    } catch (apiError) {
      if (apiError?.response?.status === 401) {
        logout();
        const guestCart = getStoredCart();
        setCart(guestCart);
        setError("Your session expired. Please sign in again.");
        return null;
      }

      const message = getApiErrorMessage(apiError, "Unable to load your cart.");
      setError(message);
      throw new Error(message, { cause: apiError });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setCart(getStoredCart());
        setError("");
      });
      return;
    }

    queueMicrotask(() => {
      const guestCart = getStoredCart();

      if (guestCart.length === 0) {
        refreshCart().catch(() => {
        });
        return;
      }

      setLoading(true);

      Promise.all(
        guestCart.map((item) =>
          apiClient.post(
            "/cart/items",
            {
              productId: item.id,
              quantity: item.quantity,
            },
            {
              headers: createAuthHeaders(token),
            }
          )
        )
      )
        .then(() => {
          clearGuestCart();
          return refreshCart();
        })
        .catch((apiError) => {
          setError(getApiErrorMessage(apiError, "Unable to sync your cart."));
          setCart(guestCart);
        })
        .finally(() => {
          setLoading(false);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const addToCart = async (productOrId, quantity = 1, fallbackProduct = null) => {
    const productId =
      typeof productOrId === "number" ? productOrId : productOrId?.id;

    if (!token) {
      const nextCart = (() => {
        const existingItem = cart.find((item) => item.id === productId);

        if (existingItem) {
          validateMaxQuantity(existingItem.quantity + quantity);
          return cart.map((item) =>
            item.id === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }

        validateMaxQuantity(quantity);
        return [...cart, toCartItem(productOrId, quantity, cart, fallbackProduct)];
      })();

      setCart(nextCart);
      saveGuestCart(nextCart);
      setError("");
      return {
        items: nextCart,
      };
    }

    const existingItem = cart.find((item) => item.id === productId);
    if (existingItem) {
      validateMaxQuantity(existingItem.quantity + quantity);
    } else {
      validateMaxQuantity(quantity);
    }

    try {
      const { data } = await apiClient.post(
        "/cart/items",
        {
          productId,
          quantity,
        },
        {
          headers: createAuthHeaders(token),
        }
      );

      setError("");
      return applyCartResponse(data);
    } catch (apiError) {
      if (apiError?.response?.status === 401) {
        logout();
        const message = "Your session expired. Please sign in again.";
        setError(message);
        throw new Error(message, { cause: apiError });
      }

      const message = getApiErrorMessage(apiError, "Unable to update your cart.");
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    validateMaxQuantity(quantity);

    if (!token) {
      const nextCart = cart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );

      setCart(nextCart);
      saveGuestCart(nextCart);
      setError("");
      return {
        items: nextCart,
      };
    }

    try {
      const { data } = await apiClient.patch(
        `/cart/items/${productId}`,
        {
          quantity,
        },
        {
          headers: createAuthHeaders(token),
        }
      );

      setError("");
      return applyCartResponse(data);
    } catch (apiError) {
      if (apiError?.response?.status === 401) {
        logout();
        const message = "Your session expired. Please sign in again.";
        setError(message);
        throw new Error(message, { cause: apiError });
      }

      const message = getApiErrorMessage(apiError, "Unable to update item quantity.");
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  };

  const removeFromCart = async (productId) => {
    if (!token) {
      const nextCart = cart.filter((item) => item.id !== productId);

      setCart(nextCart);
      saveGuestCart(nextCart);
      setError("");
      return {
        items: nextCart,
      };
    }

    try {
      const { data } = await apiClient.delete(`/cart/items/${productId}`, {
        headers: createAuthHeaders(token),
      });

      setError("");
      return applyCartResponse(data);
    } catch (apiError) {
      if (apiError?.response?.status === 401) {
        logout();
        const message = "Your session expired. Please sign in again.";
        setError(message);
        throw new Error(message, { cause: apiError });
      }

      const message = getApiErrorMessage(apiError, "Unable to remove this item.");
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  };

  const decreaseQuantity = async (productId) => {
    const cartItem = cart.find((item) => item.id === productId);

    if (!cartItem) {
      return null;
    }

    return updateQuantity(productId, cartItem.quantity - 1);
  };

  const clearCart = async () => {
    if (!token) {
      setCart([]);
      saveGuestCart([]);
      setError("");
      return;
    }

    try {
      await apiClient.delete("/cart", {
        headers: createAuthHeaders(token),
      });

      setCart([]);
      clearGuestCart();
      setError("");
    } catch (apiError) {
      if (apiError?.response?.status === 401) {
        logout();
        const message = "Your session expired. Please sign in again.";
        setError(message);
        throw new Error(message, { cause: apiError });
      }

      const message = getApiErrorMessage(apiError, "Unable to clear your cart.");
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  };

  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        cartQuantity,
        cartTotal,
        refreshCart,
        addToCart,
        updateQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
