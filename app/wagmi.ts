import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount, injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],

  multiInjectedProviderDiscovery: false, 
  connectors: [
    // Base Account konnektörü en üstte olmalı
    baseAccount({
      appName: 'Houra',
      preference: 'smartWalletOnly',
    }),
    injected(),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}