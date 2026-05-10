import { apiClient, createAuthHeaders } from "./api";

export const loadRazorpayCheckout = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(Boolean(window.Razorpay)), {
        once: true,
      });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const createRazorpayOrder = async ({ token, customer }) => {
  const { data } = await apiClient.post(
    "/payments/razorpay/order",
    {
      customerName: customer?.name ?? "",
      customerEmail: customer?.email ?? "",
      customerMobile: customer?.mobile ?? "",
    },
    {
      headers: createAuthHeaders(token),
    }
  );

  return data;
};

export const verifyRazorpayPayment = async ({
  token,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const { data } = await apiClient.post(
    "/payments/razorpay/verify",
    {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    },
    {
      headers: createAuthHeaders(token),
    }
  );

  return data;
};

export const openRazorpayCheckout = ({
  key,
  amount,
  currency,
  orderId,
  merchantName,
  description,
  customer,
  onSuccess,
  onDismiss,
}) => {
  if (typeof window === "undefined" || !window.Razorpay) {
    throw new Error("Payment SDK is not available.");
  }

  const options = {
    key,
    amount,
    currency,
    name: merchantName,
    description,
    order_id: orderId,
    prefill: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      contact: customer?.contact ?? customer?.mobile ?? "",
    },
    method: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true,
    },
    theme: {
      color: "#0f172a",
    },
    handler: onSuccess,
    modal: {
      ondismiss: onDismiss,
      escape: true,
    },
  };

  const instance = new window.Razorpay(options);
  instance.on("payment.failed", (event) => {
    const error = event?.error ?? {};
    const details = [
      error.code && `code: ${error.code}`,
      error.source && `source: ${error.source}`,
      error.step && `step: ${error.step}`,
      error.reason && `reason: ${error.reason}`,
      error.description && `description: ${error.description}`,
    ]
      .filter(Boolean)
      .join(" | ");

    onDismiss?.(new Error(details || "Payment failed."));
  });
  instance.open();
  return instance;
};
