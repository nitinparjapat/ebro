import { useMemo } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiPackage,
  FiTruck,
} from "react-icons/fi";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Navbar from "../../components/layout/Navbar";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrdersContext";
import { useProducts } from "../../context/ProductsContext";

const formatPrice = (amount) => `Rs. ${amount.toLocaleString("en-IN")}`;

const formatDate = (dateValue) =>
  new Date(dateValue).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

const statusSteps = [
  {
    key: "Order Initialized",
    title: "Order initialized",
    description: "Your order has been received and is waiting for confirmation.",
    icon: FiClock,
  },
  {
    key: "Confirmed",
    title: "Confirmed",
    description: "Admin has confirmed your order.",
    icon: FiCheckCircle,
  },
  {
    key: "Packed",
    title: "Packed",
    description: "Items are being prepared for dispatch.",
    icon: FiPackage,
  },
  {
    key: "Shipped",
    title: "Shipped",
    description: "Your package is on the way.",
    icon: FiTruck,
  },
  {
    key: "OutForDelivery",
    title: "Out for delivery",
    description: "The delivery partner is heading to you.",
    icon: FiMapPin,
  },
  {
    key: "Delivered",
    title: "Delivered",
    description: "Order delivered successfully.",
    icon: FiCheckCircle,
  },
];

const normalizeStatus = (status) =>
  String(status ?? "Order Initialized")
    .replace(/\s+/g, "")
    .toLowerCase();

const getCurrentStepIndex = (status) => {
  const normalizedStatus = normalizeStatus(status);
  const matchedIndex = statusSteps.findIndex(
    (step) => normalizeStatus(step.key) === normalizedStatus
  );

  return matchedIndex >= 0 ? matchedIndex : 0;
};

export default function TrackOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { loading, orders } = useOrders();
  const { productLookup } = useProducts();

  const orderFromState = location.state?.order;
  const order = useMemo(
    () =>
      orders.find(
        (item) => String(item.id) === String(orderId) || item.code === orderId
      ) ?? orderFromState,
    [orderFromState, orderId, orders]
  );
  const currentStepIndex = getCurrentStepIndex(order?.status);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] p-6 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <p className="genz-kicker">Tracking</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950 md:text-3xl">
              Track Order
            </h1>
            <p className="mt-3 font-semibold text-slate-700">
              Sign in with Google to track your order.
            </p>
            <button
              type="button"
              onClick={openAuthModal}
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
            >
              Sign In
            </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading || !order) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] p-6 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <FiClock className="mx-auto text-3xl text-slate-500" />
            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
              {loading ? "Loading order" : "Order not found"}
            </h1>
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
            >
              View Orders
            </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <header className="paper-stack">
          <div className="genz-paper paper-panel rounded-[2rem] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <p className="genz-kicker">Track Order</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                {order.code}
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-green-50/90 px-4 py-3 text-sm font-bold text-green-800 shadow-sm">
              Estimated delivery {formatDate(order.estimatedDelivery)}
            </div>
          </div>
          </div>
        </header>

        {order.firstOrderDiscountApplied && (
          <div className="mt-4 rounded-[1.4rem] bg-green-50/90 px-4 py-3 text-sm font-bold text-green-800 shadow-sm">
            Congrats! First order discount: {formatPrice(order.discountAmount)} off.
          </div>
        )}

        <section className="mt-5 paper-stack">
          <div className="genz-paper paper-panel rounded-[2rem] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-black text-slate-950">Delivery timeline</h2>

          <div className="mt-5 grid gap-0">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isDone = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.key} className="grid grid-cols-[40px_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isDone
                          ? "bg-green-600 text-white"
                          : "bg-white/80 text-slate-500 shadow-sm"
                      }`}
                    >
                      <Icon />
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`h-12 w-0.5 ${
                          index < currentStepIndex ? "bg-green-600" : "bg-slate-900/15"
                        }`}
                      />
                    )}
                  </div>

                  <div className="pb-6">
                    <p
                      className={`font-bold ${
                        isDone ? "text-slate-950" : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {isCurrent ? order.status : step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Items</h2>
            <div className="mt-4 space-y-4">
              {order.items.map((item) => {
                const image = productLookup[item.id]?.images?.[0];

                return (
                  <div key={`${order.id}-${item.id}`} className="flex gap-3">
                    {image && (
                      <img
                        src={image}
                        alt={item.title}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatPrice(item.price)} x {item.quantity}
                      </p>
                      <p className="mt-1 font-bold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Delivery address</h2>
            <p className="mt-3 whitespace-pre-line rounded-lg bg-gray-50 px-3 py-3 text-sm leading-6 text-gray-700">
              {order.shippingAddress}
            </p>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">Total bill amount</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatPrice(order.totalAmount)}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
