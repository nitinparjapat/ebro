import { GoogleLogin } from "@react-oauth/google";

import { useAuth } from "../../context/AuthContext";

export default function AuthPanel({
  introText = "Welcome! Unlock exclusive deals",
  className = "",
}) {
  const { currentUser, isAuthenticated, loading, logout, profile, completeGoogleLogin } =
    useAuth();

  if (isAuthenticated) {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-gray-500">{introText}</p>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            Signed In
          </p>

          <h3 className="mt-2 text-lg font-bold text-gray-900">
            {currentUser?.fullName || currentUser?.email || "Customer"}
          </h3>

          <p className="mt-1 text-sm text-gray-600">
            {currentUser?.email || profile.email || "Google account"}
          </p>

          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-800"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-sm font-medium text-gray-500">{introText}</p>

      <div className="mt-5">
        <h2 className="text-xl font-bold text-gray-900">Sign in</h2>
        <p className="mt-2 text-sm text-gray-500">
          Use your Google account to continue.
        </p>

        <div className="mt-5">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (!credentialResponse.credential) {
                window.alert("Google sign-in did not return a credential.");
                return;
              }

              try {
                await completeGoogleLogin(credentialResponse.credential);
              } catch (error) {
                window.alert(error.message);
              }
            }}
            onError={() => {
              window.alert("Google sign-in failed. Please try again.");
            }}
            theme="outline"
            size="large"
            text={loading ? "signin_with" : "continue_with"}
            shape="rectangular"
            width="320"
          />
        </div>
      </div>
    </div>
  );
}
