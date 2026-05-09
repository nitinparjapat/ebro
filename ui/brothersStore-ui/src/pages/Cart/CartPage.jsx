import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp, FiEdit3, FiMapPin, FiMinus, FiPlus, FiTrash2, FiX } from "react-icons/fi";
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
  validateAddressFields,
} from "../../lib/address";

const formatPrice = (amount) => `Rs. ${amount.toLocaleString("en-IN")}`;

export default function CartPage() {
  const navigate = useNavigate();
  const {
    profile,
    isAuthenticated,
    openAuthModal,
    saveAddress,
    setDefaultAddress,
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
  const defaultAddress = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState(
    defaultAddress?.id ?? ""
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    defaultAddress ?? normalizeAddress(profile)
  );
  const [addressFormExpanded, setAddressFormExpanded] = useState(savedAddresses.length === 0);
  const [checkoutError, setCheckoutError] = useState("");
  const [addressErrors, setAddressErrors] = useState({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmOrderOpen, setConfirmOrderOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const autoSaveTimeoutRef = useRef(null);
  const keepAddressFormOpenRef = useRef(savedAddresses.length === 0);

  useEffect(() => {
    queueMicrotask(() => {
      const addresses = normalizeAddressBook(profile.savedAddresses);
      const selectedAddress =
        addresses.find((address) => address.id === selectedAddressId) ??
        addresses.find((address) => address.isDefault) ??
        addresses[0];

      if (selectedAddress) {
        setSelectedAddressId(selectedAddress.id);
        setDeliveryAddress(selectedAddress);
        setAddressFormExpanded(keepAddressFormOpenRef.current);
        return;
      }

      keepAddressFormOpenRef.current = true;
      setAddressFormExpanded(true);
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
    keepAddressFormOpenRef.current = false;
    setSelectedAddressId(address.id);
    setDeliveryAddress(address);
    setAddressFormExpanded(false);
    setCheckoutError("");
    setAddressErrors({});
  };

  const handleNewAddress = () => {
    keepAddressFormOpenRef.current = true;
    setSelectedAddressId("");
    setDeliveryAddress(
      normalizeAddress({
        label: "Home",
        fullName: profile.fullName,
        mobile: profile.mobile,
        isDefault: savedAddresses.length === 0,
      })
    );
    setAddressFormExpanded(true);
    setCheckoutError("");
    setAddressErrors({});
  };

  const handleEditAddress = (address) => {
    keepAddressFormOpenRef.current = true;
    setSelectedAddressId(address.id);
    setDeliveryAddress(address);
    setAddressFormExpanded(true);
    setCheckoutError("");
    setAddressErrors({});
  };

  const handleSaveAddress = () => {
    const fieldErrors = validateAddressFields(deliveryAddress);
    const addressError = Object.values(fieldErrors).find(Boolean) ?? "";

    if (addressError) {
      setAddressErrors(fieldErrors);
      setCheckoutError("");
      return null;
    }

    const savedAddress = saveAddress(deliveryAddress);
    setSelectedAddressId(savedAddress.id);
    setDeliveryAddress({
      ...savedAddress,
      isDefault:
        deliveryAddress.isDefault || savedAddresses.length === 0 || savedAddress.isDefault,
    });
    if (deliveryAddress.isDefault || savedAddresses.length === 0) {
      setDefaultAddress(savedAddress.id);
    }
    keepAddressFormOpenRef.current = false;
    setAddressFormExpanded(false);
    setCheckoutError("");
    setAddressErrors({});
    return savedAddress;
  };

  useEffect(() => {
    if (!addressFormExpanded || placingOrder) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      const addressError = validateAddress(deliveryAddress);

      if (addressError) {
        return;
      }

      const savedAddress = saveAddress(deliveryAddress);
      setSelectedAddressId(savedAddress.id);
      setDeliveryAddress(savedAddress);
      if (savedAddress.isDefault || savedAddresses.length === 0) {
        setDefaultAddress(savedAddress.id);
      }
      setCheckoutError("");
    }, 600);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    addressFormExpanded,
    deliveryAddress,
    placingOrder,
    saveAddress,
    savedAddresses.length,
    setDefaultAddress,
  ]);

  const handlePlaceCodOrder = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    const fieldErrors = validateAddressFields(deliveryAddress);
    const addressError = Object.values(fieldErrors).find(Boolean) ?? "";

    if (addressError) {
      setAddressErrors(fieldErrors);
      setCheckoutError("");
      return;
    }

    setAddressErrors({});
    setConfirmOrderOpen(true);
  };

  const handleConfirmPlaceOrder = async () => {
    setConfirmOrderOpen(false);

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
        customerName: savedAddress.fullName,
        customerMobile: savedAddress.mobile,
        customerEmail: profile.email,
      });

      setCheckoutError("");
      setSuccessOrder(order);
      refreshCart().catch(() => {
      });
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
                const image = productLookup[item.id]?.images?.[0];

                return (
                  <article
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/product/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/product/${item.id}`);
                      }
                    }}
                    className="cursor-pointer rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900/20"
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
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/product/${item.id}`);
                          }}
                          className="text-left font-semibold text-gray-900 hover:underline"
                        >
                          {item.title}
                        </button>

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
                          onClick={(event) => {
                            event.stopPropagation();
                            decreaseQuantity(item.id).catch((apiError) => {
                              setCheckoutError(apiError.message);
                              refreshCart().catch(() => {
                              });
                            });
                          }}
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
                          onClick={(event) => {
                            event.stopPropagation();
                            if (item.quantity >= 10) {
                              setCheckoutError("You can only add up to 10 quantity for a product.");
                              return;
                            }

                            addToCart(item.id).catch((apiError) => {
                              setCheckoutError(apiError.message);
                              refreshCart().catch(() => {
                              });
                            });
                          }}
                          disabled={item.quantity >= 10}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-800"
                          aria-label={`Increase ${item.title} quantity`}
                        >
                          <FiPlus />
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeFromCart(item.id).catch((apiError) => setCheckoutError(apiError.message));
                          }}
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
                  <div className="flex items-center gap-3">
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          keepAddressFormOpenRef.current = !addressFormExpanded;
                          setAddressFormExpanded((currentValue) => !currentValue);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500"
                      >
                        {addressFormExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        {addressFormExpanded ? "Hide form" : "Show form"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleNewAddress}
                      className="text-xs font-semibold text-green-700"
                    >
                      Add New
                    </button>
                  </div>
                </div>

                {savedAddresses.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {savedAddresses.map((address) => {
                      const isSelected = selectedAddressId === address.id;

                      return (
                        <div
                          key={address.id}
                          className={`rounded-lg border px-3 py-3 ${
                            isSelected
                              ? "border-green-600 bg-green-50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => handleSelectAddress(address)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <FiMapPin className="shrink-0 text-gray-500" />
                                <span className="truncate text-sm font-bold text-gray-900">
                                  {address.label || "Delivery"}
                                </span>
                                {address.isDefault && (
                                  <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                    Default
                                  </span>
                                )}
                              </span>
                              <span className="mt-2 block line-clamp-2 text-xs leading-5 text-gray-600">
                                {address.fullName}, {address.addressLine1},{" "}
                                {address.city} - {address.pincode}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditAddress(address);
                              }}
                              className="shrink-0 text-gray-400"
                              aria-label={`Edit ${address.label || "address"}`}
                            >
                              <FiEdit3 />
                            </button>
                          </div>

                          {!address.isDefault && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setDefaultAddress(address.id);
                                  handleSelectAddress({ ...address, isDefault: true });
                                }}
                                className="text-xs font-semibold text-gray-700 underline underline-offset-2"
                              >
                                Make default
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {addressFormExpanded && (
                  <>
                    <div className="mt-3">
                      <AddressForm
                        value={deliveryAddress}
                        onChange={setDeliveryAddress}
                        disabled={placingOrder}
                        showLabel
                        showDefaultToggle={savedAddresses.length > 0}
                        errors={addressErrors}
                      />
                    </div>

                    <p className="mt-3 text-xs font-medium text-gray-500">
                      Address is saved automatically once details are valid.
                    </p>
                  </>
                )}
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
                  {placingOrder ? "Placing order..." : "Proceed with Cash on Delivery"}
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

      {confirmOrderOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm Order</h3>
            <p className="mt-2 text-sm text-slate-600">
              Place this cash-on-delivery order now?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmOrderOpen(false)}
                className="rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPlaceOrder}
                className="rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white"
              >
                Yes, Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {successOrder && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 px-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setSuccessOrder(null)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
              aria-label="Close success message"
            >
              <FiX />
            </button>

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className="absolute -top-6 left-8 h-24 w-24 rounded-full bg-amber-100/80 blur-2xl" />
              <span className="absolute -right-8 top-8 h-24 w-24 rounded-full bg-pink-100/80 blur-2xl" />
              <span className="absolute left-4 top-12 h-3 w-3 rounded-full bg-amber-300 animate-bounce" />
              <span className="absolute left-12 top-20 h-2 w-6 -rotate-12 rounded-full bg-rose-300 animate-pulse" />
              <span className="absolute left-20 top-10 h-3 w-3 rounded-full bg-sky-300 animate-ping" />
              <span className="absolute right-20 top-12 h-3 w-3 rounded-full bg-emerald-300 animate-bounce" />
              <span className="absolute right-10 top-24 h-2 w-6 rotate-12 rounded-full bg-violet-300 animate-pulse" />
              <span className="absolute right-14 top-36 h-3 w-3 rounded-full bg-orange-300 animate-ping" />
              <span className="absolute bottom-24 left-10 h-2 w-7 rotate-45 rounded-full bg-cyan-300 animate-bounce" />
              <span className="absolute bottom-20 right-12 h-2 w-7 -rotate-45 rounded-full bg-lime-300 animate-pulse" />
            </div>

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl shadow-inner shadow-emerald-200">
                <span aria-hidden="true" className="text-emerald-600">✓</span>
              </div>
              <h3 className="mt-5 text-2xl font-bold text-slate-900">
                Thank you for placing your order
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Your order {successOrder.code} has been placed successfully.
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-600">
                Celebration unlocked
              </p>
              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const order = successOrder;
                    setSuccessOrder(null);
                    navigate(`/track-order/${order.id}`, { state: { order } });
                  }}
                  className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white"
                >
                  Track Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessOrder(null);
                    navigate("/orders");
                  }}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
                >
                  View My Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
