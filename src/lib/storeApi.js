import axios from "axios";

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1200&q=80";

const MEDIA_BASE_URL =
  import.meta.env.VITE_ASSET_BASE_URL?.trim() || "http://localhost:5000";

const toNumber = (value) => Number(value ?? 0);
const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const extractMediaValue = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value === "object") {
    return String(
      value.src ??
        value.url ??
        value.path ??
        value.fileUrl ??
        value.imageUrl ??
        value.videoUrl ??
        value.thumbnailUrl ??
        value.name ??
        ""
    ).trim();
  }

  return String(value ?? "").trim();
};

const normalizeMediaKind = (value) =>
  String(
    value?.type ??
      value?.mediaType ??
      value?.kind ??
      value?.fileType ??
      ""
  )
    .trim()
    .toLowerCase();

const normalizeMediaSource = (value, { preferAbsolute = true } = {}) => {
  const rawValue = extractMediaValue(value);

  if (!rawValue) {
    return "";
  }

  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(rawValue)) {
    return rawValue;
  }

  const relativePath = rawValue.startsWith("/")
    ? rawValue
    : `/${rawValue.replace(/^\/+/, "")}`;

  if (!preferAbsolute || !MEDIA_BASE_URL) {
    return relativePath;
  }

  return `${MEDIA_BASE_URL.replace(/\/$/, "")}${relativePath}`;
};

export const normalizeMediaList = (media, options = {}) => {
  const sourceItems = Array.isArray(media)
    ? media
    : typeof media === "string"
      ? media
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : media
        ? [media]
        : [];

  return sourceItems
    .map((item) => normalizeMediaSource(item, options))
    .filter(Boolean);
};

const collectProductMedia = (product) => {
  const explicitImages = [
    ...toArray(product?.images),
    ...toArray(product?.imageUrls),
    ...toArray(product?.productImages),
    ...toArray(product?.gallery),
    ...toArray(product?.galleryImages),
    ...toArray(product?.photos),
  ];
  const explicitVideos = [
    ...toArray(product?.videos),
    ...toArray(product?.videoUrls),
    ...toArray(product?.productVideos),
  ];
  const mixedMedia = [
    ...toArray(product?.media),
    ...toArray(product?.mediaFiles),
    ...toArray(product?.productMedia),
    ...toArray(product?.assets),
  ];

  for (const item of mixedMedia) {
    const kind = normalizeMediaKind(item);

    if (kind.includes("video")) {
      explicitVideos.push(item);
      continue;
    }

    explicitImages.push(item);
  }

  return {
    images: normalizeMediaList(explicitImages, { preferAbsolute: true }),
    videos: normalizeMediaList(explicitVideos, { preferAbsolute: true }),
  };
};

const getProductId = (product) =>
  product?.id ?? product?.productId ?? product?.productID ?? 0;

const normalizeCartItem = (item) => {
  const product = item?.product ?? item;
  const productMedia = collectProductMedia(product);
  const fallbackImages = normalizeMediaList(
    [
      item?.imageUrl,
      item?.primaryImageUrl,
      item?.thumbnailUrl,
      product?.primaryImageUrl,
      product?.imageUrl,
      product?.thumbnailUrl,
    ],
    { preferAbsolute: true }
  );
  const images =
    productMedia.images.length > 0
      ? productMedia.images
      : fallbackImages.length > 0
        ? fallbackImages
        : [DEFAULT_PRODUCT_IMAGE];

  return {
    id: item?.productId ?? item?.productID ?? item?.id ?? item?.product?.id ?? 0,
    title:
      item?.productName ??
      item?.name ??
      item?.title ??
      item?.product?.name ??
      item?.product?.title ??
      "Item",
    price: toNumber(item?.price ?? item?.unitPrice ?? item?.productPrice),
    quantity: toNumber(item?.quantity ?? item?.qty ?? 1),
    stock: toNumber(item?.stock ?? item?.availableStock ?? item?.product?.stock),
    images,
    videos: productMedia.videos,
  };
};

const normalizeOrderItem = (item) => ({
  id: item?.productId ?? item?.productID ?? item?.id ?? item?.product?.id ?? 0,
  title:
    item?.productName ??
    item?.name ??
    item?.title ??
    item?.product?.name ??
    item?.product?.title ??
    "Item",
  price: toNumber(item?.price ?? item?.unitPrice ?? item?.productPrice),
  quantity: toNumber(item?.quantity ?? item?.qty ?? 1),
});

export const normalizeProduct = (product) => {
  const price = toNumber(product?.price);
  const { images, videos } = collectProductMedia(product);
  const fallbackImage = normalizeMediaList(
    [
      product?.primaryImageUrl,
      product?.imageUrl,
      product?.thumbnailUrl,
      product?.primaryImage,
    ],
    {
      preferAbsolute: true,
    }
  );

  return {
    id: getProductId(product),
    title: product?.name ?? product?.title ?? "Untitled Product",
    description: product?.description ?? "",
    price,
    oldPrice: Math.round(price * 1.18),
    rating: Number((4 + ((getProductId(product) ?? 1) % 5) * 0.14).toFixed(1)),
    reviews: 45 + (getProductId(product) ?? 1) * 13,
    category: product?.categoryName ?? product?.category ?? "Uncategorized",
    categoryId: product?.categoryId ?? 0,
    stock: product?.stock ?? product?.quantity ?? 0,
    isActive: product?.isActive ?? product?.active ?? true,
    images:
      images.length > 0
        ? images
        : fallbackImage.length > 0
          ? fallbackImage
          : [DEFAULT_PRODUCT_IMAGE],
    videos,
  };
};

export const buildProductPayload = (product) => {
  const images = normalizeMediaList(product.images, { preferAbsolute: false });
  const videos = normalizeMediaList(product.videos, { preferAbsolute: false });

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

export const normalizeCartResponse = (response) => {
  const rawItems = Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.cartItems)
        ? response.cartItems
        : Array.isArray(response?.data?.items)
          ? response.data.items
          : [];

  return {
    userId: response?.userId ?? response?.customerId ?? "",
    totalAmount: toNumber(response?.totalAmount ?? response?.total ?? response?.amount),
    items: rawItems.map(normalizeCartItem),
  };
};

export const formatOrderCode = (orderId) => {
  const safeId = String(orderId ?? "").replace(/\D/g, "");
  return `BS-${(safeId || String(orderId ?? "")).padStart(6, "0")}`;
};

export const normalizeOrder = (order) => {
  const items = Array.isArray(order?.items)
    ? order.items.map(normalizeOrderItem)
    : Array.isArray(order?.orderItems)
      ? order.orderItems.map(normalizeOrderItem)
      : [];
  const orderId =
    order?.id ?? order?.orderId ?? order?.orderID ?? order?.orderNumber ?? 0;
  const createdAt = order?.createdAt ?? order?.orderedAt ?? new Date().toISOString();
  const estimatedDelivery = new Date(createdAt);

  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
  const rawStatus =
    order?.status ?? order?.orderStatus ?? order?.state ?? "Order Initialized";
  const status = rawStatus === "Pending" ? "Order Initialized" : rawStatus;

  return {
    id: orderId,
    code: order?.code ?? order?.orderCode ?? formatOrderCode(orderId),
    createdAt,
    estimatedDelivery: estimatedDelivery.toISOString(),
    status,
    paymentMethod:
      order?.paymentMethod === "CashOnDelivery"
        ? "Cash on Delivery"
        : order?.paymentMethod ?? order?.paymentMode ?? "Cash on Delivery",
    shippingAddress:
      order?.shippingAddress ?? order?.address ?? order?.deliveryAddress ?? "",
    customerName:
      order?.customerName ??
      order?.userName ??
      order?.fullName ??
      order?.customer?.fullName ??
      order?.customer?.name ??
      "Customer",
    customerMobile:
      order?.customerMobile ??
      order?.phoneNumber ??
      order?.mobile ??
      order?.customer?.mobile ??
      order?.customer?.phoneNumber ??
      "",
    customerEmail:
      order?.customerEmail ??
      order?.email ??
      order?.customer?.email ??
      "",
    userId: order?.userId ?? order?.customer?.id ?? "",
    totalAmount: toNumber(order?.totalAmount ?? order?.grandTotal ?? order?.amount),
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    items,
    statusHistory: Array.isArray(order?.statusHistory)
      ? order.statusHistory
      : Array.isArray(order?.history)
        ? order.history
        : [],
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
