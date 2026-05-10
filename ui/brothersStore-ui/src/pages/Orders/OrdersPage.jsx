import { useLocation, useNavigate } from "react-router-dom";

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

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { error, loading, orders } = useOrders();
  const { productLookup } = useProducts();

  const placedOrderId = location.state?.orderId;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />

        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] p-6 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <p className="genz-kicker">Order History</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950 md:text-3xl">
              My Orders
            </h1>
            <p className="mt-3 font-semibold text-slate-700">
              Sign in to track current orders and view your order history.
            </p>
            <button
              type="button"
              onClick={openAuthModal}
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
            >
              Sign In to Continue
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

      <main className="mx-auto max-w-5xl px-4 py-5">
        <header className="mb-5">
          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] px-5 py-5 md:px-6">
              <p className="genz-kicker">Order History</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950 md:text-3xl">
                My Orders
              </h1>

              <p className="mt-2 text-sm font-semibold text-slate-700">
                Track all your previous COD purchases in one place.
              </p>
            </div>
          </div>
        </header>

        {placedOrderId && (
          <div className="mb-4 rounded-2xl bg-green-50/90 px-4 py-3 text-sm font-bold text-green-800 shadow-sm">
            Order {placedOrderId} placed successfully.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50/90 px-4 py-3 text-sm font-bold text-red-800 shadow-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] p-6 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <p className="font-semibold text-slate-700">Loading your orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] p-6 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <h2 className="text-lg font-black text-slate-950">No orders yet</h2>

            <p className="mt-2 text-sm font-semibold text-slate-700">
              Once you place a COD order, it will appear here.
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
            >
              Continue Shopping
            </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="genz-paper paper-panel rounded-[2rem] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-3 border-b border-slate-900/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="genz-kicker text-slate-700">
                      Order ID
                    </p>

                    <h2 className="mt-1 text-lg font-black text-slate-950">
                      {order.code}
                    </h2>

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      Placed on {formatDate(order.createdAt)}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      Estimated delivery by {formatDate(order.estimatedDelivery)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        order.status === "Confirmed"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-800 shadow-sm">
                      {order.paymentMethod}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/track-order/${order.id}`, { state: { order } })
                      }
                      className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white shadow-sm"
                    >
                      Track
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.2rem] bg-white/70 px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                  {order.shippingAddress}
                </div>

                <div className="space-y-3 py-4">
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
                          <h3 className="font-black text-slate-950">{item.title}</h3>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatPrice(item.price)} x {item.quantity}
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-950">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-3 border-t border-slate-900/10 pt-4 text-sm sm:grid-cols-2">
                  <div className="rounded-[1.2rem] bg-white/70 px-3 py-3 shadow-sm">
                    <p className="text-slate-700">Total items</p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {order.totalQuantity}
                    </p>
                  </div>

                  <div className="rounded-[1.2rem] bg-white/70 px-3 py-3 shadow-sm">
                    <p className="text-slate-700">Total bill amount</p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                </div>

                {order.firstOrderDiscountApplied && (
                  <div className="mt-3 rounded-lg bg-green-50 px-3 py-3 text-sm font-semibold text-green-700">
                    Congrats! First order discount: {formatPrice(order.discountAmount)} off.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
