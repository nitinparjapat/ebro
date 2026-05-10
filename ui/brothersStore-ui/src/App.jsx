import { useEffect } from "react";

import AuthModal from "./components/auth/AuthModal";
import AppRoutes from "./routes/AppRoutes";
import { apiClient } from "./lib/api";

const VISITOR_KEY = "brothersStoreVisitorKey";

const getVisitorKey = () => {
  const savedKey = window.localStorage.getItem(VISITOR_KEY);

  if (savedKey) {
    return savedKey;
  }

  const generatedKey =
    window.crypto?.randomUUID?.() ??
    `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(VISITOR_KEY, generatedKey);
  return generatedKey;
};

function App() {
  useEffect(() => {
    const controller = new AbortController();

    apiClient.post(
      "/analytics/visit",
      {
        clientKey: getVisitorKey(),
        path: window.location.pathname,
      },
      {
        signal: controller.signal,
      }
    ).catch(() => {
    });

    return () => controller.abort();
  }, []);

  return (
    <div className="paper-bg min-h-screen text-slate-900">
      <AppRoutes />
      <AuthModal />
    </div>
  );
}

export default App;
