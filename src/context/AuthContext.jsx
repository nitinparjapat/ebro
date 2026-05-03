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
const sanitizeSession = (session) =>
  session
    ? {
        userId: session.userId ?? session.id ?? session.sub ?? "",
        phoneNumber: session.phoneNumber ?? session.mobile ?? "",
        roles: Array.isArray(session.roles) ? session.roles : [],
        email: session.email ?? "",
        fullName: session.fullName ?? session.name ?? "",
        authenticated: Boolean(session.authenticated),
      }
    : null;

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
    session: sanitizeSession({
      token,
      userId: queryParams.get("userId") ?? queryParams.get("sub") ?? "google-user",
      phoneNumber: queryParams.get("phoneNumber") ?? "",
      roles: queryParams.get("roles")
        ? queryParams.get("roles").split(",").filter(Boolean)
        : [],
      email: queryParams.get("email") ?? "",
      fullName: queryParams.get("fullName") ?? "",
      authenticated: true,
    }),
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
    () => googleAuth?.session ?? sanitizeSession(getStoredValue(AUTH_STORAGE_KEY, null))
  );
  const [profile, setProfile] = useState(() =>
    normalizeAddress(
      {
        ...emptyAddress,
        email: "",
        savedAddresses: [],
        ...getStoredValue(PROFILE_STORAGE_KEY, {}),
        ...(googleAuth?.profile ?? {}),
      }
    )
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
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

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(sanitizeSession(session))
    );
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

  useEffect(() => {
    let ignore = false;

    const bootstrapSession = async () => {
      try {
        const { data } = await apiClient.get("/auth/session");
        const nextSession = sanitizeSession(data?.session ?? data);

        if (ignore) {
          return;
        }

        if (nextSession?.userId || nextSession?.email) {
          setSession({
            ...nextSession,
            authenticated: true,
          });
          setProfile((currentProfile) =>
            normalizeAddress({
              ...currentProfile,
              fullName:
                nextSession.fullName || currentProfile.fullName || googleAuth?.profile?.fullName,
              email: nextSession.email || currentProfile.email || googleAuth?.profile?.email,
              mobile:
                nextSession.phoneNumber ||
                currentProfile.mobile ||
                googleAuth?.profile?.mobile,
            })
          );
        } else if (!googleAuth?.session) {
          setSession(null);
        }
      } catch {
        if (!ignore && !googleAuth?.session) {
          setSession(null);
        }
      } finally {
        if (!ignore) {
          setAuthReady(true);
        }
      }
    };

    bootstrapSession();

    return () => {
      ignore = true;
    };
  }, [googleAuth?.profile?.email, googleAuth?.profile?.fullName, googleAuth?.profile?.mobile, googleAuth?.session]);

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
      const nextAddresses = existingAddresses.some(
        (item) => item.id === normalizedAddress.id
      )
        ? existingAddresses.map((item) =>
            item.id === normalizedAddress.id ? normalizedAddress : item
          )
        : [...existingAddresses, normalizedAddress];

      return normalizeAddress({
        ...currentProfile,
        ...normalizedAddress,
        savedAddresses: nextAddresses,
      });
    });

    return normalizedAddress;
  };

  const removeAddress = (addressId) => {
    setProfile((currentProfile) =>
      normalizeAddress({
        ...currentProfile,
        savedAddresses: normalizeAddressBook(currentProfile.savedAddresses).filter(
          (address) => address.id !== addressId
        ),
      })
    );
  };

  const login = async ({ phoneNumber, fullName = "" }) => {
    setLoading(true);

    try {
      const { data } = await apiClient.post("/auth/dev-login", {
        phoneNumber: normalizePhoneNumber(phoneNumber),
        fullName: fullName.trim() || undefined,
      });

      setSession({
        ...sanitizeSession(data),
        authenticated: true,
      });
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

  const loginWithGoogleIdToken = async (idToken) => {
    setLoading(true);

    try {
      const { data } = await apiClient.post("/auth/google", {
        idToken,
      });
      const nextSession = sanitizeSession(data);

      setSession({
        ...nextSession,
        authenticated: true,
      });
      setProfile((currentProfile) =>
        normalizeAddress({
          ...currentProfile,
          fullName: nextSession?.fullName || currentProfile.fullName,
          email: nextSession?.email || currentProfile.email,
          mobile: nextSession?.phoneNumber || currentProfile.mobile,
        })
      );
      setAuthModalOpen(false);

      return nextSession;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Unable to sign in with Google."), {
        cause: error,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Local session cleanup should still happen if the server is unreachable.
    } finally {
      setSession(null);
      setAuthModalOpen(false);
    }
  };

  const startGoogleLogin = () => {
    const googleOAuthUrl =
      import.meta.env.VITE_GOOGLE_OAUTH_URL || "/api/auth/google";

    window.location.assign(googleOAuthUrl);
  };

  const isAuthenticated =
    Boolean(session?.authenticated) &&
    Boolean(session?.userId || session?.email);
  const token = isAuthenticated ? "__cookie_session__" : "";
  const currentUser = session
    ? {
        id: session.userId,
        phoneNumber: session.phoneNumber,
        fullName: session.fullName || profile.fullName,
        email: session.email || profile.email,
        roles: session.roles ?? [],
      }
    : null;
  const currentUserEmail = normalizeEmail(currentUser?.email ?? profile.email ?? "");
  const hasAdminRole = currentUser?.roles?.some((role) =>
    ["admin", "owner"].includes(String(role).toLowerCase())
  );
  const isAdmin =
    Boolean(currentUserEmail && adminEmails.includes(currentUserEmail)) ||
    Boolean(hasAdminRole);

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
        authReady,
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
        loginWithGoogleIdToken,
        startGoogleLogin,
        logout,
        updateProfile,
        saveAddress,
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
