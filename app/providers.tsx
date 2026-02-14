"use client";
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OnchainKitProvider 
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} 
      chain={base}
      config={{ 
        appearance: { 
          mode: 'auto' 
        } 
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}