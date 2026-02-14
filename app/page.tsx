"use client";
import { useAuthenticate } from '@coinbase/onchainkit/minikit';
import { useEffect, useState } from 'react';

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const { user, authenticate } = useAuthenticate();

  // Dökümantasyon kuralı: SSR sırasında hook'un çalışmasını engelle
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; 

  return (
    <div>
      {user ? (
        <p>FID: {user.fid}</p>
      ) : (
        <button onClick={() => authenticate()}>Sign in with Farcaster</button>
      )}
    </div>
  );
}