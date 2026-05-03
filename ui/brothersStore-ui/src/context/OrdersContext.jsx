import { createContext, useContext, useEffect, useState } from "react";

import { apiClient, createAuthHeaders } from "../lib/api";
import { useAuth } from "./AuthContext";
import {
  getApiErrorMessage,
  normalizeOrder,
} from "../lib/storeApi";

const OrdersContext = createContext(null);
const ORDER_STATUS_STORAGE_KEY = "brothersStoreOrderStatusOverrides";

const readStatusOverrides = () => {
  if (typeof window === "undefined") {
    return {};
  }

  const rawOverrides = window.localStorage.getItem(ORDER_STATUS_STORAGE_KEY);

  if (!rawOverrides) {
    return {};
  }

  try {
    return JSON.parse(rawOverrides);
  } catch {
    return {};
  }
};

const saveStatusOverrides = (overrides) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ORDER_STATUS_STORAGE_KEY,
    JSON.stringify(overrides)
  );
};

const getOrderKeys = (orderOrId) => {
  if (typeof orderOrId === "object") {
    return [orderOrId.id, orderOrId.code].filter(Boolean).map(String);
  }

  return [orderOrId].filter(Boolean).map(String);
};

export function OrdersProvider({ children }) {
  const { currentUser, ensureAuthenticated, profile, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ownerOrders, setOwnerOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [error, setError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [statusOverrides, setStatusOverrides] = useState(() =>
    readStatusOverrides()
  );

  const applyStatusOverride = (order) => {
    const override = getOrderKeys(order)
      .map((key) => statusOverrides[key])
      .find(Boolean);

    return override
      ? {
          ...order,
          status: override,
        }
      : order;
  };

  const persistStatusOverride = (orderId, status) => {
    setStatusOverrides((currentOverrides) => {
      const nextOverrides = {
        ...currentOverrides,
        [String(orderId)]: status,
      };

      saveStatusOverrides(nextOverrides);
      return nextOverrides;
    });
  };

  const applyOrderStatusToLists = (orderId, status) => {
    const updateOrder = (order) =>
      getOrderKeys(order).includes(String(orderId))
        ? {
            ...order,
            status,
          }
        : order;

    setOrders((currentOrders) => currentOrders.map(updateOrder));
    setOwnerOrders((currentOrders) => currentOrders.map(updateOrder));
  };

  const applyOrderUpdateToLists = (updatedOrder) => {
    const applyOrder = (order) =>
      getOrderKeys(order).includes(String(updatedOrder.id)) ? updatedOrder : order;

    setOrders((currentOrders) => currentOrders.map(applyOrder));
    setOwnerOrders((currentOrders) => currentOrders.map(applyOrder));
  };

  const refreshOrders = async () => {
    if (!token) {
      setOrders([]);
      setError("");
      return [];
    }

    setLoading(true);

    try {
      const { data } = await apiClient.get("/orders", {
        headers: createAuthHeaders(token),
      });
      const normalizedOrders = Array.isArray(data)
        ? data.map((order) => applyStatusOverride(normalizeOrder(order)))
        : [];

      setOrders(normalizedOrders);
      setError("");
      return normalizedOrders;
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, "Unable to load your orders.");
      setError(message);
      throw new Error(message, { cause: apiError });
    } finally {
      setLoading(false);
    }
  };

  const refreshOwnerOrders = async () => {
    if (!token) {
      setOwnerOrders([]);
      setOwnerError("");
      return [];
    }

    setOwnerLoading(true);

    const requestConfig = {
      headers: createAuthHeaders(token),
    };

    try {
      let data;

      try {
        const response = await apiClient.get("/orders/owner", requestConfig);
        data = response.data;
      } catch {
        const response = await apiClient.get("/orders", {
          ...requestConfig,
          params: {
            scope: "all",
          },
        });
        data = response.data;
      }

      const rawOrders = Array.isArray(data?.items) ? data.items : data;
      const normalizedOrders = Array.isArray(rawOrders)
        ? rawOrders.map((order) => applyStatusOverride(normalizeOrder(order)))
        : [];

      setOwnerOrders(normalizedOrders);
      setOwnerError("");
      return normalizedOrders;
    } catch (apiError) {
      const message = getApiErrorMessage(
        apiError,
        "Unable to load dashboard orders."
      );
      setOwnerError(message);
      setOwnerOrders([]);
      throw new Error(message, { cause: apiError });
    } finally {
      setOwnerLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setOrders([]);
        setError("");
      });
      return;
    }

    queueMicrotask(() => {
      refreshOrders().catch(() => {
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const placeOrder = async ({
    shippingAddress,
    paymentMethod,
    customerName,
    customerMobile,
    customerEmail,
  }) => {
    if (!ensureAuthenticated()) {
      throw new Error("Please sign in to place your order.");
    }

    try {
      const { data } = await apiClient.post(
        "/orders",
        {
          shippingAddress,
          paymentMethod,
          customerName: customerName || profile.fullName || currentUser?.fullName,
          customerMobile: customerMobile || profile.mobile || currentUser?.phoneNumber,
          customerEmail: customerEmail || profile.email || currentUser?.email,
        },
        {
          headers: createAuthHeaders(token),
        }
      );
      const normalizedOrder = normalizeOrder(data);

      setOrders((currentOrders) => [normalizedOrder, ...currentOrders]);
      setError("");

      return normalizedOrder;
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, "Unable to place your order.");
      setError(message);
      throw new Error(message, { cause: apiError });
    }
  };

  const confirmOrder = async (orderId) => {
    try {
      if (token) {
        const { data } = await apiClient.patch(
          `/orders/${orderId}/status`,
          {
            status: "Confirmed",
          },
          {
            headers: createAuthHeaders(token),
          }
        );

        const normalizedOrder = applyStatusOverride(normalizeOrder(data));
        applyOrderUpdateToLists(normalizedOrder);
        persistStatusOverride(orderId, "Confirmed");
        return normalizedOrder;
      }
    } catch {
      // Status persistence is optional until the backend endpoint is available.
    }

    persistStatusOverride(orderId, "Confirmed");
    applyOrderStatusToLists(orderId, "Confirmed");
    return null;
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        ownerOrders,
        loading,
        ownerLoading,
        error,
        ownerError,
        refreshOrders,
        refreshOwnerOrders,
        placeOrder,
        confirmOrder,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOrders = () => useContext(OrdersContext);
