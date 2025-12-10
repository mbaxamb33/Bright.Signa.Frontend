import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from './contexts/AuthContext';
import { BootstrapProvider } from './contexts/BootstrapContext';
import { ShopProvider } from './contexts/ShopContext';
import { InviteProvider } from './contexts/InviteContext';

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false, // Disable auto-refetch on focus to reduce API calls
      refetchOnReconnect: true,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BootstrapProvider>
        <ShopProvider>
          <InviteProvider>
            <App />
          </InviteProvider>
        </ShopProvider>
      </BootstrapProvider>
    </AuthProvider>
  </QueryClientProvider>
);

