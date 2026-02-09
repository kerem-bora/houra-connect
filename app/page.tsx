"use client";
import { useEffect, useState } from "react";
import sdk from "@farcaster/frame-sdk";

export default function Home() {
  const [context, setContext] = useState<any>(null);
  const [city, setCity] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        // Important: ready() must be called to hide the splash screen [1]
        sdk.actions.ready();
      } catch (e) {
        console.error("SDK Initialization Error:", e);
      }
    };
    if (sdk &&!isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  },);

  const handleJoinNetwork = async () => {
    if (!context?.user?.fid) {
      setStatus("Error: Farcaster user not detected.");
      return;
    }

    setStatus("Requesting signature...");
    try {
      // 1. Get a secure nonce from your backend
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();

      // 2. Open the native Farcaster sign-in window
      const { message, signature } = await sdk.actions.signIn({ nonce });

      // 3. Send signature and profile data to backend for Neynar verification
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
          talents
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
    return <div style={{ backgroundColor: '#000', color: '#fff', padding: '50px' }}>Loading Time Bank...</div>;
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px' }}>
      <h1>Houra Connect</h1>
      <p>Time Bank on Optimism</p>

      {/* Profile Section */}
      <div style={{ margin: '20px 0', padding: '15px', borderRadius: '15px', background: '#18181b' }}>
        <img src={context?.user?.pfpUrl} style={{ width: '50px', borderRadius: '50%' }} />
        <p>@{context?.user?.username} (FID: {context?.user?.fid})</p>
      </div>

      {/* Input Fields */}
      <input 
        placeholder="City" 
        onChange={(e) => setCity(e.target.value)}
        style={{ width: '100%', padding: '10px', margin: '10px 0', color: '#000' }}
      />
      <textarea 
        placeholder="Your Talents (e.g. Coding, Gardening)" 
        onChange={(e) => setTalents(e.target.value)}
        style={{ width: '100%', padding: '10px', height: '80px', color: '#000' }}
      />

      <button 
        onClick={handleJoinNetwork}
        style={{ width: '100%', padding: '15px', background: '#2563eb', fontWeight: 'bold', border: 'none', borderRadius: '10px' }}
      >
        JOIN NETWORK
      </button>

      {status && <p style={{ marginTop: '15px', color: '#60a5fa' }}>{status}</p>}
    </div>
  );
}
