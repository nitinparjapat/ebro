import { useEffect, useRef, useState } from "react";

import { cleanMobile, cleanPincode, lookupIndianPincode } from "../../lib/address";

const inputClass =
  "mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black";

export default function AddressForm({
  value,
  onChange,
  disabled = false,
  showLabel = false,
}) {
  const [pincodeStatus, setPincodeStatus] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
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
    const pincode = cleanPincode(value.pincode);

    if (pincode.length !== 6) {
      lastResolvedPincodeRef.current = "";
      setPincodeLoading(false);
      setPincodeStatus("");
      return undefined;
    }

    if (pincode === lastResolvedPincodeRef.current) {
      return undefined;
    }

    let ignore = false;

    const timeoutId = window.setTimeout(async () => {
      try {
        setPincodeLoading(true);
        setPincodeStatus("");

        const location = await lookupIndianPincode(pincode);

        if (ignore) {
          return;
        }

        lastResolvedPincodeRef.current = pincode;
        onChange({
          ...value,
          pincode,
          city: location.city || value.city,
          state: location.state || value.state,
        });
        setPincodeStatus(
          location.city && location.state
            ? `City and state filled from pincode.`
            : ""
        );
      } catch (error) {
        if (ignore) {
          return;
        }

        setPincodeStatus(error.message || "Unable to look up this pincode.");
      } finally {
        if (!ignore) {
          setPincodeLoading(false);
        }
      }
    }, 350);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [onChange, value]);

  return (
    <div className="grid gap-4">
      {showLabel && (
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
          {(pincodeLoading || pincodeStatus) && (
            <p
              className={`mt-2 text-xs font-medium ${
                pincodeLoading
                  ? "text-gray-500"
                  : pincodeStatus === "City and state filled from pincode."
                    ? "text-green-700"
                    : "text-red-600"
              }`}
            >
              {pincodeLoading ? "Finding city and state..." : pincodeStatus}
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
