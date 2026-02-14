"use client";
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';

const wagmiConfig = createConfig({
chains: [base],
ssr: true,
transports: {
[base.id]: http(),
},
});

export function Providers({ children }: { children: ReactNode }) {
const [queryClient] = useState(() => new QueryClient());
const [mounted, setMounted] = useState(false);

useEffect(() => {
setMounted(true);
}, []);

if (!mounted) return null;

return (
<WagmiProvider config={wagmiConfig}>
<QueryClientProvider client={queryClient}>
<OnchainKitProvider
apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
chain={base}
config={{ appearance: { mode: 'auto' } }}
>
{children}
</OnchainKitProvider>
</QueryClientProvider>
</WagmiProvider>
);
}