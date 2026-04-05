"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useReadContract, useAccount, useConnect } from 'wagmi';
import { useSendCalls } from 'wagmi/experimental'; 
import { formatUnits, encodeFunctionData, parseUnits } from 'viem';

// --- CONFIGURATION ---
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }
] as const;

// --- SHARED COMPONENTS ---
const MenuGrid = ({ onItemClick }: { onItemClick: (type: string) => void }) => {
  const menuItems = [
    { id: 'needs', label: 'Needs', color: '#2563eb' },
    { id: 'offers', label: 'Offers', color: '#2563eb' },
    { id: 'active members', label: 'Active Members', color: '#2563eb' },
    { id: 'communities', label: 'Communities', color: '#2563eb' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '20px 0' }}>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick(item.id)}
          style={{
            padding: '15px', borderRadius: '16px', background: '#111',
            border: `1px solid ${item.color}44`, color: item.color,
            fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

const AboutContent = ({ isConnected, onClose }: { isConnected: boolean, onClose?: () => void }) => (
  <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', maxWidth: '400px', width: '100%', textAlign: 'left' }}>
    <h2 style={{ marginTop: 0, color: '#fff' }}>Welcome to Houra</h2>
    <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
      Houra is a peer-to-peer <strong>Time Economy</strong> platform where you exchange skills for tokens.
    </p>
    <div style={{ margin: '20px 0', fontSize: '0.85rem', color: '#eee', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p>📍 <strong>Profile:</strong> Set your location and skills.</p>
      <p>⏳ <strong>Earn:</strong> Help others and collect Houra tokens.</p>
      <p>🛠️ <strong>Post:</strong> Share your needs and reward others.</p>
    </div>
    <hr style={{ borderColor: '#222' }} />
    {!isConnected && (
      <div style={{ margin: '15px 0', fontSize: '0.8rem', color: '#888' }}>
        <p>1. Create your Base App wallet.</p>
        <p>2. Register by saving your profile.</p>
      </div>
    )}
    {isConnected && onClose && (
      <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer' }}>
        Got it!
      </button>
    )}
  </div>
);

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { address: currentAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [offerQuery, setOfferQuery] = useState("");
  const [offerResults, setOfferResults] = useState<any[]>([]);
  const [searchOfferResults, setSearchOfferResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [needLocation, setNeedLocation] = useState("");
  const [needText, setNeedText] = useState("");
  const [needPrice, setNeedPrice] = useState("1");
  const [needs, setNeeds] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  const fetchAllData = useCallback(async () => {
    try {
      const [resNeeds, resProfiles] = await Promise.all([
        fetch('/api/needs').then(r => r.json()),
        fetch('/api/profile').then(r => r.json())
      ]);
      setNeeds(resNeeds.needs || []);
      setOfferResults(resProfiles.profiles || []);

      if (currentAddress) {
        const resUser = await fetch(`/api/profile?address=${currentAddress.toLowerCase()}`).then(r => r.json());
        if (resUser?.profile) {
          setLocation(resUser.profile.city || "");
          setOffer(resUser.profile.talents || "");
          setNickname(resUser.profile.nick || "");
        }
      }
    } catch (e) { console.error("Data fetch error", e); }
  }, [currentAddress]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/members').then(r => r.json());
      setLeaderboard(res || []);
    } catch (e) { console.error("Leaderboard error", e); }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
if (isMounted && !isConnected && !isConnecting) {
    // Base/Coinbase Smart Wallet konektörünü bul
    const baseConnector = connectors.find((c) => c.id === 'coinbaseWalletSDK' || c.id === 'baseAccount');
    
    if (baseConnector) {
      setIsConnecting(true);
      connect(
        { connector: baseConnector },
        {
          onSettled: () => setIsConnecting(false),
          onError: (error) => {
            console.error("Auto-connect error:", error);
            setIsConnecting(false);
          }
        }
      );
    }
  }
}, [isMounted, isConnected, isConnecting, connectors, connect]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const filtered = offerResults.filter((u: any) => (u.nick || "").toLowerCase().includes(searchQuery.toLowerCase()));
    setSearchResults(filtered);
  }, [searchQuery, offerResults]);

  useEffect(() => {
    if (!offerQuery.trim()) { setSearchOfferResults([]); return; }
    const term = offerQuery.toLowerCase();
    const filtered = offerResults.filter((u: any) => 
      (u.nick || "").toLowerCase().includes(term) || 
      (u.city || "").toLowerCase().includes(term) || 
      (u.talents || "").toLowerCase().includes(term)
    );
    setSearchOfferResults(filtered);
  }, [offerQuery, offerResults]);

  const handleSaveProfile = async () => {
    if (!currentAddress) return;
    setStatus("Saving...");
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentAddress.toLowerCase(), nick: nickname, city: location, talents: offer })
      });
      if (res.ok) { setStatus("Profile Updated! ✅"); setTimeout(() => setStatus(""), 2000); }
    } catch (e) { setStatus("Error saving profile"); }
  };

  const handlePostNeed = async () => {
    if (!currentAddress || !needText) return;
    setStatus("Posting...");
    try {
      const res = await fetch('/api/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentAddress.toLowerCase(), location: needLocation, text: needText, price: needPrice })
      });
      if (res.ok) { setStatus("Need Posted! 🚀"); setNeedText(""); fetchAllData(); setTimeout(() => setStatus(""), 2000); }
    } catch (e) { setStatus("Error posting need"); }
  };

  const handleTransfer = useCallback(async () => {
    if (!selectedRecipient?.wallet_address) return;
    sendCalls({
      calls: [{
        to: HOURA_TOKEN_ADDRESS as `0x${string}`,
        data: encodeFunctionData({ abi: TOKEN_ABI, functionName: 'transfer', args: [selectedRecipient.wallet_address as `0x${string}`, parseUnits(sendAmount, 18)] }),
        value: 0n,
      }],
      capabilities: { paymasterService: { url: process.env.NEXT_PUBLIC_PAYMASTER_URL } },
    }, {
      onSuccess: () => { setStatus("Success! ✅"); setSelectedRecipient(null); setTimeout(() => { setStatus(""); refetchBalance(); }, 3000); }
    });
  }, [sendCalls, refetchBalance, selectedRecipient, sendAmount]);

  if (!isMounted) return null;

  if (!isConnected) {
return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <AboutContent isConnected={false} />
      <button 
        disabled={isConnecting}
        onClick={() => {
          const c = connectors.find(c => c.id === 'coinbaseWalletSDK' || c.id === 'baseAccount') || connectors[0];
          if (c) connect({ connector: c });
        }}
        style={{ 
          marginTop: '20px', 
          padding: '15px 30px', 
          background: isConnecting ? '#333' : '#fff', 
          color: isConnecting ? '#888' : '#000', 
          borderRadius: '12px', 
          fontWeight: 'bold', 
          border: 'none', 
          cursor: isConnecting ? 'not-allowed' : 'pointer', 
          width: '100%', 
          maxWidth: '400px' 
        }}
      >
        {isConnecting ? "Connecting to Base..." : "Connect Wallet"}
      </button>
    </div>
  );
}
  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Houra</h1>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: '#222', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>i</button>
      </div>

      {isAboutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <AboutContent isConnected={true} onClose={() => setIsAboutOpen(false)} />
        </div>
      )}

      {/* 1. SEND PANEL */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <div style={{ position: 'relative' }}>
            <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }} />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', borderRadius: '12px', marginTop: '5px', zIndex: 100, border: '1px solid #333' }}>
                {searchResults.map(u => (
                  <div key={u.wallet_address} onClick={() => { setSelectedRecipient(u); setSearchQuery(""); }} style={{ padding: '12px', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                    {u.nick || u.wallet_address.slice(0,6)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '10px 15px', borderRadius: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>{selectedRecipient.nick || "Selected User"}</span>
            <button onClick={() => setSelectedRecipient(null)} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '0.8rem', textDecoration: 'underline' }}>Change</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
          <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ width: '50%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', outline: 'none' }} />
          <span style={{ fontSize: '0.8rem' }}>Balance: {formattedBalance}</span>
        </div>
        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px', cursor: 'pointer' }}>SEND HOURA</button>
      </div>

      <MenuGrid onItemClick={(type) => { 
        setActiveModal(type); 
        if(type === 'active members') fetchLeaderboard();
        if(type === 'needs' || type === 'offers') fetchAllData();
      }} />

      {/* 2. SEARCH FOR OFFERS */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Search for Offers</h3>
        <input placeholder="Search skill, city, or user..." value={offerQuery} onChange={(e) => setOfferQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#111', border: '1px solid #333', color: '#fff' }} />
        {searchOfferResults.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {searchOfferResults.map(u => (
              <div key={u.wallet_address} style={{ padding: '12px', background: '#111', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{u.nick || "User"}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>📍 {u.city || "Global"}</p>
                </div>
                <button onClick={() => setSelectedMember(u)} style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(37, 99, 235, 0.1)', color: '#3b82f6', fontSize: '0.7rem', border: '1px solid #3b82f6' }}>VIEW PROFILE</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. PROFILE SETTINGS */}
      <details style={{ background: '#111', padding: '15px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>⚙️ Profile Settings</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <input placeholder="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff' }} />
          <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff' }} />
          <textarea placeholder="What do you offer?" value={offer} onChange={(e) => setOffer(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff', height: '60px' }} />
          <button onClick={handleSaveProfile} style={{ padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>SAVE PROFILE</button>
        </div>
      </details>

      {/* 4. POST A NEED */}
      <details style={{ background: '#111', padding: '15px', borderRadius: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }}>➕ Post a Need</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <input placeholder="Location" value={needLocation} onChange={(e) => setNeedLocation(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff' }} />
          <textarea placeholder="Describe your need..." value={needText} onChange={(e) => setNeedText(e.target.value)} style={{ padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff', height: '60px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem' }}>Reward:</span>
            <input type="number" value={needPrice} onChange={(e) => setNeedPrice(e.target.value)} style={{ width: '60px', padding: '8px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
            <span style={{ fontSize: '0.8rem' }}>Houra</span>
          </div>
          <button onClick={handlePostNeed} style={{ padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>POST NEED</button>
        </div>
      </details>

      {/* MODALS */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', width: '100%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#666', fontSize: '1.2rem' }}>✕</button>
            <h3 style={{ marginTop: 0, color: '#2563eb', textTransform: 'capitalize' }}>{activeModal}</h3>
            
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeModal === 'needs' && needs.map((n: any, i) => (
                <div key={i} style={{ padding: '16px', background: '#000', borderRadius: '20px', border: '1px solid #222' }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{n.username || "Anonymous"}</p>
                  <p style={{ fontSize: '0.85rem', color: '#ccc' }}>{n.text}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.7rem', color: '#666' }}>
                    <span>📍 {n.location}</span>
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>⏳ {n.price} Houra</span>
                  </div>
                </div>
              ))}

              {activeModal === 'active members' && leaderboard.map((m: any, i) => (
                <div key={i} style={{ padding: '12px', background: '#000', borderRadius: '12px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                  <span>#{i+1} {m.profiles?.nick || m.wallet_address.slice(0,6)}</span>
                  <span style={{ fontSize: '0.7rem', color: '#666' }}>{m.tx_count} exchanges</span>
                </div>
              ))}

              {activeModal === 'communities' && (
                <a href="https://chat.whatsapp.com/JscmUTY4n83AzalcQrXcEg" target="_blank" style={{ padding: '15px', background: '#000', borderRadius: '12px', color: '#fff', textAlign: 'center', display: 'block', fontWeight: 'bold', border: '1px solid #222' }}>
                  Join WhatsApp Group
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '28px', padding: '30px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ margin: 0 }}>{selectedMember.nick || "Member"}</h2>
            <p style={{ color: '#2563eb' }}>📍 {selectedMember.city || "Global"}</p>
            <div style={{ background: '#000', padding: '15px', borderRadius: '15px', margin: '20px 0', textAlign: 'left' }}>
              <p style={{ fontSize: '0.9rem', color: '#eee' }}>{selectedMember.talents || "No offers yet."}</p>
            </div>
            <button onClick={() => { setSelectedRecipient(selectedMember); setSelectedMember(null); }} style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#fff', color: '#000', fontWeight: 'bold', border: 'none' }}>SEND 1 HOURA</button>
            <button onClick={() => setSelectedMember(null)} style={{ marginTop: '10px', color: '#666', background: 'none', border: 'none' }}>Cancel</button>
          </div>
        </div>
      )}

      {status && <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#111', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 4000 }}>{status}</div>}
      
      <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '0.75rem', color: '#444' }}>Houra Time Economy - 2026</p>
    </div>
  );
}