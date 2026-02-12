"use client";
import { useEffect, useState, useCallback, useRef } from "react";
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
  const [city, setCity] = useState("");
  const [talents, setTalents] = useState("");
  const [status, setStatus] = useState("");
  
  // Transfer State
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const transferPanelRef = useRef<HTMLDivElement>(null);

  // Needs State
  const [needLocation, setNeedLocation] = useState("");
  const [needText, setNeedText] = useState("");
  const [needs, setNeeds] = useState<any[]>([]);

  const { address: currentAddress } = useAccount();
  const { sendCalls } = useSendCalls();

  // --- BAKİYE OKUMA ---
  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  // --- FETCH NEEDS ---
  const fetchNeeds = async () => {
    try {
      const res = await fetch('/api/needs');
      const data = await res.json();
      setNeeds(data.needs || []);
    } catch (e) { console.error("Needs error", e); }
  };

  // --- SDK INIT ---
  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        if (ctx?.user?.fid) {
          const res = await fetch(`/api/profile?fid=${ctx.user.fid}`);
          if (res.ok) {
            const data = await res.json();
            if (data.profile) {
              setCity(data.profile.city || "");
              setTalents(data.profile.bio || "");
            }
          }
        }
        await fetchNeeds();
        sdk.actions.ready();
        setIsSDKLoaded(true);
      } catch (e) { setIsSDKLoaded(true); }
    };
    init();
  }, []);

  // --- İHTİYAÇ EKLEME ---
  const handleAddNeed = async () => {
    if (!needText) return setStatus("Please write your need.");
    setStatus("Posting...");
    try {
      // Not: API'de wallet_address'e de ihtiyacımız var ki başkaları gönderebilsin
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context.user.fid,
          username: context.user.username,
          location: needLocation,
          text: needText,
          wallet_address: currentAddress // Alıcı adresi buraya kaydediyoruz
        }),
      });
      if (res.ok) {
        setStatus("Need posted! ✅");
        setNeedText("");
        setNeedLocation("");
        fetchNeeds();
        setTimeout(() => setStatus(""), 2000);
      }
    } catch (e) { setStatus("Error posting need."); }
  };

  // --- AUTO-FILL RECIPIENT ---
  const selectRecipientFromNeed = (need: any) => {
    setSelectedRecipient({
      username: need.username,
      wallet_address: need.wallet_address
    });
    // Paneli görünür yapmak için yukarı kaydır
    transferPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
    setStatus(`Recipient: @${need.username} selected.`);
    setTimeout(() => setStatus(""), 2000);
  };

  // --- TRANSFER ---
  const handleTransfer = useCallback(async () => {
    if (!selectedRecipient?.wallet_address) return setStatus("Select a recipient.");
    try {
      setStatus(`Processing...`);
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
        },
        onError: () => setStatus("Rejected.")
      });
    } catch (e) { setStatus("Error."); }
  }, [sendCalls, refetchBalance, selectedRecipient, sendAmount]);

  // Arama debouncing
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

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      
      {/* --- ANA TRANSFER PANELİ --- */}
      <div ref={transferPanelRef} style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.8, display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
          {!selectedRecipient ? (
            <div style={{ position: 'relative' }}>
              <input 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }}
              />
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', borderRadius: '12px', marginTop: '5px', border: '1px solid #333', maxHeight: '150px', overflowY: 'auto', zIndex: 100 }}>
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
              <button onClick={() => setSelectedRecipient(null)} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8rem' }}>Change</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ width: '50%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', outline: 'none' }} />
          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Balance: {formattedBalance}</span>
        </div>

        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '15px', cursor: 'pointer' }}>
          SEND {sendAmount} HOURA
        </button>
      </div>

      {/* --- ADD YOUR NEED --- */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '30px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>➕ Add Your Need</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />
            <button onClick={() => setNeedLocation("Online")} style={{ padding: '0 15px', background: '#2563eb', color: '#fff', borderRadius: '10px', border: 'none', fontSize: '0.8rem' }}>Online</button>
          </div>
          <textarea placeholder="Tell us what you need..." value={needText} onChange={(e) => setNeedText(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '80px', resize: 'none' }} />
          <button onClick={handleAddNeed} style={{ padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>POST NEED</button>
        </div>
      </details>

      {/* --- NEEDS MARKETPLACE --- */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', paddingLeft: '5px' }}>Marketplace</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '120px' }}>
        {needs.map((need: any, idx: number) => (
          <div key={idx} style={{ padding: '16px', background: '#111', borderRadius: '20px', border: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>@{need.username}</span>
                <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: '#666' }}>📍 {need.location}</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#ccc', lineHeight: '1.4' }}>{need.text}</p>
            
            {/* SEND HOURA Butonu - İhtiyacı olan kişiye yönlendirir */}
            <button 
              onClick={() => selectRecipientFromNeed(need)}
              style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              SEND HOURA
            </button>
          </div>
        ))}
      </div>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 1000, boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
          {status}
        </div>
      )}
    </div>
  );
}