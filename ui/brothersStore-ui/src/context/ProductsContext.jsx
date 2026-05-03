import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiClient, createAuthHeaders } from "../lib/api";
import {
  buildProductPayload,
  buildCategories,
  getApiErrorMessage,
  normalizeProduct,
} from "../lib/storeApi";
import { useAuth } from "./AuthContext";

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const { isAdmin, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [productDetails, setProductDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    const shouldIncludeInactive = Boolean(token && isAdmin);

    try {
      const { data } = await apiClient.get("/products", {
        params: {
          page: 1,
          pageSize: 50,
          includeInactive: shouldIncludeInactive,
        },
      });

      const normalizedProducts = (data?.items ?? data ?? []).map(normalizeProduct);

      setProducts(normalizedProducts);
      setError("");
      return normalizedProducts;
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, "Unable to load products.");
      setError(message);
      setProducts((currentProducts) =>
        currentProducts.length > 0 ? currentProducts : []
      );
      throw new Error(message, { cause: apiError });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

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
        setProducts((currentProducts) =>
          currentProducts.length > 0 ? currentProducts : []
        );
      }
    };

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [refreshProducts]);

  const loadProduct = useCallback(async (productId) => {
    const cachedProduct = productDetails[productId];

    if (cachedProduct) {
      return cachedProduct;
    }

    try {
      const { data } = await apiClient.get(`/products/${productId}`);
      const normalizedProduct = normalizeProduct(data);

      setProductDetails((currentDetails) => ({
        ...currentDetails,
        [productId]: normalizedProduct,
      }));
      setProducts((currentProducts) =>
        currentProducts.some((product) => product.id === normalizedProduct.id)
          ? currentProducts.map((product) =>
              product.id === normalizedProduct.id
                ? { ...product, ...normalizedProduct }
                : product
            )
          : [...currentProducts, normalizedProduct]
      );

      return normalizedProduct;
    } catch (apiError) {
      throw new Error(
        getApiErrorMessage(apiError, "Unable to load this product."),
        {
          cause: apiError,
        }
      );
    }
  }, [productDetails]);

  const saveProduct = useCallback(async (product) => {
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
  }, [token]);

  const toggleProductActive = useCallback(async (productId, isActive) => {
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
  }, [token]);

  const productLookup = useMemo(() => {
    const lookup = {};

    for (const product of products) {
      lookup[product.id] = product;
    }

    for (const product of Object.values(productDetails)) {
      lookup[product.id] = product;
    }

    return lookup;
  }, [productDetails, products]);

  const categories = useMemo(() => buildCategories(products), [products]);

  const value = useMemo(
    () => ({
      products,
      productLookup,
      categories,
      loading,
      error,
      saving,
      loadProduct,
      refreshProducts,
      saveProduct,
      toggleProductActive,
    }),
    [
      categories,
      error,
      loadProduct,
      loading,
      productLookup,
      products,
      refreshProducts,
      saveProduct,
      saving,
      toggleProductActive,
    ]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProducts = () => useContext(ProductsContext);
