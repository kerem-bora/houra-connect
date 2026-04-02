"use client";

import { useEffect, useState, useCallback } from "react";
import { useReadContract, useAccount, useConnect } from 'wagmi';
import { useSendCalls } from 'wagmi/experimental'; 
import { formatUnits, encodeFunctionData, parseUnits } from 'viem';

const HOURA_TOKEN_ADDRESS = "0x463eF2dA068790785007571915419695D9BDE7C6"; 
const TOKEN_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }
] as const;

const AboutContent = ({ isConnected, onClose }: { isConnected: boolean, onClose?: () => void }) => (
  <div style={{ background: '#111', border: '1px solid #333', borderRadius: '24px', padding: '25px', maxWidth: '400px', width: '100%', textAlign: 'left' }}>
    <h2 style={{ marginTop: 0, color: '#fff' }}>Welcome to Houra</h2>
    <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
      Houra is a peer-to-peer <strong>Time Economy</strong> platform.
    </p>
    <div style={{ margin: '20px 0', fontSize: '0.85rem', color: '#eee', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p>📍 <strong>Profile:</strong> Set your location and skills.</p>
      <p>⏳ <strong>Earn:</strong> Help others and collect tokens.</p>
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
  const { address: currentAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [sendAmount, setSendAmount] = useState("1");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: HOURA_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: currentAddress ? [currentAddress] : undefined,
  });

  const formattedBalance = rawBalance !== undefined 
    ? Number(formatUnits(rawBalance as bigint, 18)).toLocaleString() 
    : "0";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isConnected && connectors.length > 0) {
      const baseConnector = connectors.find((c) => c.id === 'baseAccount');
      if (baseConnector) connect({ connector: baseConnector });
    }
  }, [isMounted, isConnected, connectors, connect]);

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
      onSuccess: () => {
        setStatus("Success! ✅");
        setTimeout(() => { setStatus(""); refetchBalance(); }, 3000);
      }
    });
  }, [sendCalls, refetchBalance, selectedRecipient, sendAmount]);

  if (!isMounted) return null;

  if (!isConnected) {
    return (
      <main style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <AboutContent isConnected={false} />
        <button 
          onClick={() => {
            const c = connectors.find(c => c.id === 'baseAccount' || c.type === 'coinbaseWallet') || connectors[0];
            if (c) connect({ connector: c });
          }}
          style={{ marginTop: '20px', padding: '15px 30px', background: '#fff', color: '#000', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          Enter Houra
        </button>
      </main>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Houra</h1>
        <button onClick={() => setIsAboutOpen(true)} style={{ background: '#222', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>i</button>
      </div>

      {isAboutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AboutContent isConnected={true} onClose={() => setIsAboutOpen(false)} />
        </div>
      )}

      <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)' }}>
        <p style={{ fontSize: '0.8rem' }}>Balance: {formattedBalance} HOURA</p>
        <button onClick={handleTransfer} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: '#fff', color: '#000', fontWeight: 'bold', border: 'none', marginTop: '10px', cursor: 'pointer' }}>SEND</button>
      </div>

      {status && <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', padding: '15px', background: '#111', border: '1px solid #3b82f6', borderRadius: '15px', textAlign: 'center' }}>{status}</div>}
      
      <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '0.75rem', color: '#444' }}>Houra Time Economy - 2026</p>
    </div>
  );
}