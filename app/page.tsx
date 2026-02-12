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
  const [city, setCity] = useState("");
  const [talents, setTalents] = useState("");
  const [status, setStatus] = useState("");
  
  // Gönderim State'leri
  const [sendAmount, setSendAmount] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

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

  // --- SDK & PROFİL ---
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
        sdk.actions.ready();
        setIsSDKLoaded(true);
      } catch (e) { setIsSDKLoaded(true); }
    };
    init();
  }, []);

  // --- ARAMA (Sadece Houra Kayıtlı Kullanıcılar) ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 1) {
        const res = await fetch(`/api/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- TRANSFER ---
  const handleTransfer = useCallback(async () => {
    if (!selectedRecipient?.wallet_address) {
      setStatus("Please select a recipient from search results.");
      return;
    }
    try {
      setStatus(`Sending ${sendAmount} Houra to @${selectedRecipient.username}...`);
      const parsedAmount = parseUnits(sendAmount, 18); 

      sendCalls({
        calls: [{
          to: HOURA_TOKEN_ADDRESS as `0x${string}`,
          data: encodeFunctionData({
            abi: TOKEN_ABI,
            functionName: 'transfer',
            args: [selectedRecipient.wallet_address as `0x${string}`, parsedAmount],
          }),
          value: 0n,
        }],
      }, {
        onSuccess: () => {
          setStatus("Transfer Successful! ✅");
          setSelectedRecipient(null);
          setSearchQuery("");
          setTimeout(() => { setStatus(""); refetchBalance(); }, 3000);
        },
        onError: () => setStatus("Transaction failed.")
      });
    } catch (e) { setStatus("Check amount and try again."); }
  }, [sendCalls, refetchBalance, selectedRecipient, sendAmount]);

  if (!isSDKLoaded) return <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Houra</h1>
      <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '20px' }}>Time Economy</p>
      
      {/* --- GÖNDERİM PANELİ --- */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        
        {/* Recipient Search / Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.8, display: 'block', marginBottom: '8px' }}>RECIPIENT</label>
          {!selectedRecipient ? (
            <div style={{ position: 'relative' }}>
              <input 
                placeholder="Search Houra users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }}
              />
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', borderRadius: '12px', marginTop: '5px', zIndex: 10, border: '1px solid #333', maxHeight: '200px', overflowY: 'auto' }}>
                  {searchResults.map(user => (
                    <div key={user.fid} onClick={() => { setSelectedRecipient(user); setSearchResults([]); setSearchQuery(""); }} style={{ padding: '12px', borderBottom: '1px solid #222', cursor: 'pointer' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>@{user.username}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>{user.city || "Global"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '10px 15px', borderRadius: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>@{selectedRecipient.username}</span>
              <button onClick={() => setSelectedRecipient(null)} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.8, display: 'block', marginBottom: '5px' }}>AMOUNT (Houra)</label>
            <input 
              type="number" 
              value={sendAmount} 
              onChange={(e) => setSendAmount(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', fontWeight: 'bold', outline: 'none', padding: 0 }}
            />
          </div>
          <span style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '5px' }}>Bal: <b>{formattedBalance}</b></span>
        </div>

        {/* Quick Amounts */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {["0.5", "1", "2"].map(amt => (
            <button key={amt} onClick={() => setSendAmount(amt)} style={{ flex: 1, padding: '8px', borderRadius: '10px', background: sendAmount === amt ? '#fff' : 'rgba(255,255,255,0.15)', color: sendAmount === amt ? '#000' : '#fff', border: 'none', fontWeight: 'bold' }}>{amt}</button>
          ))}
        </div>

        {/* Action Button */}
        <button 
          onClick={handleTransfer}
          disabled={!selectedRecipient}
          style={{ width: '100%', padding: '16px', borderRadius: '16px', background: selectedRecipient ? '#fff' : 'rgba(255,255,255,0.3)', color: '#000', fontWeight: 'bold', fontSize: '1rem', border: 'none', cursor: selectedRecipient ? 'pointer' : 'not-allowed' }}
        >
          {selectedRecipient ? `SEND ${sendAmount} HOURA` : "SELECT RECIPIENT"}
        </button>
      </div>

      {/* --- PROFİL EDİT --- */}
      <details style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af', fontSize: '0.85rem' }}>⚙️ Profile Settings</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px' }} />
          <textarea placeholder="Bio / Talents" value={talents} onChange={(e) => setTalents(e.target.value)} style={{ padding: '12px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', height: '60px', resize: 'none' }} />
          <button onClick={async () => {
            await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fid: context.user.fid, username: context.user.username, pfp: context.user.pfpUrl, city, talents, address: currentAddress }) });
            setStatus("Profile Updated! ✅");
            setTimeout(() => setStatus(""), 2000);
          }} style={{ padding: '12px', background: '#333', color: '#fff', fontWeight: 'bold', borderRadius: '10px', border: 'none' }}>UPDATE PROFILE</button>
        </div>
      </details>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', fontSize: '0.85rem', zIndex: 1000 }}>
          {status}
        </div>
      )}
    </div>
  );
}