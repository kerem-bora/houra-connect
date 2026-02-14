"use client";

import { useAuthenticate } from '@coinbase/onchainkit/minikit';
import { useState } from 'react';

export default function AuthPage() {
  const { user, authenticate } = useAuthenticate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async () => {
    setIsAuthenticating(true);
    try {
      const authenticatedUser = await authenticate();
      if (authenticatedUser) {
        console.log('Başarıyla giriş yapıldı. FID:', authenticatedUser.fid);
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>✅ Giriş Başarılı! FID: {user.fid}</p>
        <button onClick={() => window.location.reload()}>Çıkış Yap (Sayfayı Yenile)</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <button 
        onClick={handleAuth} 
        disabled={isAuthenticating}
        style={{ padding: '12px 24px', backgroundColor: '#0052FF', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
      >
        {isAuthenticating ? 'Giriş Yapılıyor...' : 'Sign In with Farcaster'}
      </button>
    </div>
  );
}