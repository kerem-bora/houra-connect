"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { config } from './wagmi'; // wagmi.ts dosyasındaki config'i içeri alıyoruz

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient'ı sadece bir kez oluşturmak için useState kullanıyoruz
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}