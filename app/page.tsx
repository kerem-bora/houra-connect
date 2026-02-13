"use client";
import { useEffect, useState, useCallback } from "react";
import { sdk } from "@farcaster/frame-sdk"; 
import { useReadContract, useAccount } from 'wagmi';
import { useSendCalls } from 'wagmi/experimental'; 
import { formatUnits, encodeFunctionData, parseUnits } from 'viem';

// --- CONFIG ---
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }
] as const;

export default function Home() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");
  const [status, setStatus] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false); 
  
  // States
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [offerQuery, setOfferQuery] = useState("");
  const [offerResults, setOfferResults] = useState<any[]>([]);
  const [needLocation, setNeedLocation] = useState("");
  const [needText, setNeedText] = useState("");
  const [needPrice, setNeedPrice] = useState("1");
  const [needs, setNeeds] = useState<any[]>([]);

  const { address: currentAddress } = useAccount();
  const { sendCalls } = useSendCalls();

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  const fetchAllData = useCallback(async (fid: number) => {
    try {
      const profRes = await fetch(`/api/profile?fid=${fid}`);
      const profData = await profRes.json();
      if (profData.profile) {
        setLocation(profData.profile.city || "");
        setOffer(profData.profile.bio || "");
      }
      const needsRes = await fetch('/api/needs');
      const needsData = await needsRes.json();
      // Buradaki verinin doğruluğunu console'dan kontrol edebilirsin
      console.log("Fetched needs:", needsData.needs);
      setNeeds(needsData.needs || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        if (ctx?.user?.fid) {
          setIsFarcaster(true);
          await fetchAllData(ctx.user.fid);
        }
        sdk.actions.ready();
      } catch (e) { 
        const res = await fetch('/api/needs').catch(() => null);
        if (res) {
          const data = await res.json();
          setNeeds(data.needs || []);
        }
      } finally {
        setIsSDKLoaded(true);
      }
    };
    init();
  }, [fetchAllData]);

  // Search Logic (aynı kalıyor)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 1) {
        const res = await fetch(`/api/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } else setSearchResults([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (offerQuery.length > 1) {
        const res = await fetch(`/api/search?q=${offerQuery}`);
        const data = await res.json();
        setOfferResults(data.users || []);
      } else setOfferResults([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [offerQuery]);

  const handleTransfer = useCallback(async () => {
    if (!selectedRecipient?.wallet_address) return setStatus("Select recipient");
    sendCalls({
      calls: [{
        to: HOURA_TOKEN_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: TOKEN_ABI,
          functionName: 'transfer',
          args: [selectedRecipient.wallet_address as `0x${string}`, parseUnits(sendAmount, 18)],
        }),
        value: 0n,
      }],
    }, {
      onSuccess: () => {
        setStatus("Success! ✅");
        setSelectedRecipient(null);
        setTimeout(() => { setStatus(""); refetchBalance(); }, 3000);
      }
    });
  }, [sendCalls, refetchBalance, selectedRecipient, sendAmount]);

  const handleAddNeed = async () => {
    if (!needText) return setStatus("Write your need.");
    try {
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context.user.fid,
          username: context.user.username,
          location: needLocation,
          text: needText,
          wallet_address: currentAddress,
          price: needPrice
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Need posted! ✅");
        setNeedText(""); setNeedLocation("");
        const nRes = await fetch('/api/needs');
        const nData = await nRes.json();
        setNeeds(nData.needs || []);
        setTimeout(() => setStatus(""), 2000);
      } else {
        setStatus(data.error || "Error");
      }
    } catch (e) { setStatus("Error"); }
  };

  const handleDeleteNeed = async (identifier: string) => {
    if (!identifier || !context?.user?.fid) {
      setStatus("Error: Missing ID or FID");
      return;
    }

    setStatus("Deleting...");
    
    try {
      // API uuid bekliyor, ancak identifier her iki durumda da string olarak gelir
      const res = await fetch(`/api/needs?uuid=${identifier}&fid=${context.user.fid}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("Deleted! 🗑️");
        // Hem id hem uuid ihtimaline karşı filtreleme
        setNeeds((prev) => prev.filter((n) => (n.uuid !== identifier && n.id !== identifier)));
        setTimeout(() => setStatus(""), 2000);
      } else {
        setStatus(`API Error: ${data.error}`);
      }
    } catch (e) {
      setStatus("Network error");
    }
  };

  // Render logic... (Kısalık adına AboutContent ve loading aynı kalıyor)
  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  const AboutContent = () => (
    <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', maxWidth: '400px', width: '100%', position: 'relative', textAlign: 'left', boxSizing: 'border-box' }}>
      <h2 style={{ marginTop: 0 }}>Welcome to Houra</h2>
      <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
        Houra is a peer-to-peer <strong>Time Economy</strong> platform where you exchange your skills for time-based tokens.
      </p>
      <div style={{ margin: '20px 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p>📍 <strong>Profile:</strong> Set your location and what you offer to the community.</p>
        <p>⏳ <strong>Earn:</strong> Help others with their needs and collect Houra tokens.</p>
        <p>🛠️ <strong>Post:</strong> Share what you need and reward those who give their time.</p>
      </div>
      <button onClick={() => setIsAboutOpen(false)} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer' }}>Got it!</button>
    </div>
  );

  if (!isFarcaster) {
    return (
      <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/houra-logo.png" alt="Houra" style={{ width: '80px', height: '80px', marginBottom: '20px' }} />
        <AboutContent />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header ve Diğer Paneller (Kodun ortası aynı kalıyor) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px', height: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px' }}>i</button>
      </div>

      {isAboutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <AboutContent />
        </div>
      )}

      {/* 1. SEND PANEL (Aynı) */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '10px 15px', borderRadius: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>@{selectedRecipient.username}</span>
            <button onClick={() => setSelectedRecipient(null)} style={{ color: '#fff', background: 'none', border: 'none', textDecoration: 'underline' }}>Change</button>
          </div>
        )}
        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: '#fff', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px' }}>SEND {sendAmount} HOURA</button>
      </div>

      {/* 5. LATEST NEEDS - KRİTİK DÜZELTME BURADA */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Latest Needs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' }}>
        {needs && needs.length > 0 ? needs.map((need: any) => {
          // Fallback mekanizması: uuid yoksa id kullan
          const needKey = need.uuid || need.id || Math.random().toString();
          
          return (
            <div key={needKey} style={{ padding: '16px', background: '#111', borderRadius: '20px', border: '1px solid #222', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>@{need.username}</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>⏳ {need.price || "1"} H</span>
                  {Number(context?.user?.fid) === Number(need.fid) && (
                    <button 
                      onClick={() => handleDeleteNeed(need.uuid || need.id)} 
                      style={{ background: '#ff4444', border: 'none', color: '#fff', fontSize: '0.65rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ccc' }}>{need.text}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: '0.7rem', color: '#666' }}>📍 {need.location}</span>
                 <button onClick={() => sdk.actions.viewProfile({ fid: Number(need.fid) })} style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>VIEW PROFILE</button>
              </div>
            </div>
          );
        }) : (
          <p style={{ textAlign: 'center', color: '#666' }}>No needs found.</p>
        )}
      </div>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 3000 }}>
          {status}
        </div>
      )}
    </div>
  );
}