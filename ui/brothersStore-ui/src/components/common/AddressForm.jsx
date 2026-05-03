import { useEffect, useRef, useState } from "react";

import { apiClient } from "../../lib/api";
import { cleanMobile, cleanPincode } from "../../lib/address";

const inputClass =
  "mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black";

export default function AddressForm({
  value,
  onChange,
  disabled = false,
  showLabel = false,
  showDefaultToggle = false,
}) {
  const [pincodeLookupState, setPincodeLookupState] = useState({
    loading: false,
    error: "",
  });
  const lastResolvedPincodeRef = useRef("");

  const updateField = (field, nextValue) => {
    const cleaners = {
      mobile: cleanMobile,
      alternateMobile: cleanMobile,
      pincode: cleanPincode,
    };

    onChange({
      ...value,
      [field]: cleaners[field] ? cleaners[field](nextValue) : nextValue,
    });
  };

  useEffect(() => {
    const pincode = cleanPincode(value.pincode ?? "");

    if (pincode.length !== 6) {
      if (pincode.length === 0) {
        lastResolvedPincodeRef.current = "";
      }
      const resetStateId = window.setTimeout(() => {
        setPincodeLookupState({ loading: false, error: "" });
      }, 0);

      return () => window.clearTimeout(resetStateId);
    }

    if (lastResolvedPincodeRef.current === pincode) {
      return undefined;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setPincodeLookupState({ loading: true, error: "" });

        const { data } = await apiClient.get(`/locations/pincode/${pincode}`, {
          signal: abortController.signal,
        });

        lastResolvedPincodeRef.current = pincode;
        onChange({
          ...value,
          pincode,
          city: data?.city?.trim() || value.city,
          state: data?.state?.trim() || value.state,
        });
        setPincodeLookupState({ loading: false, error: "" });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        lastResolvedPincodeRef.current = "";
        setPincodeLookupState({
          loading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to fetch city and state for this pincode.",
        });
      }
    }, 350);

    return () => {
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [onChange, value]);

  return (
    <div className="grid gap-4">
      {showLabel && (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Address label
            </span>
            <input
              type="text"
              value={value.label}
              onChange={(event) => updateField("label", event.target.value)}
              disabled={disabled}
              placeholder="Home, Office, Shop"
              className={inputClass}
            />
          </label>

          {showDefaultToggle && (
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3">
              <input
                type="checkbox"
                checked={Boolean(value.isDefault)}
                onChange={(event) => updateField("isDefault", event.target.checked)}
                disabled={disabled}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-700">
                Default address
              </span>
            </label>
          )}
        </div>
      )}

      <label className="block">
        <span className="text-sm font-semibold text-gray-700">Full name</span>
        <input
          type="text"
          value={value.fullName}
          onChange={(event) => updateField("fullName", event.target.value)}
          disabled={disabled}
          placeholder="Receiver full name"
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Mobile number
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={value.mobile}
            onChange={(event) => updateField("mobile", event.target.value)}
            disabled={disabled}
            placeholder="10 digit mobile"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Alternate mobile
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={value.alternateMobile}
            onChange={(event) =>
              updateField("alternateMobile", event.target.value)
            }
            disabled={disabled}
            placeholder="Optional"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-gray-700">
          House, flat, street
        </span>
        <textarea
          value={value.addressLine1}
          onChange={(event) => updateField("addressLine1", event.target.value)}
          disabled={disabled}
          rows="2"
          placeholder="House no., building, street"
          className={`${inputClass} resize-none`}
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-gray-700">
          Area or locality
        </span>
        <input
          type="text"
          value={value.addressLine2}
          onChange={(event) => updateField("addressLine2", event.target.value)}
          disabled={disabled}
          placeholder="Area, colony, locality"
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Pincode</span>
          <input
            type="tel"
            inputMode="numeric"
            value={value.pincode}
            onChange={(event) => updateField("pincode", event.target.value)}
            disabled={disabled}
            placeholder="6 digit pincode"
            className={inputClass}
          />
          {pincodeLookupState.loading && (
            <p className="mt-2 text-xs font-medium text-gray-500">
              Fetching city and state...
            </p>
          )}
          {!pincodeLookupState.loading && pincodeLookupState.error && (
            <p className="mt-2 text-xs font-medium text-red-600">
              {pincodeLookupState.error}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Landmark</span>
          <input
            type="text"
            value={value.landmark}
            onChange={(event) => updateField("landmark", event.target.value)}
            disabled={disabled}
            placeholder="Optional"
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">City</span>
          <input
            type="text"
            value={value.city}
            onChange={(event) => updateField("city", event.target.value)}
            disabled={disabled}
            placeholder="City"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">State</span>
          <input
            type="text"
            value={value.state}
            onChange={(event) => updateField("state", event.target.value)}
            disabled={disabled}
            placeholder="State"
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}
