"use client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { config } from './wagmi';

// useState/useEffect olmadan, modül yüklenirken hesapla
const isInAppBrowser = (() => {
  if (typeof window === 'undefined') return false; // SSR
  const eth = (window as any).ethereum;
  return eth !== undefined;
})();

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} reconnectOnMount={isInAppBrowser}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}