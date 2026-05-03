import { createContext, useContext, useEffect, useState } from "react";

import { apiClient, createAuthHeaders } from "../lib/api";
import {
  buildCategories,
  buildProductPayload,
  getApiErrorMessage,
  normalizeProduct,
} from "../lib/storeApi";
import { useAuth } from "./AuthContext";

const ProductsContext = createContext(null);

const extractProductFromResponse = (data, productId) => {
  const candidates = [
    ...(Array.isArray(data) ? data : []),
    ...(Array.isArray(data?.items) ? data.items : []),
    ...(Array.isArray(data?.data) ? data.data : []),
    ...(data?.item ? [data.item] : []),
    ...(data?.product ? [data.product] : []),
    ...(data && !Array.isArray(data) ? [data] : []),
  ];

  const match = candidates.find((product) =>
    String(product?.id ?? product?.productId ?? product?.productID) ===
    String(productId)
  );

  return match ?? candidates[0] ?? null;
};

export function ProductsProvider({ children }) {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [productDetails, setProductDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refreshProducts = async () => {
    setLoading(true);

    try {
      const { data } = await apiClient.get("/products", {
        params: {
          page: 1,
          pageSize: 50,
          includeInactive: true,
        },
      });

      const normalizedProducts = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []).map(
        normalizeProduct
      );

      setProducts(normalizedProducts);
      setError("");
      return normalizedProducts;
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, "Unable to load products.");
      setError(message);
      setProducts([]);
      throw new Error(message, { cause: apiError });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      try {
        const normalizedProducts = await refreshProducts();

        if (ignore) {
          return;
        }

        setProducts(normalizedProducts);
        setError("");
      } catch (apiError) {
        if (ignore) {
          return;
        }

        setError(getApiErrorMessage(apiError, "Unable to load products."));
        setProducts([]);
      }
    };

    loadProducts();

    return () => {
      ignore = true;
    };
  }, []);

  const loadProduct = async (productId) => {
    const cachedProduct = productDetails[productId];

    if (cachedProduct) {
      return cachedProduct;
    }

    const requestAttempts = [
      () => apiClient.get(`/products/${productId}`),
      () => apiClient.get("/products", { params: { id: productId } }),
      () => apiClient.get(`/products/details/${productId}`),
    ];

    let lastError = null;

    for (const request of requestAttempts) {
      try {
        const { data } = await request();
        const product = extractProductFromResponse(data, productId);

        if (!product) {
          continue;
        }

        const normalizedProduct = normalizeProduct(product);

        setProductDetails((currentDetails) => ({
          ...currentDetails,
          [productId]: normalizedProduct,
        }));
        setProducts((currentProducts) =>
          currentProducts.some((item) => item.id === normalizedProduct.id)
            ? currentProducts.map((item) =>
                item.id === normalizedProduct.id
                  ? { ...item, ...normalizedProduct }
                  : item
              )
            : [...currentProducts, normalizedProduct]
        );

        return normalizedProduct;
      } catch (apiError) {
        lastError = apiError;

        const status = apiError?.response?.status;
        if (status && status !== 404 && status !== 400) {
          break;
        }
      }
    }

    throw new Error(
      getApiErrorMessage(lastError, "Unable to load this product."),
      {
        cause: lastError,
      }
    );
  };

  const saveProduct = async (product) => {
    const payload = buildProductPayload(product);
    const productId = product.id;

    if (!payload.name) {
      throw new Error("Enter product name.");
    }

    if (!payload.categoryName) {
      throw new Error("Enter product category.");
    }

    if (payload.price <= 0) {
      throw new Error("Enter a valid product price.");
    }

    if (payload.stock < 0) {
      throw new Error("Stock cannot be negative.");
    }

    setSaving(true);

    try {
      const { data } = productId
        ? await apiClient.put(`/products/${productId}`, payload, {
            headers: createAuthHeaders(token),
          })
        : await apiClient.post("/products", payload, {
            headers: createAuthHeaders(token),
          });
      const savedProduct = normalizeProduct(data);

      setProducts((currentProducts) =>
        currentProducts.some((item) => item.id === savedProduct.id)
          ? currentProducts.map((item) =>
              item.id === savedProduct.id ? savedProduct : item
            )
          : [savedProduct, ...currentProducts]
      );
      setProductDetails((currentDetails) => ({
        ...currentDetails,
        [savedProduct.id]: savedProduct,
      }));
      setError("");

      return savedProduct;
    } catch (apiError) {
      throw new Error(getApiErrorMessage(apiError, "Unable to save product."), {
        cause: apiError,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleProductActive = async (productId, isActive) => {
    setSaving(true);

    try {
      const { data } = await apiClient.patch(
        `/products/${productId}`,
        {
          isActive,
        },
        {
          headers: createAuthHeaders(token),
        }
      );
      const updatedProduct = normalizeProduct(data);

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === productId ? { ...product, ...updatedProduct } : product
        )
      );
      setProductDetails((currentDetails) => ({
        ...currentDetails,
        [productId]: {
          ...(currentDetails[productId] ?? {}),
          ...updatedProduct,
        },
      }));
      setError("");

      return updatedProduct;
    } catch (apiError) {
      throw new Error(
        getApiErrorMessage(apiError, "Unable to update product status."),
        {
          cause: apiError,
        }
      );
    } finally {
      setSaving(false);
    }
  };

  const productLookup = {};

  for (const product of products) {
    productLookup[product.id] = product;
  }

  for (const product of Object.values(productDetails)) {
    productLookup[product.id] = product;
  }

  return (
    <ProductsContext.Provider
      value={{
        products,
        productLookup,
        categories: buildCategories(products),
        loading,
        error,
        saving,
        loadProduct,
        refreshProducts,
        saveProduct,
        toggleProductActive,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProducts = () => useContext(ProductsContext);
