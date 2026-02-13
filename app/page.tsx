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
  const [status, setStatus] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false); 

  // Profile States
  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");

  // Transfer & Search States
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

  // Discovery & Needs States
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
      setNeeds(needsData.needs || []);
    } catch (e) { console.error("Init Error:", e); }
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
      } finally { setIsSDKLoaded(true); }
    };
    init();
  }, [fetchAllData]);

  // Global Search
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

  // Offer Search
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
    if (!needText) return setStatus("Please describe your need.");
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
        setStatus(data.error || "Failed to post");
        setTimeout(() => setStatus(""), 3000);
      }
    } catch (e) { setStatus("Server Error"); }
  };

  const handleDeleteNeed = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/needs?id=${id}&fid=${context.user.fid}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setStatus("Deleted! 🗑️");
        setNeeds(prev => prev.filter(n => n.id !== id));
        setTimeout(() => setStatus(""), 2000);
      } else {
        setStatus(data.error);
        setTimeout(() => setStatus(""), 3000);
      }
    } catch (e) { setStatus("Delete Error"); }
  };

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px', height: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>i</button>
      </div>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '25px', marginLeft: '52px' }}>Time Economy</p>

      {/* SEND PANEL */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px', boxSizing: 'border-box' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <div style={{ position: 'relative' }}>
            <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '105%', left: 0, right: 0, background: '#111', borderRadius: '12px', zIndex: 100, border: '1px solid #333', maxHeight: '150px', overflowY: 'auto' }}>
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
          <span style={{ fontSize: '0.8rem' }}>Bal: {formattedBalance}</span>
        </div>
        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px' }}>SEND {sendAmount} HOURA</button>
      </div>

      {/* DISCOVER OFFERS */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Discover Offers</h3>
        <div style={{ position: 'relative' }}>
          <input placeholder="Search skills, location..." value={offerQuery} onChange={(e) => setOfferQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#111', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }} />
          {offerResults.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {offerResults.map(user => (
                <div key={user.fid} style={{ padding: '12px', background: '#111', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                  <div style={{ flex: 1, overflow: 'hidden', marginRight: '10px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>@{user.username}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {user.city || "Global"} • {user.bio || "No offer"}</p>
                  </div>
                  <button onClick={() => sdk.actions.viewProfile({ fid: Number(user.fid) })} style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>VIEW</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POST A NEED */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>➕ Post a Need</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', minWidth: 0 }} />
            <button onClick={() => setNeedLocation("Online")} style={{ padding: '0 15px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '10px', fontSize: '0.8rem' }}>Online</button>
          </div>
          <textarea placeholder="What do you need?" value={needText} onChange={(e) => setNeedText(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px', width: '100%', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Reward:</label>
             <input type="number" value={needPrice} onChange={(e) => setNeedPrice(e.target.value)} style={{ width: '80px', padding: '8px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
             <span style={{ fontSize: '0.8rem' }}>Houra</span>
          </div>
          <button onClick={handleAddNeed} style={{ padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>POST NEED</button>
        </div>
      </details>

      {/* COMMUNITY NEEDS FEED */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Community Needs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' }}>
        {needs.map((need: any) => (
          <div key={need.id} style={{ padding: '16px', background: '#111', borderRadius: '20px', border: '1px solid #222', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>@{need.username || "anon"}</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>⏳ {need.price || "1"} H</span>
                {context?.user?.fid === need.fid && (
                  <button onClick={() => handleDeleteNeed(need.id)} style={{ background: '#ff4444', border: 'none', color: '#fff', fontSize: '0.65rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                )}
              </div>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ccc', wordWrap: 'break-word' }}>{need.text}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.7rem', color: '#666' }}>📍 {need.location}</span>
               <button onClick={() => sdk.actions.viewProfile({ fid: Number(need.fid) })} style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>VIEW PROFILE</button>
            </div>
          </div>
        ))}
      </div>

      {/* STATUS TOAST */}
      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', padding: '15px', background: '#111', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 3000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          {status}
        </div>
      )}
    </div>
  );
}
