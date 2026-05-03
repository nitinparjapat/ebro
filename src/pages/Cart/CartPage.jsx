import { useEffect, useState } from "react";
import { FiEdit3, FiMapPin, FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import AddressForm from "../../components/common/AddressForm";
import Navbar from "../../components/layout/Navbar";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrdersContext";
import { useProducts } from "../../context/ProductsContext";
import {
  formatAddressForOrder,
  normalizeAddressBook,
  normalizeAddress,
  validateAddress,
} from "../../lib/address";

const formatPrice = (amount) => `Rs. ${amount.toLocaleString("en-IN")}`;

export default function CartPage() {
  const navigate = useNavigate();
  const {
    profile,
    isAuthenticated,
    openAuthModal,
    saveAddress,
  } = useAuth();
  const {
    cart,
    cartQuantity,
    cartTotal,
    clearCart,
    decreaseQuantity,
    error,
    loading,
    addToCart,
    removeFromCart,
    refreshCart,
  } = useCart();
  const { placeOrder } = useOrders();
  const { productLookup } = useProducts();
  const savedAddresses = normalizeAddressBook(profile.savedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(
    savedAddresses[0]?.id ?? ""
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    savedAddresses[0] ?? normalizeAddress(profile)
  );
  const [checkoutError, setCheckoutError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const addresses = normalizeAddressBook(profile.savedAddresses);
      const selectedAddress =
        addresses.find((address) => address.id === selectedAddressId) ??
        addresses[0];

      if (selectedAddress) {
        setSelectedAddressId(selectedAddress.id);
        setDeliveryAddress(selectedAddress);
        return;
      }

      setDeliveryAddress((currentAddress) =>
        normalizeAddress({
          ...profile,
          ...currentAddress,
          fullName: currentAddress.fullName || profile.fullName || "",
          mobile: currentAddress.mobile || profile.mobile || "",
        })
      );
    });
  }, [profile, selectedAddressId]);

  const handleSelectAddress = (address) => {
    setSelectedAddressId(address.id);
    setDeliveryAddress(address);
    setCheckoutError("");
  };

  const handleNewAddress = () => {
    setSelectedAddressId("");
    setDeliveryAddress(
      normalizeAddress({
        label: "Home",
        fullName: profile.fullName,
        mobile: profile.mobile,
      })
    );
    setCheckoutError("");
  };

  const handleSaveAddress = () => {
    const addressError = validateAddress(deliveryAddress);

    if (addressError) {
      setCheckoutError(addressError);
      return null;
    }

    const savedAddress = saveAddress(deliveryAddress);
    setSelectedAddressId(savedAddress.id);
    setDeliveryAddress(savedAddress);
    setCheckoutError("");
    return savedAddress;
  };

  const handlePlaceCodOrder = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const addressError = validateAddress(deliveryAddress);

    if (addressError) {
      setCheckoutError(addressError);
      return;
    }

    const savedAddress = handleSaveAddress();

    if (!savedAddress) {
      return;
    }

    const shippingAddress = formatAddressForOrder(savedAddress);

    setPlacingOrder(true);

    try {
      const order = await placeOrder({
        shippingAddress,
        paymentMethod: "Cash on Delivery",
        items: cart.map((item) => ({
          productId: item.id,
          productName: item.title,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      await refreshCart();
      setCheckoutError("");

      const orderRouteId = order.id ?? order.orderId ?? order.code;
      navigate(`/track-order/${orderRouteId}`, { state: { order } });
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
    } catch (error) {
      setCheckoutError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>

          {cartQuantity > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {cartQuantity} item{cartQuantity > 1 ? "s" : ""} in your cart
            </p>
          )}
        </div>

        {(error || checkoutError) && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {checkoutError || error}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <p className="font-medium text-gray-700">Loading your cart...</p>
          </div>
        ) : cart.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <p className="font-medium text-gray-700">Your cart is empty</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {cart.map((item) => {
                const itemTotal = item.price * item.quantity;
                const image =
                  item.images?.[0] ||
                  productLookup[item.id]?.images?.[0] ||
                  productLookup[item.id]?.videos?.[0];

                return (
                  <article
                    key={item.id}
                    className="rounded-lg bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      {image && (
                        <img
                          src={image}
                          alt={item.title}
                          className="h-24 w-24 shrink-0 rounded-lg object-cover"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-gray-900">{item.title}</h2>

                        <p className="mt-1 text-sm text-gray-500">
                          Single item price: {formatPrice(item.price)}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {formatPrice(item.price)} x {item.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(item.id).catch((apiError) =>
                              setCheckoutError(apiError.message)
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-800"
                          aria-label={`Decrease ${item.title} quantity`}
                        >
                          <FiMinus />
                        </button>

                        <span className="min-w-10 text-center text-lg font-bold">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            addToCart(item.id).catch((apiError) =>
                              setCheckoutError(apiError.message)
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-800"
                          aria-label={`Increase ${item.title} quantity`}
                        >
                          <FiPlus />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(item.id).catch((apiError) =>
                              setCheckoutError(apiError.message)
                            )
                          }
                          className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-red-500 sm:ml-2"
                          aria-label={`Remove ${item.title}`}
                        >
                          <FiTrash2 />
                        </button>
                      </div>

                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm sm:text-right">
                        <p className="text-gray-500">Item total</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatPrice(itemTotal)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="rounded-lg bg-white p-4 shadow-sm lg:sticky lg:top-28 lg:self-start">
              <h2 className="text-lg font-bold text-gray-900">Cart Total</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Total quantity</span>
                  <span>{cartQuantity}</span>
                </div>

                <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900">
                  <span>Total amount</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Delivery address
                  </h3>
                  <button
                    type="button"
                    onClick={handleNewAddress}
                    className="text-xs font-semibold text-green-700"
                  >
                    Add New
                  </button>
                </div>

                {savedAddresses.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {savedAddresses.map((address) => {
                      const isSelected = selectedAddressId === address.id;

                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => handleSelectAddress(address)}
                          className={`rounded-lg border px-3 py-3 text-left ${
                            isSelected
                              ? "border-green-600 bg-green-50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              <FiMapPin className="shrink-0 text-gray-500" />
                              <span className="truncate text-sm font-bold text-gray-900">
                                {address.label || "Delivery"}
                              </span>
                            </span>
                            <FiEdit3 className="shrink-0 text-gray-400" />
                          </span>
                          <span className="mt-2 block line-clamp-2 text-xs leading-5 text-gray-600">
                            {address.fullName}, {address.addressLine1},{" "}
                            {address.city} - {address.pincode}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3">
                  <AddressForm
                    value={deliveryAddress}
                    onChange={setDeliveryAddress}
                    disabled={placingOrder}
                    showLabel
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={placingOrder}
                  className="mt-3 w-full rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 disabled:opacity-60"
                >
                  Save Address
                </button>
              </div>

              {!isAuthenticated && (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                  Sign in with Google when you are ready to place the order.
                </p>
              )}

              <button
                type="button"
                onClick={handlePlaceCodOrder}
                disabled={placingOrder}
                className="cod-button mt-5 w-full rounded-lg bg-green-600 py-3 font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  aria-hidden="true"
                  className="cod-button__spark cod-button__spark--left"
                />
                <span
                  aria-hidden="true"
                  className="cod-button__spark cod-button__spark--center"
                />
                <span
                  aria-hidden="true"
                  className="cod-button__spark cod-button__spark--right"
                />
                <span className="cod-button__label">
                  {placingOrder ? "Placing order..." : "Proceed with COD"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleClearCart}
                className="mt-3 w-full rounded-lg border border-gray-300 py-3 font-semibold text-gray-700"
              >
                Clear Cart
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
