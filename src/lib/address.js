export const emptyAddress = {
  id: "",
  label: "",
  fullName: "",
  mobile: "",
  alternateMobile: "",
  pincode: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
};

export const cleanMobile = (value) => value.replace(/\D/g, "").slice(0, 10);

export const cleanPincode = (value) => value.replace(/\D/g, "").slice(0, 6);

export const lookupIndianPincode = async (rawPincode) => {
  const pincode = cleanPincode(rawPincode);

  if (pincode.length !== 6) {
    throw new Error("Enter a valid 6 digit pincode.");
  }

  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);

  if (!response.ok) {
    throw new Error("Unable to verify this pincode right now.");
  }

  const data = await response.json();
  const result = Array.isArray(data) ? data[0] : null;
  const postOffice = Array.isArray(result?.PostOffice) ? result.PostOffice[0] : null;

  if (!postOffice || String(result?.Status).toLowerCase() !== "success") {
    throw new Error("Pincode not found.");
  }

  return {
    city: String(postOffice.District ?? postOffice.Name ?? "").trim(),
    state: String(postOffice.State ?? "").trim(),
  };
};

export const normalizeAddress = (source = {}) => ({
  ...emptyAddress,
  ...source,
  id: source.id ?? "",
  label: source.label ?? "",
  fullName: source.fullName ?? "",
  mobile: source.mobile ?? source.phoneNumber ?? "",
  addressLine1: source.addressLine1 ?? source.address ?? "",
});

export const normalizeAddressBook = (addresses = []) =>
  (Array.isArray(addresses) ? addresses : [])
    .map((address, index) =>
      normalizeAddress({
        id: address.id || `address-${index + 1}`,
        label: address.label || (index === 0 ? "Home" : `Address ${index + 1}`),
        ...address,
      })
    )
    .filter((address) => address.addressLine1 || address.pincode || address.mobile);

export const validateAddress = (address) => {
  if (address.fullName.trim().length < 3) {
    return "Enter the receiver's full name.";
  }

  if (cleanMobile(address.mobile).length !== 10) {
    return "Enter a valid 10 digit mobile number.";
  }

  if (
    address.alternateMobile &&
    cleanMobile(address.alternateMobile).length !== 10
  ) {
    return "Enter a valid alternate mobile number or leave it empty.";
  }

  if (cleanPincode(address.pincode).length !== 6) {
    return "Enter a valid 6 digit pincode.";
  }

  if (address.addressLine1.trim().length < 8) {
    return "Enter house number, street, or building details.";
  }

  if (address.addressLine2.trim().length < 3) {
    return "Enter area or locality.";
  }

  if (address.city.trim().length < 2) {
    return "Enter city.";
  }

  if (address.state.trim().length < 2) {
    return "Enter state.";
  }

  return "";
};

export const formatAddressForOrder = (address) => {
  const lines = [
    address.label.trim() ? `${address.label.trim()} Address` : "",
    address.fullName.trim(),
    `Mobile: ${cleanMobile(address.mobile)}`,
    address.alternateMobile
      ? `Alternate mobile: ${cleanMobile(address.alternateMobile)}`
      : "",
    address.addressLine1.trim(),
    address.addressLine2.trim(),
    address.landmark.trim() ? `Landmark: ${address.landmark.trim()}` : "",
    `${address.city.trim()}, ${address.state.trim()} - ${cleanPincode(address.pincode)}`,
  ];

  return lines.filter(Boolean).join("\n");
};
