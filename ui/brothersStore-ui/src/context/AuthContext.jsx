import { createContext, useContext, useEffect, useState } from "react";

import { apiClient, createAuthHeaders } from "../lib/api";
import {
  emptyAddress,
  normalizeAddress,
  normalizeAddressBook,
} from "../lib/address";
import { getApiErrorMessage } from "../lib/storeApi";

const AUTH_STORAGE_KEY = "brothersStoreAuthSession";
const PROFILE_STORAGE_KEY = "brothersStoreProfile";
const ADMIN_EMAILS_STORAGE_KEY = "brothersStoreAdminEmails";
const DEFAULT_ADMIN_EMAILS = [
  "nitinparjapat3@gmail.com",
  "jatinparjapat2000@gmail.com",
];

const AuthContext = createContext(null);

const getStoredValue = (storageKey, fallbackValue) => {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

const normalizePhoneNumber = (value) => value.replace(/\D/g, "").slice(0, 10);
const normalizeEmail = (value) => value.trim().toLowerCase();
const mapUserRoleToSessionRoles = (role) => (role ? [String(role)] : []);
const deriveNameFromEmail = (email = "") => {
  const localPart = normalizeEmail(email).split("@")[0] ?? "";
  const parts = localPart
    .replace(/[0-9]+/g, " ")
    .split(/[._-]+|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return parts
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
};
const deriveDisplayName = (user = {}, fallback = "") =>
  (user.name?.trim() && user.name.trim() !== "User")
    ? user.name.trim()
    : (user.fullName?.trim() && user.fullName.trim() !== "User")
      ? user.fullName.trim()
      : fallback.trim();

const getGoogleAuthFromUrl = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get("token") ?? queryParams.get("access_token");

  if (!token) {
    return null;
  }

  return {
    session: {
      token,
      userId: queryParams.get("userId") ?? queryParams.get("sub") ?? "google-user",
      phoneNumber: queryParams.get("phoneNumber") ?? "",
      roles: queryParams.get("roles")
        ? queryParams.get("roles").split(",").filter(Boolean)
        : [],
    },
    profile: {
      fullName: queryParams.get("fullName") ?? "",
      email: queryParams.get("email") ?? "",
      mobile: queryParams.get("phoneNumber") ?? "",
    },
  };
};

const clearGoogleAuthQuery = () => {
  if (typeof window === "undefined") {
    return;
  }

  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get("token") ?? queryParams.get("access_token");

  if (!token) {
    return;
  }

  [
    "token",
    "access_token",
    "userId",
    "sub",
    "fullName",
    "email",
    "phoneNumber",
    "roles",
  ].forEach((key) => queryParams.delete(key));

  const nextSearch = queryParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
};

export function AuthProvider({ children }) {
  const googleAuth = getGoogleAuthFromUrl();
  const [session, setSession] = useState(
    () => googleAuth?.session ?? getStoredValue(AUTH_STORAGE_KEY, null)
  );
  const [profile, setProfile] = useState(() => {
    const storedProfile = getStoredValue(PROFILE_STORAGE_KEY, {});
    const initialProfile = {
      ...emptyAddress,
      email: "",
      savedAddresses: [],
      ...storedProfile,
      ...(googleAuth?.profile ?? {}),
    };
    const fullName = deriveDisplayName(
      { fullName: initialProfile.fullName, name: initialProfile.name },
      deriveNameFromEmail(initialProfile.email ?? "")
    );

    return normalizeAddress({
      ...initialProfile,
      fullName,
    });
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminEmails, setAdminEmails] = useState(() => {
    const storedEmails = getStoredValue(ADMIN_EMAILS_STORAGE_KEY, []);
    return Array.from(
      new Set([...DEFAULT_ADMIN_EMAILS, ...storedEmails].map(normalizeEmail))
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!session) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const customAdminEmails = adminEmails.filter(
      (email) => !DEFAULT_ADMIN_EMAILS.includes(email)
    );
    window.localStorage.setItem(
      ADMIN_EMAILS_STORAGE_KEY,
      JSON.stringify(customAdminEmails)
    );
  }, [adminEmails]);

  useEffect(clearGoogleAuthQuery, []);

  const updateProfile = (profileUpdate) => {
    setProfile((currentProfile) =>
      normalizeAddress({
        ...currentProfile,
        ...profileUpdate,
        savedAddresses: normalizeAddressBook(
          profileUpdate.savedAddresses ?? currentProfile.savedAddresses
        ),
      })
    );
  };

  const saveAddress = (address) => {
    const normalizedAddress = normalizeAddress({
      ...address,
      id:
        address.id ||
        `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: address.label || "Delivery",
    });

    setProfile((currentProfile) => {
      const existingAddresses = normalizeAddressBook(currentProfile.savedAddresses);
      const shouldBeDefault =
        normalizedAddress.isDefault || existingAddresses.length === 0;
      const nextAddresses = existingAddresses.some(
        (item) => item.id === normalizedAddress.id
      )
        ? existingAddresses.map((item) =>
            item.id === normalizedAddress.id
              ? { ...normalizedAddress, isDefault: shouldBeDefault || item.isDefault }
              : {
                  ...item,
                  isDefault: shouldBeDefault ? false : item.isDefault,
                }
          )
        : [
            ...existingAddresses.map((item) => ({
              ...item,
              isDefault: shouldBeDefault ? false : item.isDefault,
            })),
            { ...normalizedAddress, isDefault: shouldBeDefault },
          ];

      const normalizedAddresses = normalizeAddressBook(nextAddresses);
      const defaultAddress =
        normalizedAddresses.find((addressItem) => addressItem.isDefault) ??
        normalizedAddresses[0] ??
        normalizedAddress;

      return normalizeAddress({
        ...currentProfile,
        ...defaultAddress,
        savedAddresses: normalizedAddresses,
      });
    });

    return normalizeAddress(normalizedAddress);
  };

  const setDefaultAddress = (addressId) => {
    setProfile((currentProfile) => {
      const nextAddresses = normalizeAddressBook(currentProfile.savedAddresses).map(
        (address) => ({
          ...address,
          isDefault: address.id === addressId,
        })
      );
      const defaultAddress =
        nextAddresses.find((address) => address.isDefault) ?? nextAddresses[0];

      return normalizeAddress({
        ...currentProfile,
        ...(defaultAddress ?? {}),
        savedAddresses: nextAddresses,
      });
    });
  };

  const removeAddress = (addressId) => {
    setProfile((currentProfile) => {
      const nextAddresses = normalizeAddressBook(currentProfile.savedAddresses).filter(
        (address) => address.id !== addressId
      );
      const normalizedAddresses = normalizeAddressBook(nextAddresses);
      const defaultAddress =
        normalizedAddresses.find((address) => address.isDefault) ??
        normalizedAddresses[0];

      return normalizeAddress({
        ...currentProfile,
        ...(defaultAddress ?? {}),
        savedAddresses: normalizedAddresses,
      });
    });
  };

  const login = async ({ phoneNumber, fullName = "" }) => {
    setLoading(true);

    try {
      const { data } = await apiClient.post("/auth/dev-login", {
        phoneNumber: normalizePhoneNumber(phoneNumber),
        fullName: fullName.trim() || undefined,
      });

      setSession(data);
      setProfile((currentProfile) => ({
        ...currentProfile,
        fullName: fullName.trim() || currentProfile.fullName,
        mobile: normalizePhoneNumber(phoneNumber) || currentProfile.mobile,
      }));

      return data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Unable to sign in right now."), {
        cause: error,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    setAuthModalOpen(false);
  };

  const completeGoogleLogin = async (idToken) => {
    setLoading(true);

    try {
      const { data } = await apiClient.post("/auth/google-login", {
        idToken,
      });
      const user = data?.user ?? {};
      const fullName = deriveDisplayName(
        user,
        deriveNameFromEmail(user.email ?? currentUser?.email ?? "")
      );
      const nextSession = {
        token: data?.token ?? "",
        userId: user.id ?? "",
        phoneNumber: user.phoneNumber ?? "",
        roles: mapUserRoleToSessionRoles(user.role),
        fullName,
        email: user.email ?? "",
        picture: user.picture ?? "",
      };

      setSession(nextSession);
      setProfile((currentProfile) =>
        normalizeAddress({
          ...currentProfile,
          fullName: fullName || currentProfile.fullName,
          email: user.email ?? currentProfile.email,
          mobile: user.phoneNumber ?? currentProfile.mobile,
          savedAddresses: normalizeAddressBook(currentProfile.savedAddresses),
        })
      );
      setAuthModalOpen(false);

      return data;
    } catch (error) {
      throw new Error(
        getApiErrorMessage(error, "Unable to sign in with Google right now."),
        {
          cause: error,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = Boolean(session?.token);
  const token = session?.token ?? "";
  const currentUser = session
    ? {
        id: session.userId,
        phoneNumber: session.phoneNumber,
        fullName:
          deriveDisplayName(
            {
              fullName: profile.fullName,
              name: session.fullName,
            },
            deriveNameFromEmail(profile.email || session.email || "")
          ) || "",
        email: profile.email || session.email || "",
        roles: session.roles ?? [],
        picture: session.picture ?? "",
      }
    : null;
  const currentUserEmail = normalizeEmail(currentUser?.email ?? "");
  const hasAdminRole = currentUser?.roles?.some((role) =>
    ["admin", "owner"].includes(String(role).toLowerCase())
  );
  const isAdmin =
    isAuthenticated &&
    (Boolean(currentUserEmail && adminEmails.includes(currentUserEmail)) ||
      Boolean(hasAdminRole));

  const addAdmin = async (email) => {
    const normalizedEmail = normalizeEmail(email);

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      throw new Error("Enter a valid admin email address.");
    }

    if (token) {
      try {
        await apiClient.post(
          "/auth/admins",
          {
            email: normalizedEmail,
          },
          {
            headers: createAuthHeaders(token),
          }
        );
      } catch {
        // Keep local admin assignment usable until the backend endpoint is ready.
      }
    }

    setAdminEmails((currentEmails) =>
      currentEmails.includes(normalizedEmail)
        ? currentEmails
        : [...currentEmails, normalizedEmail]
    );

    return normalizedEmail;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        session,
        profile,
        currentUser,
        isAuthenticated,
        isAdmin,
        adminEmails,
        loading,
        authModalOpen,
        openAuthModal: () => setAuthModalOpen(true),
        closeAuthModal: () => setAuthModalOpen(false),
        ensureAuthenticated: () => {
          if (isAuthenticated) {
            return true;
          }

          setAuthModalOpen(true);
          return false;
        },
        login,
        completeGoogleLogin,
        logout,
        updateProfile,
        saveAddress,
        setDefaultAddress,
        removeAddress,
        addAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
