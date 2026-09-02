import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { I18nextProvider } from "react-i18next";
import * as Sentry from "@sentry/react";
import App from "./App";
import i18n from "./i18n/i18n";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Sentry error monitoring — activates once SENTRY_DSN is set in env.
// Until then, this is a no-op (Sentry checks for DSN before sending).
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.DEV ? "development" : "production",
  // Sample rate: capture 100% in dev, 10% in prod (free tier = 5K events/month)
  sampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.05,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s — balance between fresh data and not hammering the API
      staleTime: 30 * 1000,
      // Don't refetch on every focus — let user re-trigger manually
      refetchOnWindowFocus: false,
      // Retry once on failure (transient network errors)
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
);
