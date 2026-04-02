"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useReadContract, useAccount, useConnect } from 'wagmi';
import { useSendCalls } from 'wagmi/experimental'; 
import { formatUnits, encodeFunctionData, parseUnits } from 'viem';

// --- CONFIG ---
const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }
] as const;

// --- COMPONENTS ---
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
      Houra is a peer-to-peer <strong>Time Economy</strong> platform where you exchange your skills for time-based tokens.
    </p>
    <div style={{ margin: '20px 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p>📍 <strong>Profile:</strong> Set your location and what you offer.</p>
      <p>⏳ <strong>Earn:</strong> Help others and collect Houra tokens.</p>
      <p>🛠️ <strong>Post:</strong> Share what you need and reward others.</p>
    </div>
    {isConnected && onClose && (
      <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer' }}>
        Got it!
      </button>
    )}
  </div>
);

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      const resNeeds = await fetch('/api/needs');
      const dataNeeds = await resNeeds.json();
      setNeeds(dataNeeds.needs || []);

      const resProfiles = await fetch('/api/profile');
      const dataProfiles = await resProfiles.json();
      setOfferResults(dataProfiles.profiles || []);

      const resLeaderboard = await fetch('/api/leaderboard');
      const dataLeaderboard = await resLeaderboard.json();
      setLeaderboard(dataLeaderboard.leaderboard || []);

      if (currentAddress) {
        const resUser = await fetch(`/api/profile?address=${currentAddress.toLowerCase()}`);
        const userData = await resUser.json();
        if (userData?.profile) {
          setLocation(userData.profile.city || "");
          setOffer(userData.profile.talents || "");
          setNickname(userData.profile.nick || "");
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [currentAddress]);

  useEffect(() => {
    setIsMounted(true);
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (isMounted && !isConnected && connectors.length > 0) {
      const baseConnector = connectors.find((c) => c.id === 'baseAccount');
      if (baseConnector) connect({ connector: baseConnector });
    }
  }, [isMounted, isConnected, connectors, connect]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const filtered = offerResults.filter((user: any) => 
      user.nick?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filtered);
  }, [searchQuery, offerResults]);

  useEffect(() => {
    if (!offerQuery.trim()) { setSearchOfferResults([]); return; }
    const filtered = offerResults.filter((user: any) => {
      const term = offerQuery.toLowerCase();
      return (user.nick?.toLowerCase().includes(term) || user.city?.toLowerCase().includes(term) || user.talents?.toLowerCase().includes(term));
    });
    setSearchOfferResults(filtered);
  }, [offerQuery, offerResults]);

  const handleSaveProfile = async () => {
    if (!currentAddress) return;
    setStatus("Saving...");
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: currentAddress.toLowerCase(),
          nick: nickname,
          city: location, 
          talents: offer 
        })
      });
      if (res.ok) {
        setStatus("Profile Updated! ✅");
        setTimeout(() => setStatus(""), 3000);
      }
    } catch (e) { setStatus("Error saving profile"); }
  };

  const handlePostNeed = async () => {
    if (!currentAddress) return;
    setStatus("Posting...");
    try {
      const res = await fetch('/api/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentAddress.toLowerCase(), city: needLocation, text: needText, price: needPrice })
      });
      if (res.ok) {
        setStatus("Need Posted! 🚀");
        setNeedText("");
        fetchAllData();
        setTimeout(() => setStatus(""), 3000);
      }
    } catch (e) { setStatus("Error posting need"); }
  };

  const handleTransfer = useCallback(async () => {
    if (!selectedRecipient?.wallet_address) return setStatus("Select recipient");
    sendCalls({
      calls: [{
        to: HOURA_TOKEN_ADDRESS as `0x${string}`,
        data: encodeFunctionData({ abi: TOKEN_ABI, functionName: 'transfer', args: [selectedRecipient.wallet_address as `0x${string}`, parseUnits(sendAmount, 18)] }),
        value: 0n,
      }],
      capabilities: { paymasterService: { url: process.env.NEXT_PUBLIC_PAYMASTER_URL } },
    }, {
      onSuccess: () => {
        setStatus("Success! ✅");
        setSelectedRecipient(null);
        setTimeout(() => { setStatus(""); refetchBalance(); }, 3000);
      }
    });
  }, [sendCalls, refetchBalance, selectedRecipient, sendAmount]);

  if (!isMounted) return null;

  if (!isConnected) {
    return (
      <main style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <img src="/houra-logo.png" alt="Houra" style={{ width: '80px', marginBottom: '20px' }} />
        <AboutContent isConnected={false} />
        <button 
          onClick={() => {
            const c = connectors.find(c => c.id === 'baseAccount' || c.type === 'coinbaseWallet') || connectors[0];
            if (c) connect({ connector: c });
          }}
          style={{ marginTop: '20px', padding: '15px 30px', background: '#fff', color: '#000', borderRadius: '12px', fontWeight: 'bold', border: 'none', width: '100%', maxWidth: '400px', cursor: 'pointer' }}
        >
          Enter Houra
        </button>
      </main>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: '#222', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>i</button>
      </div>

      {isAboutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <AboutContent isConnected={true} onClose={() => setIsAboutOpen(false)} />
        </div>
      )}

      {/* Send Panel */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
        {!selectedRecipient ? (
          <div style={{ position: 'relative' }}>
            <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }} />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', borderRadius: '12px', marginTop: '5px', zIndex: 10, border: '1px solid #333' }}>
                {searchResults.map(user => (
                  <div key={user.wallet_address} onClick={() => { setSelectedRecipient(user); setSearchQuery(""); setSearchResults([]); }} style={{ padding: '10px', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                    {user.nick || user.wallet_address.slice(0,6)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '10px 15px', borderRadius: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>{selectedRecipient.nick || "User"}</span>
            <button onClick={() => setSelectedRecipient(null)} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '0.8rem', textDecoration: 'underline' }}>Change</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
          <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} style={{ width: '50%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', outline: 'none' }} />
          <span style={{ fontSize: '0.8rem' }}>Balance: {formattedBalance}</span>
        </div>
        <button onClick={handleTransfer} disabled={!selectedRecipient} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px', cursor: 'pointer' }}>SEND HOURA</button>
      </div>

      <MenuGrid onItemClick={(type) => setActiveModal(type)} />

      {/* Profil Düzenleme */}
      <div style={{ background: '#111', padding: '20px', borderRadius: '24px', border: '1px solid #222' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Profile Settings</h3>
        <input placeholder="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '12px', background: '#000', border: '1px solid #333', color: '#fff' }} />
        <input placeholder="City" value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '12px', background: '#000', border: '1px solid #333', color: '#fff' }} />
        <textarea placeholder="Your Skills / Offers" value={offer} onChange={(e) => setOffer(e.target.value)} style={{ width: '100%', padding: '12px', height: '80px', borderRadius: '12px', background: '#000', border: '1px solid #333', color: '#fff', marginBottom: '10px' }} />
        <button onClick={handleSaveProfile} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold' }}>Save Profile</button>
      </div>

      {/* Modallar (Needs, Offers vb. için buraya içerik eklenebilir) */}
      {activeModal === 'active members' && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
          <button onClick={() => setActiveModal(null)} style={{ marginBottom: '20px', color: '#3b82f6' }}>← Back</button>
          <h2>Leaderboard</h2>
          {leaderboard.map((m, i) => (
            <div key={i} style={{ padding: '15px', borderBottom: '1px solid #222' }}>
              #{i+1} {m.profiles?.nick || m.wallet_address.slice(0,6)} - {m.tx_count} TX
            </div>
          ))}
        </div>
      )}

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#111', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 3000 }}>
          {status}
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '0.75rem', color: '#444' }}>Houra Time Economy - 2026</p>
    </div>
  );
}