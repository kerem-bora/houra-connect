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
  const [isFarcaster, setIsFarcaster] = useState(false); // Yeni: Farcaster kontrolü
  const [context, setContext] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [offer, setOffer] = useState("");
  const [status, setStatus] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false); 
  
  // States... (Diğer state'ler aynı)
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
        console.log("Not in Farcaster context");
        // Web'den girenler için ihtiyaçları yine de çekelim ki liste dolsun
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

  // Modal Render Yardımcısı (Kod tekrarını önlemek için)
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
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
            🚀 Open Houra in Farcaster (Warpcast) to start trading time!
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

  // --- LANDING PAGE (Dış Dünya Modu) ---
  if (!isFarcaster) {
    return (
      <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/houra-logo.png" alt="Houra" style={{ width: '80px', height: '80px', marginBottom: '20px' }} />
        <AboutContent />
        <p style={{ marginTop: '30px', fontSize: '0.75rem', color: '#444' }}>Houra Time Economy © 2026</p>
      </div>
    );
  }

  // --- APP PAGE (Farcaster İçi Modu) ---
  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/houra-logo.png" alt="Houra" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Houra</h1>
        </div>
        <button 
          onClick={() => setIsAboutOpen(true)}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontStyle: 'italic', fontFamily: 'serif', fontSize: '1.1rem' }}
        >
          i
        </button>
      </div>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '25px', marginLeft: '52px' }}>Time Economy</p>

      {/* ABOUT MODAL (Only for Farcaster users) */}
      {isAboutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <AboutContent />
        </div>
      )}
      
      {/* ... REST OF THE APP (Send, Search, Needs - Aynen devam ediyor) ... */}
      {/* 1. SEND PANEL */}
      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)', marginBottom: '20px' }}>
         {/* ... (Send Panel İçeriği) ... */}
         <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SEND HOURA TO:</label>
         {/* (Kısaltmak için burayı geçiyorum, mevcut kodun aynısı gelecek) */}
      </div>

      {/* ... (Search for Offers, Add Need, Profile Settings, Latest Needs - Mevcut kodların aynısı) ... */}
      {/* Not: En alttaki Latest Needs kısmına kadar her şey aynı kalacak */}
      
      <div style={{ paddingBottom: '100px' }}>
        {/* Latest Needs listesi burada listelenmeye devam eder */}
      </div>

      {status && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#000', border: '1px solid #2563eb', borderRadius: '15px', textAlign: 'center', zIndex: 1000 }}>
          {status}
        </div>
      )}
    </div>
  );
}