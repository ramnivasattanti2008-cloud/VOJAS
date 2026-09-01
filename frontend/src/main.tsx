import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { I18nextProvider } from "react-i18next";
import App from "./App";
import i18n from "./i18n/i18n";
import "./index.css";
import "leaflet/dist/leaflet.css";

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
