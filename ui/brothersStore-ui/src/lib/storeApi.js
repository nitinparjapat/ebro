import axios from "axios";

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1200&q=80";

const toNumber = (value) => Number(value ?? 0);

const sanitizeImages = (images) => {
  const list = Array.isArray(images) ? images : [];
  const filtered = list.filter(Boolean);

  return filtered.length > 0 ? filtered : [DEFAULT_PRODUCT_IMAGE];
};

const sanitizeMedia = (media) => (Array.isArray(media) ? media.filter(Boolean) : []);

export const normalizeProduct = (product) => {
  const price = toNumber(product?.price);
  const images = product?.images?.length
    ? sanitizeImages(product.images)
    : sanitizeImages([product?.primaryImageUrl]);
  const videos = sanitizeMedia(product?.videos);

  return {
    id: product?.id ?? 0,
    title: product?.name ?? "Untitled Product",
    description: product?.description ?? "",
    price,
    oldPrice: Math.round(price * 1.18),
    rating: Number((4 + ((product?.id ?? 1) % 5) * 0.14).toFixed(1)),
    reviews: 45 + (product?.id ?? 1) * 13,
    category: product?.categoryName ?? "Uncategorized",
    categoryId: product?.categoryId ?? 0,
    stock: product?.stock ?? 0,
    isActive: product?.isActive ?? product?.active ?? true,
    images,
    videos,
    hasVideo: Boolean(product?.hasVideo || videos.length > 0),
  };
};

export const buildProductPayload = (product) => {
  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : String(product.images ?? "")
        .split("\n")
        .map((image) => image.trim())
        .filter(Boolean);
  const videos = Array.isArray(product.videos)
    ? product.videos.filter(Boolean)
    : String(product.videos ?? "")
        .split("\n")
        .map((video) => video.trim())
        .filter(Boolean);

  return {
    name: product.title?.trim() ?? product.name?.trim() ?? "",
    description: product.description?.trim() ?? "",
    price: toNumber(product.price),
    categoryName: product.category?.trim() ?? product.categoryName?.trim() ?? "",
    categoryId: toNumber(product.categoryId),
    stock: toNumber(product.stock),
    primaryImageUrl: images[0] ?? "",
    images,
    videos,
    isActive: product.isActive ?? true,
  };
};

export const normalizeCartResponse = (response) => ({
  userId: response?.userId ?? "",
  totalAmount: toNumber(response?.totalAmount),
  items: Array.isArray(response?.items)
    ? response.items.map((item) => ({
        id: item.productId,
        title: item.productName,
        price: toNumber(item.price),
        quantity: item.quantity ?? 0,
      }))
    : [],
});

export const formatOrderCode = (orderId) =>
  `BS-${String(orderId ?? "").padStart(6, "0")}`;

export const normalizeOrder = (order) => {
  const items = Array.isArray(order?.items)
    ? order.items.map((item) => ({
        id: item.productId,
        title: item.productName,
        price: toNumber(item.price),
        quantity: item.quantity ?? 0,
      }))
    : [];
  const createdAt = order?.createdAt ?? new Date().toISOString();
  const estimatedDelivery = new Date(createdAt);

  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
  const rawStatus = order?.status ?? "Order Initialized";
  const status = rawStatus === "Pending" ? "Order Initialized" : rawStatus;
  const discountAmount = toNumber(order?.discountAmount);
  const originalTotalAmount = toNumber(order?.originalTotalAmount);

  return {
    id: order?.id ?? 0,
    code: formatOrderCode(order?.id),
    createdAt,
    estimatedDelivery: estimatedDelivery.toISOString(),
    status,
    paymentMethod:
      order?.paymentMethod === "CashOnDelivery"
        ? "Cash on Delivery"
        : order?.paymentMethod ?? "Cash on Delivery",
    shippingAddress: order?.shippingAddress ?? "",
    customerName:
      order?.customerName ??
      order?.userName ??
      order?.customer?.fullName ??
      order?.customer?.name ??
      "Customer",
    customerMobile:
      order?.customerMobile ??
      order?.phoneNumber ??
      order?.customer?.mobile ??
      order?.customer?.phoneNumber ??
      "",
    customerEmail:
      order?.customerEmail ?? order?.email ?? order?.customer?.email ?? "",
    confirmedByAdminName:
      order?.confirmedByAdminName ?? order?.confirmedBy?.name ?? "",
    confirmedByAdminEmail:
      order?.confirmedByAdminEmail ?? order?.confirmedBy?.email ?? "",
    confirmedAt: order?.confirmedAt ?? null,
    userId: order?.userId ?? order?.customer?.id ?? "",
    totalAmount: toNumber(order?.totalAmount),
    discountAmount,
    originalTotalAmount,
    firstOrderDiscountApplied: Boolean(order?.firstOrderDiscountApplied || discountAmount > 0),
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    items,
    statusHistory: Array.isArray(order?.statusHistory) ? order.statusHistory : [],
  };
};

export const buildCategories = (products) => {
  const items = Array.isArray(products) ? products : [];
  const seen = new Set();

  return [
    {
      id: "all",
      name: "All",
      image: items[0]?.images?.[0] ?? DEFAULT_PRODUCT_IMAGE,
    },
    ...items.reduce((categories, product) => {
      const categoryName = product.category?.trim();
      const slug = categoryName?.toLowerCase().replace(/\s+/g, "-");

      if (!categoryName || !slug || seen.has(slug)) {
        return categories;
      }

      seen.add(slug);

      return [
        ...categories,
        {
          id: slug,
          name: categoryName,
          image: product.images?.[0] ?? DEFAULT_PRODUCT_IMAGE,
        },
      ];
    }, []),
  ];
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "The server is taking longer than expected. Please try again in a moment.";
    }

    if (error.code === "ERR_NETWORK") {
      return "Unable to reach the server. Please check that the backend is running.";
    }

    if (typeof error.response?.data === "string" && error.response.data.trim()) {
      return error.response.data;
    }

    if (typeof error.response?.data?.message === "string") {
      return error.response.data.message;
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};
