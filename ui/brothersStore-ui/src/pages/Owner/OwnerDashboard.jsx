import { useEffect, useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";
import {
  FiArchive,
  FiCheckCircle,
  FiEdit3,
  FiImage,
  FiPlus,
  FiRefreshCw,
  FiShoppingBag,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiUserPlus,
  FiUsers,
  FiVideo,
  FiX,
} from "react-icons/fi";

import Navbar from "../../components/layout/Navbar";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrdersContext";
import { useProducts } from "../../context/ProductsContext";
import { useReviews } from "../../context/ReviewsContext";
import { apiClient, createAuthHeaders } from "../../lib/api";

const emptyProductForm = {
  id: null,
  title: "",
  category: "",
  description: "",
  originalPrice: "",
  price: "",
  stock: "",
  images: [],
  videos: [],
  isActive: true,
};

const inputClass =
  "mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black";

const formatPrice = (amount) => {
  const value = Number(amount ?? 0);
  const normalized = Number.isFinite(value) ? value : 0;
  return `Rs. ${normalized.toLocaleString("en-IN")}`;
};

const formatDate = (dateValue) =>
  new Date(dateValue).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatOrderGroupKey = (dateValue) =>
  new Date(dateValue).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const formatOrderGroupLabel = (dateValue) =>
  new Date(dateValue).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const productToForm = (product) => ({
  id: product.id,
  title: product.title,
  category: product.category,
  description: product.description,
  originalPrice: String(product.originalPrice ?? product.oldPrice ?? product.price),
  price: String(product.price),
  stock: String(product.stock),
  images: product.images ?? [],
  videos: product.videos ?? [],
  isActive: product.isActive,
});

const getDiscountPercent = (originalPrice, finalPrice) => {
  const original = Number(originalPrice ?? 0);
  const finalAmount = Number(finalPrice ?? 0);

  if (!Number.isFinite(original) || !Number.isFinite(finalAmount) || original <= 0 || original <= finalAmount) {
    return 0;
  }

  return Math.round(((original - finalAmount) / original) * 100);
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function OwnerDashboard() {
  const {
    addAdmin,
    adminEmails,
    isAdmin,
    isAuthenticated,
    openAuthModal,
    token,
  } = useAuth();
  const {
    products,
    loading,
    saving,
    error,
    loadProduct,
    refreshProducts,
    saveProduct,
    toggleProductActive,
    deleteProduct,
  } = useProducts();
  const {
    ownerOrders,
    ownerLoading,
    ownerError,
    refreshOwnerOrders,
    confirmOrder,
  } = useOrders();
  const {
    pendingReviews,
    approvedReviews,
    approveReview,
    deleteReview,
  } = useReviews();
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [prepaidDiscountRules, setPrepaidDiscountRules] = useState([]);
  const [discountRuleForm, setDiscountRuleForm] = useState({
    productId: "",
    minQuantity: "1",
    maxQuantity: "",
    discountPerItem: "0",
  });
  const [discountRulesLoading, setDiscountRulesLoading] = useState(false);
  const [discountRulesSaving, setDiscountRulesSaving] = useState(false);
  const [visitorStats, setVisitorStats] = useState({
    uniqueVisitors: 0,
    totalVisitors: 0,
  });

  useEffect(() => {
    queueMicrotask(() => {
      refreshOwnerOrders().catch(() => {
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      return;
    }

    apiClient.get("/analytics/summary", {
      headers: createAuthHeaders(token),
    }).then(({ data }) => {
      setVisitorStats({
        uniqueVisitors: Number(data?.uniqueVisitors ?? 0),
        totalVisitors: Number(data?.totalVisitors ?? 0),
      });
    }).catch(() => {
    });
  }, [isAdmin, isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      return;
    }

    setDiscountRulesLoading(true);
    apiClient
      .get("/admin/prepaid-discounts", {
        headers: createAuthHeaders(token),
      })
      .then(({ data }) => {
        setPrepaidDiscountRules(Array.isArray(data) ? data : []);
      })
      .catch(() => {
      })
      .finally(() => setDiscountRulesLoading(false));
  }, [isAdmin, isAuthenticated, token]);

  const refreshPrepaidDiscountRules = async () => {
    const { data } = await apiClient.get("/admin/prepaid-discounts", {
      headers: createAuthHeaders(token),
    });
    setPrepaidDiscountRules(Array.isArray(data) ? data : []);
  };

  const handleCreateDiscountRule = async (event) => {
    event.preventDefault();

    setDashboardError("");
    setDashboardMessage("");

    const productId = Number(discountRuleForm.productId || 0);
    const minQuantity = Number(discountRuleForm.minQuantity || 0);
    const maxQuantityRaw = String(discountRuleForm.maxQuantity ?? "").trim();
    const maxQuantity = maxQuantityRaw ? Number(maxQuantityRaw) : null;
    const discountPerItem = Number(discountRuleForm.discountPerItem || 0);

    if (!productId) {
      setDashboardError("Select a product for the prepaid discount rule.");
      return;
    }

    if (!Number.isFinite(minQuantity) || minQuantity < 1) {
      setDashboardError("Min quantity must be at least 1.");
      return;
    }

    if (maxQuantity !== null && (!Number.isFinite(maxQuantity) || maxQuantity < minQuantity)) {
      setDashboardError("Max quantity must be empty or greater than min quantity.");
      return;
    }

    if (!Number.isFinite(discountPerItem) || discountPerItem < 0) {
      setDashboardError("Discount per item must be 0 or more.");
      return;
    }

    setDiscountRulesSaving(true);
    try {
      await apiClient.post(
        "/admin/prepaid-discounts",
        {
          productId,
          minQuantity,
          maxQuantity,
          discountPerItem,
          isActive: true,
        },
        {
          headers: createAuthHeaders(token),
        }
      );

      await refreshPrepaidDiscountRules();
      setDiscountRuleForm((current) => ({
        ...current,
        minQuantity: "1",
        maxQuantity: "",
        discountPerItem: "0",
      }));
      setDashboardMessage("Prepaid discount rule saved.");
    } catch (error) {
      setDashboardError(error?.response?.data?.message || error?.message || "Unable to save prepaid discount rule.");
    } finally {
      setDiscountRulesSaving(false);
    }
  };

  const handleDeleteDiscountRule = async (ruleId) => {
    setDashboardError("");
    setDashboardMessage("");

    try {
      await apiClient.delete(`/admin/prepaid-discounts/${ruleId}`, {
        headers: createAuthHeaders(token),
      });
      await refreshPrepaidDiscountRules();
      setDashboardMessage("Prepaid discount rule deleted.");
    } catch (error) {
      setDashboardError(error?.response?.data?.message || error?.message || "Unable to delete prepaid discount rule.");
    }
  };

  const stats = useMemo(() => {
    const activeProducts = products.filter((product) => product.isActive);
    const lowStockProducts = products.filter((product) => product.stock <= 5);
    const totalSales = ownerOrders.reduce(
      (total, order) => total + order.totalAmount,
      0
    );

    return {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      inactiveProducts: products.length - activeProducts.length,
      lowStockProducts: lowStockProducts.length,
      totalOrders: ownerOrders.length,
      totalSales,
      pendingReviews: pendingReviews.length,
    };
  }, [ownerOrders, pendingReviews.length, products]);

	  const productOrderStats = useMemo(() => {
	    const statsByProductId = {};

	    for (const product of products) {
	      statsByProductId[product.id] = {
	        product,
	        existsInCatalog: true,
	        orderCount: 0,
	        quantity: 0,
	        revenue: 0,
	        customers: [],
	      };
	    }

	    for (const order of ownerOrders) {
	      for (const item of order.items) {
		        if (!statsByProductId[item.id]) {
		          const fallbackPrice = Number(item.price ?? 0);
		          statsByProductId[item.id] = {
		            product: {
		              id: item.id,
		              title: item.title,
		              description: "",
		              images: [],
		              category: "Uncategorized",
		              stock: 0,
		              price: fallbackPrice,
		              oldPrice: fallbackPrice,
		              originalPrice: fallbackPrice,
		              discountPercent: 0,
		              videos: [],
		              hasVideo: false,
		              isActive: false,
		            },
		            existsInCatalog: false,
		            orderCount: 0,
		            quantity: 0,
		            revenue: 0,
		            customers: [],
		          };
		        }

        statsByProductId[item.id].orderCount += 1;
        statsByProductId[item.id].quantity += item.quantity;
        statsByProductId[item.id].revenue += item.price * item.quantity;
        statsByProductId[item.id].customers.push({
          orderCode: order.code,
          name: order.customerName,
          mobile: order.customerMobile,
          email: order.customerEmail,
          quantity: item.quantity,
        });
      }
    }

    return Object.values(statsByProductId);
  }, [ownerOrders, products]);

  const recentOrderLines = useMemo(
    () =>
      ownerOrders.flatMap((order) =>
        order.items.map((item) => ({
          id: `${order.id}-${item.id}`,
          order,
          item,
        }))
      ),
    [ownerOrders]
  );

  const groupedRecentOrderLines = useMemo(() => {
    const groups = new Map();

    for (const line of recentOrderLines) {
      const key = formatOrderGroupKey(line.order.createdAt);
      const existing = groups.get(key);

      if (existing) {
        existing.lines.push(line);
        continue;
      }

      groups.set(key, {
        key,
        label: formatOrderGroupLabel(line.order.createdAt),
        sortValue: new Date(line.order.createdAt).getTime(),
        lines: [line],
      });
    }

    return Array.from(groups.values()).sort((a, b) => b.sortValue - a.sortValue);
  }, [recentOrderLines]);

  const updateForm = (field, value) => {
    setProductForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setDashboardError("");
    setDashboardMessage("");
  };

  const handleMediaSelect = async (files) => {
    const selectedFiles = Array.from(files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    try {
      const imageFiles = selectedFiles.filter((file) =>
        file.type.startsWith("image/")
      );
      const videoFiles = selectedFiles.filter((file) =>
        file.type.startsWith("video/")
      );
      const oversizedVideo = videoFiles.find(
        (file) => file.size > 20 * 1024 * 1024
      );
      const selectedVideoSize = videoFiles.reduce(
        (totalSize, file) => totalSize + file.size,
        0
      );

      if (oversizedVideo) {
        setDashboardError(
          `${oversizedVideo.name} is too large. Keep each video under 20 MB.`
        );
        return;
      }

      if (selectedVideoSize > 40 * 1024 * 1024) {
        setDashboardError(
          "Selected videos are too large together. Keep total video upload under 40 MB per save."
        );
        return;
      }

      const readMediaItems = (mediaFiles, mediaType) =>
        Promise.all(
          mediaFiles.map(async (file) => ({
          id: `${mediaType}-${file.name}-${file.lastModified}`,
          name: file.name,
          type: file.type,
          src: await readFileAsDataUrl(file),
        }))
        );

      const [imageItems, videoItems] = await Promise.all([
        readMediaItems(imageFiles, "image"),
        readMediaItems(videoFiles, "video"),
      ]);

      setProductForm((currentForm) => ({
        ...currentForm,
        images: [...currentForm.images, ...imageItems],
        videos: [...currentForm.videos, ...videoItems],
      }));
      setDashboardError("");
      setDashboardMessage("");
    } catch {
      setDashboardError("Unable to read selected media files.");
    }
  };

  const removeMedia = (mediaType, mediaIndex) => {
    setProductForm((currentForm) => ({
      ...currentForm,
      [mediaType]: currentForm[mediaType].filter((_, index) => index !== mediaIndex),
    }));
  };

  const handleEditProduct = async (product) => {
    try {
      const loadedProduct = await loadProduct(product.id);

      setProductForm(productToForm(loadedProduct));
      setDashboardError("");
      setDashboardMessage("");
    } catch (editError) {
      setDashboardError(editError.message);
    }
  };

  const resetForm = () => {
    setProductForm(emptyProductForm);
    setDashboardError("");
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();

    try {
      const savedProduct = await saveProduct({
        ...productForm,
        originalPrice: Number(productForm.originalPrice || productForm.price),
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        images: productForm.images.map((image) => image.src ?? image),
        videos: productForm.videos.map((video) => video.src ?? video),
      });

      setDashboardMessage(`${savedProduct.title} saved successfully.`);
      resetForm();
    } catch (saveError) {
      setDashboardError(saveError.message);
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await toggleProductActive(product.id, !product.isActive);
      setDashboardMessage(
        `${product.title} ${product.isActive ? "deactivated" : "activated"}.`
      );
      setDashboardError("");
    } catch (toggleError) {
      setDashboardError(toggleError.message);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(`Delete "${product.title}" permanently?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(product.id);
      setDashboardMessage(`${product.title} deleted.`);
      setDashboardError("");

      if (productForm.id === product.id) {
        resetForm();
      }
    } catch (deleteError) {
      setDashboardError(deleteError.message);
    }
  };

  const handleConfirmOrder = async (order) => {
    const confirmedOrder = await confirmOrder(order.id);
    const confirmedBy = confirmedOrder?.confirmedByAdminName || "Admin";
    setDashboardError("");
    setDashboardMessage(`${order.code} confirmed by ${confirmedBy}.`);
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await approveReview(reviewId);
      setDashboardError("");
      setDashboardMessage("Review approved successfully.");
    } catch (reviewError) {
      setDashboardError(reviewError.message);
      setDashboardMessage("");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await deleteReview(reviewId);
      setDashboardError("");
      setDashboardMessage("Review removed successfully.");
    } catch (reviewError) {
      setDashboardError(reviewError.message);
      setDashboardMessage("");
    }
  };

  const handleAddAdmin = async (event) => {
    event.preventDefault();

    try {
      const addedEmail = await addAdmin(newAdminEmail);
      setNewAdminEmail("");
      setDashboardError("");
      setDashboardMessage(`${addedEmail} added as admin.`);
    } catch (addAdminError) {
      setDashboardError(addAdminError.message);
      setDashboardMessage("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />

        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Owner Dashboard
            </h1>
            <p className="mt-3 text-gray-600">
              Sign in with an admin Google account to manage the store.
            </p>
            <button
              type="button"
              onClick={openAuthModal}
              className="mt-5 rounded-lg bg-black px-5 py-3 font-semibold text-white"
            >
              Sign In
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />

        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Owner Dashboard
            </h1>
            <p className="mt-3 text-gray-600">
              Your account does not have admin access.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Owner Tools
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              Product Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Add products, update stock, and control what appears in the store.
            </p>
          </div>

          <button
            type="button"
              onClick={() => {
                refreshProducts().catch((refreshError) =>
                  setDashboardError(refreshError.message)
                );
                refreshOwnerOrders().catch((refreshError) =>
                  setDashboardError(refreshError.message)
                );
                apiClient.get("/analytics/summary", {
                  headers: createAuthHeaders(token),
                }).then(({ data }) => {
                  setVisitorStats({
                    uniqueVisitors: Number(data?.uniqueVisitors ?? 0),
                    totalVisitors: Number(data?.totalVisitors ?? 0),
                  });
                }).catch(() => {
                });
              }}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
          >
            <FiRefreshCw />
            Refresh
          </button>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-9">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiArchive className="text-xl text-gray-500" />
            <p className="mt-3 text-sm text-gray-500">Total products</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats.totalProducts}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiCheckCircle className="text-xl text-green-600" />
            <p className="mt-3 text-sm text-gray-500">Active</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats.activeProducts}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiToggleLeft className="text-xl text-gray-500" />
            <p className="mt-3 text-sm text-gray-500">Inactive</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats.inactiveProducts}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiArchive className="text-xl text-amber-600" />
            <p className="mt-3 text-sm text-gray-500">Low stock</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats.lowStockProducts}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiShoppingBag className="text-xl text-blue-600" />
            <p className="mt-3 text-sm text-gray-500">Total orders</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats.totalOrders}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiUsers className="text-xl text-purple-600" />
            <p className="mt-3 text-sm text-gray-500">Sales value</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatPrice(stats.totalSales)}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiCheckCircle className="text-xl text-indigo-600" />
            <p className="mt-3 text-sm text-gray-500">Pending reviews</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats.pendingReviews}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiUsers className="text-xl text-sky-600" />
            <p className="mt-3 text-sm text-gray-500">Unique visitors</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {visitorStats.uniqueVisitors}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <FiUsers className="text-xl text-cyan-600" />
            <p className="mt-3 text-sm text-gray-500">Total visitors</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {visitorStats.totalVisitors}
            </p>
          </div>
        </section>

        {(dashboardMessage || dashboardError || error || ownerError) && (
          <div
            className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${
              dashboardError || error || ownerError
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {dashboardError || error || ownerError || dashboardMessage}
          </div>
        )}

        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Admin access
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Only these Google accounts can open the dashboard.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {adminEmails.map((email) => (
                  <span
                    key={email}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                  >
                    {email}
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddAdmin} className="w-full lg:max-w-sm">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  Add admin email
                </span>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(event) => setNewAdminEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white"
              >
                <FiUserPlus />
                Add Admin
              </button>
            </form>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={handleSaveProduct}
            className="rounded-lg bg-white p-4 shadow-sm lg:sticky lg:top-28 lg:self-start"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">
                {productForm.id ? "Edit product" : "Post product"}
              </h2>
              {productForm.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-semibold text-gray-500"
                >
                  New
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  Product name
                </span>
                <input
                  type="text"
                  value={productForm.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  Category
                </span>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  placeholder="Home Decos, Essentials"
                  className={inputClass}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    Main price
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={productForm.originalPrice}
                    onChange={(event) => updateForm("originalPrice", event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    Discounted price
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={productForm.price}
                    onChange={(event) => updateForm("price", event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    Stock
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(event) => updateForm("stock", event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div>
                <span className="text-sm font-semibold text-gray-700">
                  Product media
                </span>
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm font-semibold text-gray-700">
                  <FiImage />
                  Choose Images or Videos
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(event) =>
                      handleMediaSelect(event.target.files)
                    }
                    className="sr-only"
                  />
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  Videos are saved with the product and load after the product page finishes rendering. Keep each video under 20 MB.
                </p>

                {productForm.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {productForm.images.map((image, index) => {
                      const imageSource = image.src ?? image;

                      return (
                        <div key={`${imageSource}-${index}`} className="relative">
                          <img
                            src={imageSource}
                            alt={image.name ?? `Product image ${index + 1}`}
                            className="h-20 w-full rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeMedia("images", index)}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                            aria-label="Remove image"
                          >
                            <FiX />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {productForm.videos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {productForm.videos.map((video, index) => {
                      const videoSource = video.src ?? video;

                      return (
                        <div key={`${videoSource}-${index}`} className="relative">
                          <video
                            src={videoSource}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-24 w-full rounded-lg bg-black object-cover"
                          />
                          <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                            Video
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMedia("videos", index)}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                            aria-label="Remove video"
                          >
                            <FiX />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  Description
                </span>
                <textarea
                  value={productForm.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows="4"
                  className={`${inputClass} resize-none`}
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-3">
                <span className="text-sm font-semibold text-gray-700">
                  Visible in store
                </span>
                <input
                  type="checkbox"
                  checked={productForm.isActive}
                  onChange={(event) =>
                    updateForm("isActive", event.target.checked)
                  }
                  className="h-5 w-5"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 font-semibold text-white disabled:opacity-60"
            >
              <FiPlus />
              {saving ? "Saving..." : productForm.id ? "Update Product" : "Post Product"}
            </button>
          </form>

          <section className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Prepaid discounts</h2>
              <button
                type="button"
                onClick={() => refreshPrepaidDiscountRules().catch(() => {})}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300"
                disabled={discountRulesLoading}
              >
                <FiRefreshCw className={discountRulesLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              Configure how much to discount on prepaid orders per product and quantity range. Discounts apply per item.
            </p>

            <form onSubmit={handleCreateDiscountRule} className="mt-4 grid gap-3 md:grid-cols-5">
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-gray-700">Product</span>
                <select
                  value={discountRuleForm.productId}
                  onChange={(event) =>
                    setDiscountRuleForm((current) => ({ ...current, productId: event.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={`discount-product-${product.id}`} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Min qty</span>
                <input
                  type="number"
                  min="1"
                  value={discountRuleForm.minQuantity}
                  onChange={(event) =>
                    setDiscountRuleForm((current) => ({ ...current, minQuantity: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Max qty</span>
                <input
                  type="number"
                  min="1"
                  value={discountRuleForm.maxQuantity}
                  onChange={(event) =>
                    setDiscountRuleForm((current) => ({ ...current, maxQuantity: event.target.value }))
                  }
                  placeholder="Optional"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Off / item</span>
                <input
                  type="number"
                  min="0"
                  value={discountRuleForm.discountPerItem}
                  onChange={(event) =>
                    setDiscountRuleForm((current) => ({ ...current, discountPerItem: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>

              <div className="md:col-span-5">
                <button
                  type="submit"
                  disabled={discountRulesSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <FiPlus />
                  {discountRulesSaving ? "Saving..." : "Add rule"}
                </button>
              </div>
            </form>

            <div className="mt-5">
              {discountRulesLoading ? (
                <p className="text-sm text-gray-500">Loading prepaid discount rules...</p>
              ) : prepaidDiscountRules.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No rules yet. Until you add rules, the store uses the default prepaid discount logic.
                </p>
              ) : (
                <div className="overflow-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Min</th>
                        <th className="px-3 py-2">Max</th>
                        <th className="px-3 py-2">Off / item</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prepaidDiscountRules.map((rule) => {
                        const matchedProduct = products.find((product) => product.id === rule.productId);

                        return (
                        <tr key={`prepaid-rule-${rule.id}`} className="bg-white">
                          <td className="px-3 py-2 font-semibold text-gray-900">
                            {rule.productName || matchedProduct?.title || `#${rule.productId}`}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{rule.minQuantity}</td>
                          <td className="px-3 py-2 text-gray-700">{rule.maxQuantity ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-700">{formatPrice(Number(rule.discountPerItem || 0))}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                rule.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {rule.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => matchedProduct && handleEditProduct(matchedProduct)}
                                disabled={!matchedProduct}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FiEdit3 />
                                Edit product
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDiscountRule(rule.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:border-gray-300"
                              >
                                <FiTrash2 />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="order-first rounded-lg bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900">Products</h2>

            {loading ? (
              <p className="mt-5 text-sm text-gray-500">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No products yet.</p>
            ) : (
              <>
	              <div className="mt-4 space-y-3 md:hidden">
	                {productOrderStats.map((productStat) => {
	                  const product = productStat.product;
	                  const canManageProduct = Boolean(productStat.existsInCatalog);
	                  const discountPercent = getDiscountPercent(product.oldPrice, product.price);
	                  const hasDiscount = product.oldPrice > product.price && discountPercent > 0;

                  return (
                    <article key={`mobile-${product.id}`} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{product.title}</p>
                            <p className="truncate text-xs text-gray-500">{product.category}</p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            product.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-gray-50 px-2 py-1.5">
                          <p className="text-gray-500">Price</p>
                          <p className="font-semibold text-gray-900">{formatPrice(product.price)}</p>
                          {hasDiscount && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                              <span className="text-[11px] text-gray-400 line-through">
                                {formatPrice(product.oldPrice)}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                {discountPercent}% OFF
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="rounded-md bg-gray-50 px-2 py-1.5">
                          <p className="text-gray-500">Stock</p>
                          <p className="font-semibold text-gray-900">{product.stock}</p>
                        </div>
                        <div className="rounded-md bg-gray-50 px-2 py-1.5">
                          <p className="text-gray-500">Orders</p>
                          <p className="font-semibold text-gray-900">{productStat.orderCount}</p>
                        </div>
                        <div className="rounded-md bg-gray-50 px-2 py-1.5">
                          <p className="text-gray-500">Sold</p>
                          <p className="font-semibold text-gray-900">{productStat.quantity} pcs</p>
                        </div>
                      </div>

		                      {canManageProduct && (
		                        <div className="mt-3 flex justify-end gap-2">
		                          <button
		                            type="button"
		                            onClick={() => handleEditProduct(product)}
		                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700"
		                            aria-label={`Edit ${product.title}`}
		                          >
		                            <FiEdit3 />
		                          </button>
		                          <button
		                            type="button"
		                            onClick={() => handleDeleteProduct(product)}
		                            disabled={saving}
		                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-red-600 disabled:opacity-60"
		                            aria-label={`Delete ${product.title}`}
		                          >
		                            <FiTrash2 />
		                          </button>
		                          <button
		                            type="button"
		                            onClick={() => handleToggleActive(product)}
		                            disabled={saving}
		                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 disabled:opacity-60"
		                            aria-label={
		                              product.isActive
		                                ? `Deactivate ${product.title}`
		                                : `Activate ${product.title}`
		                            }
		                          >
		                            {product.isActive ? <FiToggleRight /> : <FiToggleLeft />}
		                          </button>
		                        </div>
		                      )}
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-[0.16em] text-gray-500">
                      <th className="py-3 pr-3 font-semibold">Product</th>
                      <th className="py-3 pr-3 font-semibold">Category</th>
                      <th className="py-3 pr-3 font-semibold">Price</th>
                      <th className="py-3 pr-3 font-semibold">Stock</th>
                      <th className="py-3 pr-3 font-semibold">Orders</th>
                      <th className="py-3 pr-3 font-semibold">Status</th>
                      <th className="py-3 pr-3 font-semibold">Media</th>
                      <th className="py-3 pl-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productOrderStats.map((productStat) => {
	                      const product = productStat.product;
	                      const canManageProduct = Boolean(productStat.existsInCatalog);
	                      const discountPercent = getDiscountPercent(product.oldPrice, product.price);
	                      const hasDiscount = product.oldPrice > product.price && discountPercent > 0;

                      return (
                      <tr key={product.id} className="border-b border-gray-100">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            {product.images?.[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">
                                {product.title}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                #{product.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-gray-600">
                          {product.category}
                        </td>
                        <td className="py-3 pr-3 font-semibold text-gray-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{formatPrice(product.price)}</span>
                            {hasDiscount && (
                              <>
                                <span className="text-xs font-medium text-gray-400 line-through">
                                  {formatPrice(product.oldPrice)}
                                </span>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                  {discountPercent}% OFF
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-gray-600">
                          {product.stock}
                        </td>
                        <td className="py-3 pr-3 text-gray-600">
                          <p className="font-semibold text-gray-900">
                            {productStat.orderCount}
                          </p>
                          <p className="text-xs text-gray-500">
                            {productStat.quantity} pcs sold
                          </p>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              product.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {product.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            <FiImage />
                            {product.images?.length ?? 0} image
                            {(product.images?.length ?? 0) === 1 ? "" : "s"}
                            {product.hasVideo && (
                              <>
                                <FiVideo className="ml-2" />
                                video
                              </>
                            )}
                          </span>
                        </td>
	                        <td className="py-3 pl-3 text-right">
	                          {canManageProduct && (
	                            <div className="flex justify-end gap-2">
	                              <button
	                                type="button"
	                                onClick={() => handleEditProduct(product)}
	                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 font-semibold text-gray-700 hover:border-gray-400"
	                                aria-label={`Edit ${product.title}`}
	                              >
	                                <FiEdit3 />
	                                Edit
	                              </button>
	                              <button
	                                type="button"
	                                onClick={() => handleDeleteProduct(product)}
	                                disabled={saving}
	                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 font-semibold text-red-600 hover:border-gray-400 disabled:opacity-60"
	                                aria-label={`Delete ${product.title}`}
	                              >
	                                <FiTrash2 />
	                                Delete
	                              </button>
	                              <button
	                                type="button"
	                                onClick={() => handleToggleActive(product)}
	                                disabled={saving}
	                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-60"
	                                aria-label={
	                                  product.isActive
	                                    ? `Deactivate ${product.title}`
	                                    : `Activate ${product.title}`
	                                }
	                              >
	                                {product.isActive ? <FiToggleRight /> : <FiToggleLeft />}
	                                {product.isActive ? "Disable" : "Enable"}
	                              </button>
	                            </div>
	                          )}
	                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Product orders
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                See who placed each order from your posted products.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 sm:flex">
              <FiUsers />
              {recentOrderLines.length} items ordered
            </div>
          </div>

          {ownerLoading ? (
            <p className="mt-5 text-sm text-gray-500">Loading orders...</p>
          ) : recentOrderLines.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No product orders found yet.
            </p>
          ) : (
            <>
            <p className="mt-4 text-xs font-medium text-gray-500">
              Orders are grouped by date. Tap a date to expand/collapse.
            </p>

            <div className="mt-3 space-y-3">
              {groupedRecentOrderLines.map((group, index) => (
                <details
                  key={group.key}
                  open={index === 0}
                  className="rounded-lg border border-gray-200 bg-white"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-900">
                    <span>{group.label}</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {group.lines.length} item{group.lines.length === 1 ? "" : "s"}
                    </span>
                  </summary>

                  <div className="border-t border-gray-100 px-4 py-4">
                    <div className="space-y-3 md:hidden">
                      {group.lines.map(({ id, item, order }) => (
                        <article key={`mobile-order-${id}`} className="rounded-lg border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{order.code}</p>
                              <p className="mt-1 font-semibold text-gray-900">{item.title}</p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                order.status === "Confirmed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-gray-900">{order.customerName}</p>
                          {order.customerEmail && <p className="text-xs text-gray-500">{order.customerEmail}</p>}
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-md bg-gray-50 px-2 py-1.5">
                              <p className="text-gray-500">Qty</p>
                              <p className="font-semibold text-gray-900">{item.quantity}</p>
                            </div>
                            <div className="rounded-md bg-gray-50 px-2 py-1.5">
                              <p className="text-gray-500">Amount</p>
                              <p className="font-semibold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                            <div className="rounded-md bg-gray-50 px-2 py-1.5">
                              <p className="text-gray-500">Mobile</p>
                              <p className="font-semibold text-gray-900">{order.customerMobile || "Not provided"}</p>
                            </div>
                          </div>
                          {order.status !== "Confirmed" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmOrder(order)}
                              className="mt-3 w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Confirm
                            </button>
                          )}
                        </article>
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs uppercase tracking-[0.16em] text-gray-500">
                            <th className="py-3 pr-3 font-semibold">Order</th>
                            <th className="py-3 pr-3 font-semibold">Product</th>
                            <th className="py-3 pr-3 font-semibold">Customer</th>
                            <th className="py-3 pr-3 font-semibold">Mobile</th>
                            <th className="py-3 pr-3 font-semibold">Qty</th>
                            <th className="py-3 pr-3 font-semibold">Amount</th>
                            <th className="py-3 pr-3 font-semibold">Status</th>
                            <th className="py-3 text-right font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.lines.map(({ id, item, order }) => (
                            <tr key={id} className="border-b border-gray-100">
                              <td className="py-3 pr-3 font-semibold text-gray-900">
                                {order.code}
                              </td>
                              <td className="py-3 pr-3 text-gray-700">{item.title}</td>
                              <td className="py-3 pr-3">
                                <p className="font-semibold text-gray-900">
                                  {order.customerName}
                                </p>
                                {order.customerEmail && (
                                  <p className="text-xs text-gray-500">
                                    {order.customerEmail}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 pr-3 text-gray-700">
                                {order.customerMobile || "Not provided"}
                              </td>
                              <td className="py-3 pr-3 text-gray-700">
                                {item.quantity}
                              </td>
                              <td className="py-3 pr-3 font-semibold text-gray-900">
                                {formatPrice(item.price * item.quantity)}
                              </td>
                              <td className="py-3 pr-3">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    order.status === "Confirmed"
                                      ? "bg-green-50 text-green-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {order.status}
                                </span>
                                {order.status === "Confirmed" && order.confirmedByAdminName && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    Confirmed by {order.confirmedByAdminName}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 text-right">
                                {order.status === "Confirmed" ? (
                                  <div className="text-right">
                                    <span className="text-xs font-semibold text-gray-400">
                                      Done
                                    </span>
                                    {order.confirmedByAdminEmail && (
                                      <div className="mt-1 text-[11px] text-gray-400">
                                        {order.confirmedByAdminEmail}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmOrder(order)}
                                    className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    Confirm
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              ))}
            </div>
            </>
          )}
        </section>

        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Review moderation
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Approve reviews before they appear on product pages.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              {approvedReviews.length} approved
            </div>
          </div>

          {pendingReviews.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No reviews waiting for approval.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {pendingReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        {review.productTitle}
                      </p>
                      <h3 className="mt-2 font-bold text-gray-900">
                        {review.customerName}
                      </h3>
                      {review.customerEmail && (
                        <p className="mt-1 text-xs text-gray-500">
                          {review.customerEmail}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  </div>

                  <div className="mt-3 flex gap-1 text-yellow-500">
                    {[...Array(review.rating)].map((_, index) => (
                      <FaStar key={index} />
                    ))}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-gray-700">
                    {review.text}
                  </p>

                  <p className="mt-3 text-xs text-gray-400">
                    Submitted {formatDate(review.createdAt)}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveReview(review.id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      <FiCheckCircle />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"
                    >
                      <FiTrash2 />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
