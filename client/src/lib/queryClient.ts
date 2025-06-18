import { QueryClient } from "@tanstack/react-query";

// Simplified QueryClient for client-side only processing
// No server API calls needed - everything runs in browser
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
