import { useEffect, useRef, useState } from "react";
import { FiCrosshair, FiMapPin } from "react-icons/fi";

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
  errors = {},
}) {
  const [pincodeLookupState, setPincodeLookupState] = useState({
    loading: false,
    error: "",
  });
  const [geoLocationState, setGeoLocationState] = useState({
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

  const withErrorClass = (field) =>
    `${inputClass} ${errors[field] ? "border-red-500 bg-red-50 focus:border-red-500" : ""}`;

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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoLocationState({
        loading: false,
        error: "Location is not supported in this browser.",
      });
      return;
    }

    setGeoLocationState({
      loading: true,
      error: "",
    });

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = new URL("https://nominatim.openstreetmap.org/reverse");
          url.searchParams.set("lat", String(coords.latitude));
          url.searchParams.set("lon", String(coords.longitude));
          url.searchParams.set("format", "jsonv2");
          url.searchParams.set("addressdetails", "1");
          url.searchParams.set("zoom", "18");

          const response = await fetch(url.toString(), {
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error("Unable to fetch your address from location.");
          }

          const data = await response.json();
          const address = data?.address ?? {};
          const streetLine = [
            address.house_number,
            address.road || address.pedestrian || address.cycleway || address.footway,
          ]
            .filter(Boolean)
            .join(", ")
            .trim();
          const localityLine = [
            address.suburb || address.neighbourhood,
            address.city_district || address.county,
            address.state_district || address.county,
          ]
            .filter(Boolean)
            .join(", ")
            .trim();
          const landmark =
            address.amenity ||
            address.building ||
            address.shop ||
            address.tourism ||
            address.leisure ||
            address.office ||
            "";
          const city =
            address.city ||
            address.town ||
            address.village ||
            address.hamlet ||
            value.city;
          const state = address.state || value.state;
          const pincode = cleanPincode(address.postcode ?? value.pincode ?? "");
          const country = address.country || "India";

          onChange({
            ...value,
            addressLine1: streetLine || address.neighbourhood || value.addressLine1,
            addressLine2: localityLine || value.addressLine2,
            landmark: landmark || value.landmark,
            city: city ?? "",
            state: state ?? "",
            pincode,
            country,
          });

          setGeoLocationState({
            loading: false,
            error: "",
          });
        } catch (error) {
          setGeoLocationState({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to fetch your address from location.",
          });
        }
      },
      (error) => {
        let message = "Unable to access your current location.";

        if (error.code === 1) {
          message = "Location permission denied. Please allow location access.";
        } else if (error.code === 2) {
          message = "Location unavailable. Please try again.";
        } else if (error.code === 3) {
          message = "Location request timed out. Please try again.";
        }

        setGeoLocationState({
          loading: false,
          error: message,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      }
    );
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={disabled || geoLocationState.loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {geoLocationState.loading ? (
            <>
              <FiCrosshair className="animate-pulse text-base text-slate-700" />
              Detecting location...
            </>
          ) : (
            <>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">
                <FiMapPin className="text-sm" />
              </span>
              Use current location
            </>
          )}
        </button>
        {geoLocationState.error && (
          <p className="mt-2 text-xs font-medium text-red-600">
            {geoLocationState.error}
          </p>
        )}
      </div>

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
              className={withErrorClass("label")}
            />
            {errors.label && (
              <p className="mt-1 text-xs font-medium text-red-600">{errors.label}</p>
            )}
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
          className={withErrorClass("fullName")}
        />
        {errors.fullName && (
          <p className="mt-1 text-xs font-medium text-red-600">{errors.fullName}</p>
        )}
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
            className={withErrorClass("mobile")}
          />
          {errors.mobile && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.mobile}</p>
          )}
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
            className={withErrorClass("alternateMobile")}
          />
          {errors.alternateMobile && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.alternateMobile}</p>
          )}
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
          className={`${withErrorClass("addressLine1")} resize-none`}
        />
        {errors.addressLine1 && (
          <p className="mt-1 text-xs font-medium text-red-600">{errors.addressLine1}</p>
        )}
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
          className={withErrorClass("addressLine2")}
        />
        {errors.addressLine2 && (
          <p className="mt-1 text-xs font-medium text-red-600">{errors.addressLine2}</p>
        )}
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
            className={withErrorClass("pincode")}
          />
          {errors.pincode && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.pincode}</p>
          )}
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
            className={withErrorClass("landmark")}
          />
          {errors.landmark && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.landmark}</p>
          )}
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
            className={withErrorClass("city")}
          />
          {errors.city && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.city}</p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">State</span>
          <input
            type="text"
            value={value.state}
            onChange={(event) => updateField("state", event.target.value)}
            disabled={disabled}
            placeholder="State"
            className={withErrorClass("state")}
          />
          {errors.state && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.state}</p>
          )}
        </label>
      </div>
    </div>
  );
}
