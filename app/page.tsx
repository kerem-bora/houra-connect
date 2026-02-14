'use client';
import { useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAuthenticate } from '@coinbase/onchainkit/minikit';

function MiniApp() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { user, authenticate } = useAuthenticate();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  const handleSignIn = async () => {
    try {
      const result = await authenticate();
      if (result?.token) {
        setToken(result.token);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {user ? (
          <div>
            <p>Hoş geldiniz!</p>
            {token && <p>Token: {token.slice(0, 20)}...</p>}
          </div>
        ) : (
          <button onClick={handleSignIn}>Sign in with Farcaster</button>
        )}
      </main>
      <footer style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #ccc' }}>
        {user ? <p>FID: {user.fid}</p> : <p>Henüz giriş yapılmadı</p>}
      </footer>
    </div>
  );
}

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <MiniApp />;
}