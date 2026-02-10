"use client";
import { useEffect, useState } from "react";
import sdk from "@farcaster/frame-sdk";

export default function Home() {
  // --- EKSİK TANIMLAMALAR BURADA DÜZELTİLDİ ---
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [city, setCity] = useState("");
  const [talents, setTalents] = useState(""); // TextArea için ekledim
  const [status, setStatus] = useState("");   // Status mesajları için ekledim

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        // SDK hazır olduğunda splash screen'i kapatır
        sdk.actions.ready();
      } catch (e) {
        console.error("SDK Initialization Error:", e);
      }
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]); // Bağımlılık dizisi eklendi

  const handleJoinNetwork = async () => {
    if (!context?.user?.fid) {
      setStatus("Error: Farcaster user not detected.");
      return;
    }

    setStatus("Requesting signature...");
    try {
      // 1. Backend'den nonce al
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();

      // 2. Farcaster imza penceresini aç
      const { message, signature } = await sdk.actions.signIn({ nonce });

      // 3. Verileri backend'e gönder
      setStatus("Verifying...");
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          signature,
          nonce,
          fid: context.user.fid,
          username: context.user.username,
          pfp: context.user.pfpUrl,
          city,
          talents // Artık tanımlı
        }),
      });

      if (res.ok) {
        setStatus("Success! Welcome to Houra. ✅");
      } else {
        const errorData = await res.json();
        setStatus(`Error: ${errorData.error || "Verification failed."}`);
      }
    } catch (e) {
      console.error(e);
      setStatus("Transaction cancelled or failed.");
    }
  };

  if (!isSDKLoaded) {
    return (
      <div style={{ backgroundColor: '#000', color: '#fff', padding: '50px', textAlign: 'center' }}>
        Loading Time Bank...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      <p style={{ color: '#9ca3af' }}>Time Economy</p>

      {/* Profile Section */}
      <div style={{ margin: '20px 0', padding: '15px', borderRadius: '15px', background: '#18181b', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img src={context?.user?.pfpUrl} style={{ width: '50px', height: '50px', borderRadius: '50%' }} alt="pfp" />
        <div>
          <p style={{ margin: 0, fontWeight: 'bold' }}>@{context?.user?.username}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>FID: {context?.user?.fid}</p>
        </div>
      </div>

      {/* Input Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          placeholder="City" 
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#fff', color: '#000' }}
        />
        <textarea 
          placeholder="Your Talents (e.g. Coding, Gardening)" 
          value={talents}
          onChange={(e) => setTalents(e.target.value)}
          style={{ width: '100%', padding: '12px', height: '80px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#fff', color: '#000' }}
        />

        <button 
          onClick={handleJoinNetwork}
          style={{ 
            width: '100%', 
            padding: '15px', 
            background: '#2563eb', 
            color: '#fff',
            fontWeight: 'bold', 
            border: 'none', 
            borderRadius: '10px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          JOIN NETWORK
        </button>
      </div>

      {status && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          borderRadius: '8px', 
          background: status.includes('Success') ? '#064e3b' : '#450a0a',
          color: status.includes('Success') ? '#34d399' : '#f87171',
          fontSize: '0.9rem',
          textAlign: 'center'
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
