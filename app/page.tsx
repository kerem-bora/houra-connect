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
  const [context, setContext] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [talents, setTalents] = useState("");
  const [status, setStatus] = useState("");
  
  // Transfer & Search State
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

  // Needs State
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

  // --- DATA FETCHING ---
  const fetchAllData = useCallback(async (fid: number) => {
    try {
      const profRes = await fetch(`/api/profile?fid=${fid}`);
      const profData = await profRes.json();
      if (profData.profile) {
        setLocation(profData.profile.city || "");
        setTalents(profData.profile.bio || "");
      }
      const needsRes = await fetch('/api/needs');
      const needsData = await needsRes.json();
      setNeeds(needsData.needs || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        if (ctx?.user?.fid) await fetchAllData(ctx.user.fid);
        sdk.actions.ready();
        setIsSDKLoaded(true);
      } catch (e) { setIsSDKLoaded(true); }
    };
    init();
  }, [fetchAllData]);

  // --- SEARCH ENGINE ---
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

  const handleTransfer = useCallback(async () => {
    if (!selectedRecipient?.wallet_address) return setStatus("Select recipient");
    try {
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
    } catch (e) { setStatus("Error"); }
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
      if (res.ok) {
        setStatus("Need posted! ✅");
        setNeedText(""); setNeedLocation("");
        const nRes = await fetch('/api/needs');
        const nData = await nRes.json();
        setNeeds(nData.needs || []);
        setTimeout(() => setStatus(""), 2000);
      }
    } catch (e) { setStatus("Error"); }
  };

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '20px' }}>Time Economy</p>
      
      {/* 1. SEND PANEL (Search & Transfer) */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <div style={{ position: 'relative' }}>
            <input 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', borderRadius: '12px', marginTop: '5px', zIndex: 100, border: '1px solid #333', maxHeight: '150px', overflowY: 'auto' }}>
                {searchResults.map(user => (
                  <div key={user.fid} onClick={() => { setSelectedRecipient(user); setSearchResults([]); setSearchQuery(""); }} style={{ padding: '12px', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>@{user.username}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '10px 15px', borderRadius: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>@{selectedRecipient.username}</span>
            <button onClick={() => setSelectedRecipient(null)} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '0.8rem', textDecoration: 'underline' }}>Change</button>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
          <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ width: '50%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', outline: 'none' }} />
          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Bal: {formattedBalance}</span>
        </div>

        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px' }}>
          SEND {sendAmount} HOURA
        </button>
      </div>

      {/* 2. ADD YOUR NEED */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>➕ Add Your Need</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />
            <button onClick={() => setNeedLocation("Online")} style={{ padding: '0 15px', background: '#2563eb', color: '#fff', borderRadius: '10px', border: 'none' }}>Online</button>
          </div>
          <textarea placeholder="What do you need?" value={needText} onChange={(e) => setNeedText(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px', resize: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Reward:</label>
             <input type="number" value={needPrice} onChange={(e) => setNeedPrice(e.target.value)} style={{ width: '80px', padding: '8px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
             <span style={{ fontSize: '0.8rem' }}>Houra</span>
          </div>
          <button onClick={handleAddNeed} style={{ padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>POST NEED</button>
        </div>
      </details>

      {/* 3. PROFILE SETTINGS */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>⚙️ Profile Settings</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />
          <textarea placeholder="Talents" value={talents} onChange={(e) => setTalents(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px', resize: 'none' }} />
          <button onClick={async () => {
            await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fid: context.user.fid, username: context.user.username, pfp: context.user.pfpUrl, city: location, talents, address: currentAddress }) });
            setStatus("Profile Saved! ✅");
            setTimeout(() => setStatus(""), 2000);
          }} style={{ padding: '12px', background: '#333', color: '#fff', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>SAVE PROFILE</button>
        </div>
      </details>

      {/* 4. LATEST NEEDS */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#fff' }}>Latest Needs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' }}>
        {needs.map((need: any, idx: number) => (
          <div key={idx} style={{ padding: '16px', background: '#111', borderRadius: '20px', border: '1px solid #222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>@{need.username}</span>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>💰 {need.price || "1"} Houra</span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4' }}>{need.text}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.7rem', color: '#666' }}>📍 {need.location}</span>
               <button onClick={() => sdk.actions.viewProfile({ fid: Number(need.fid) })} style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>VIEW PROFILE</button>
            </div>
          </div>
        ))}
      </div>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 1000 }}>
          {status}
        </div>
      )}
    </div>
  );
}