"use client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { config } from './wagmi';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [reconnect, setReconnect] = useState(false);

  useEffect(() => {
    const isBaseApp =
      navigator.userAgent.includes('CoinbaseBrowser') ||
      !!(window as any).ethereum?.isCoinbaseBrowser ||
      !!(window as any).ethereum?.isCoinbaseWallet;
    setReconnect(isBaseApp);
  }, []);

  return (
    <WagmiProvider config={config} reconnectOnMount={reconnect}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}