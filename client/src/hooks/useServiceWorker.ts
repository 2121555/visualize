import { useEffect } from "react";

export function useServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err);
        });
    }
  }, []);
}

/**
 * Pre-cache inspection data for offline use.
 * Call this before heading to an inspection — it downloads and caches
 * the lead data, storm evidence, and collateral photos so the iPad
 * works without connectivity.
 */
export function precacheInspection(leadId: number, photoUrls: string[]) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    // Pre-cache the API responses for this lead
    const apiUrls = [
      `/api/trpc/leads.getById?input=${encodeURIComponent(JSON.stringify({ json: { id: leadId } }))}`,
    ];

    // Also cache any collateral photos
    const allUrls = [...apiUrls, ...photoUrls];

    navigator.serviceWorker.controller.postMessage({
      type: "PRECACHE_INSPECTION",
      urls: allUrls,
    });
  }
}
