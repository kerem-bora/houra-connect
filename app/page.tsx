"use client";
import { useEffect, useState, useCallback } from "react";
import { sdk } from "@farcaster/frame-sdk"; 
import { useReadContract, useAccount, useSignMessage } from 'wagmi'; // useSignMessage eklendi
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
  
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [offerQuery, setOfferQuery] = useState("");
  const [offerResults, setOfferResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [needLocation, setNeedLocation] = useState("");
  const [needText, setNeedText] = useState("");
  const [needPrice, setNeedPrice] = useState("1");
  const [needs, setNeeds] = useState<any[]>([]);

  const { address: currentAddress } = useAccount();
  const { sendCalls } = useSendCalls();
  const { signMessageAsync } = useSignMessage(); // İmza kancası

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  // --- 1. DATA FETCH ---
  const fetchAllData = useCallback(async (fid?: number) => {
    try {
      if (fid) {
        const profRes = await fetch(`/api/profile?fid=${fid}`);
        const profData = await profRes.json();
        if (profData.profile) {
          setLocation(profData.profile.city || "");
          setOffer(profData.profile.bio || "");
        }
      }
      const needsRes = await fetch('/api/needs');
      const needsData = await needsRes.json();
      setNeeds(needsData.needs || []);
    } catch (e) { console.error("Fetch Error:", e); }
  }, []);

  // --- 2. SDK INIT ---
  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context;
        if (ctx?.user?.fid) {
          setContext(ctx);
          setIsFarcaster(true);
          await fetchAllData(ctx.user.fid);
        } else {
          await fetchAllData();
        }
        sdk.actions.ready();
      } catch (e) {
        await fetchAllData();
      } finally {
        setIsSDKLoaded(true);
      }
    };
    init();
  }, [fetchAllData]);

  // --- 3. SEARCH LOGICS ---
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

  // --- 4. HANDLERS ---
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
    if (!context?.user?.fid) return setStatus("Farcaster login required.");
    if (!currentAddress) return setStatus("Connect wallet first.");
    
    try {
      setStatus("Signing...");
      const message = `I am posting a need on Houra: ${needText.slice(0, 30)}`;
      const signature = await signMessageAsync({ message });

      setStatus("Posting...");
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: Number(context.user.fid),
          username: context.user.username,
          location: needLocation || "Global",
          text: needText,
          wallet_address: currentAddress, 
          price: needPrice.toString(),
          signature, // İmza eklendi
          message    // Mesaj eklendi
        }),
      });
      if (res.ok) {
        setStatus("Need posted! ✅");
        setNeedText(""); setNeedLocation("");
        const nRes = await fetch('/api/needs');
        const nData = await nRes.json();
        setNeeds(nData.needs || []);
        setTimeout(() => setStatus(""), 2000);
      } else {
        const err = await res.json();
        setStatus(err.error || "Error");
      }
    } catch (e) { setStatus("Signature denied"); }
  };

  const handleSaveProfile = async () => {
    if (!context?.user?.fid) return setStatus("Login required");
    if (!currentAddress) return setStatus("Connect wallet");
    
    try {
      setStatus("Signing...");
      const message = `Update Houra Profile: ${context.user.username}`;
      const signature = await signMessageAsync({ message });

      setStatus("Saving...");
      const res = await fetch("/api/profile", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          fid: context.user.fid, 
          username: context.user.username, 
          pfp: context.user.pfpUrl, 
          city: location, 
          talents: offer, 
          address: currentAddress,
          signature, // İmza eklendi
          message    // Mesaj eklendi
        }) 
      });
      
      if (res.ok) {
        setStatus("Profile Saved! ✅");
        setTimeout(() => setStatus(""), 2000);
      } else {
        setStatus("Save failed");
      }
    } catch (e) { setStatus("Signature denied"); }
  };

const handleDeleteNeed = async (id: string) => {
  if (!id || !context?.user?.fid || !currentAddress) return;
  
  try {
    setStatus("Signing to delete...");
    // Silme işlemi için benzersiz bir mesaj oluşturuyoruz
    const message = `Delete Need ID: ${id}`;
    const signature = await signMessageAsync({ message });

    setStatus("Deleting...");
    const res = await fetch(`/api/needs?id=${id}&fid=${context.user.fid}`, { 
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signature,
        message,
        address: currentAddress
      })
    });

    if (res.ok) {
      setNeeds(prev => prev.filter(n => n.id !== id));
      setStatus("Deleted! ✅");
      setTimeout(() => setStatus(""), 2000);
    } else {
      const err = await res.json();
      setStatus(err.error || "Delete failed");
    }
  } catch (e) { 
    setStatus("Signature denied"); 
  }
};

  // --- 5. ABOUT CONTENT ---
  const AboutContent = () => (
    <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', maxWidth: '400px', width: '100%', position: 'relative', textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Welcome to Houra</h2>
      <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
        Houra is a peer-to-peer <strong>Time Economy</strong> platform where you exchange your skills for time-based tokens.
      </p>
      <div style={{ margin: '20px 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p>📍 <strong>Profile:</strong> Set your location and what you offer to the community.</p>
        <p>⏳ <strong>Earn:</strong> Help others with their needs and collect Houra tokens.</p>
        <p>🛠️ <strong>Post:</strong> Share what you need and reward those who give their time.</p>
      </div>
      
      {!isFarcaster && (
        <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid #2563eb', marginBottom: '15px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#fff' }}>
            The Houra app currently only works in the 
            <a href="https://join.base.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 'bold', marginLeft: '5px', textDecoration: 'underline' }}>
              Base app
            </a>
          </p>
        </div>
      )}

      <p style={{ fontSize: '0.8rem', color: '#666', borderTop: '1px solid #222', paddingTop: '15px' }}>
        Learn more about 
        <a href="https://en.wikipedia.org/wiki/Time-based_currency" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', marginLeft: '5px', textDecoration: 'underline' }}>
          Time-based Currencies
        </a>
      </p>
      
      {isFarcaster && (
        <button onClick={() => setIsAboutOpen(false)} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer' }}>
          Got it!
        </button>
      )}
    </div>
  );

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  if (!isFarcaster) {
    return (
      <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/houra-logo.png" alt="Houra" style={{ width: '80px', height: '80px', marginBottom: '20px' }} />
        <AboutContent />
        <p style={{ marginTop: '30px', fontSize: '0.75rem', color: '#444' }}>Houra Time Economy © 2026</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontStyle: 'italic', fontFamily: 'serif', fontSize: '1.1rem' }}>i</button>
      </div>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '25px', marginLeft: '52px' }}>Time Economy</p>

      {/* About Modal */}
      {isAboutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <AboutContent />
        </div>
      )}
      
      {/* 1. SEND PANEL */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <div style={{ position: 'relative' }}>
            <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
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
          <span style={{ fontSize: '0.8rem' }}>Bal: {formattedBalance}</span>
        </div>
        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px' }}>SEND {sendAmount} HOURA</button>
      </div>

      {/* 2. SEARCH FOR OFFERS */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: '#fff' }}>Search for Offers</h3>
        <input placeholder="Search offer, location, or user..." value={offerQuery} onChange={(e) => setOfferQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#111', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }} />
        {offerResults.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {offerResults.map(user => (
              <div key={user.fid} style={{ padding: '12px', background: '#111', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>@{user.username}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>📍 {user.city || "Global"} • {user.bio || "No offer description"}</p>
                </div>
                <button onClick={() => sdk.actions.viewProfile({ fid: Number(user.fid) })} style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>VIEW PROFILE</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. ADD YOUR NEED */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>➕ Add Your Need</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />
            <button onClick={() => setNeedLocation("Online")} style={{ padding: '0 15px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '10px', fontSize: '0.8rem' }}>Online</button>
          </div>
          <textarea placeholder="What do you need?" value={needText} onChange={(e) => setNeedText(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Reward:</label>
             <input type="number" value={needPrice} onChange={(e) => setNeedPrice(e.target.value)} style={{ width: '80px', padding: '8px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} />
             <span style={{ fontSize: '0.8rem' }}>Houra</span>
          </div>
          <button onClick={handleAddNeed} style={{ padding: '12px', background: '#fff', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>POST NEED</button>
        </div>
      </details>

      {/* 4. PROFILE SETTINGS */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>⚙️ Profile Settings</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />
          <textarea placeholder="What do you offer?" value={offer} onChange={(e) => setOffer(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px' }} />
          <button onClick={handleSaveProfile} style={{ padding: '12px', background: '#333', color: '#fff', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>SAVE PROFILE</button>
        </div>
      </details>

      {/* 5. LATEST NEEDS */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Latest Needs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' }}>
        {needs.map((need: any, idx: number) => (
          <div key={idx} style={{ padding: '16px', background: '#111', borderRadius: '20px', border: '1px solid #222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>@{need.username}</span>
              {context?.user?.fid && Number(need.fid) === Number(context.user.fid) && (
                <button onClick={() => handleDeleteNeed(need.id)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
              )}
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ccc' }}>{need.text}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                 <span style={{ fontSize: '0.7rem', color: '#666' }}>📍 {need.location}</span>
                 <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '0.8rem' }}>⏳ {need.price || "1"} Houra</span>
               </div>
               <button onClick={() => sdk.actions.viewProfile({ fid: Number(need.fid) })} style={{ color: '#2563eb', background: 'none', border: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>VIEW PROFILE</button>
            </div>
          </div>
        ))}
      </div>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 3000 }}>
          {status}
        </div>
      )}
    </div>
  );
}