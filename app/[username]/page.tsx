'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain, useReadContract, useDisconnect } from 'wagmi';
import { parseUnits, encodeFunctionData, formatUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { getProfileByUsername, type Profile } from '@/lib/supabase';
import { USDC_ADDRESS, USDC_ABI, PLATFORM_CONFIG } from '@/lib/wagmi';
import styles from './profile.module.css';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'sending' | 'switching' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // USDC address on Base Mainnet
  const usdcAddress = USDC_ADDRESS;

  // Read user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!chainId,
    },
  });

  // Use sendTransaction for the tip
  const { sendTransaction, data: txHash, isPending, error: txError, reset: resetTx } = useSendTransaction();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    async function loadProfile() {
      const p = await getProfileByUsername(username);
      setProfile(p);
      setLoading(false);
    }
    loadProfile();
  }, [username]);

  // Handle transaction success
  useEffect(() => {
    if (isSuccess) {
      setTxStatus('success');
      setSelectedAmount(null);
      setCustomAmount('');
      setShowCustom(false);
    }
  }, [isSuccess]);

  // Handle transaction error
  useEffect(() => {
    if (txError) {
      setTxStatus('error');
      
      // Parse common errors
      const errorMsg = txError.message || 'Transaction failed';
      if (errorMsg.includes('exceeds balance')) {
        setErrorMessage('Insufficient USDC balance. Please add USDC to your wallet.');
      } else if (errorMsg.includes('user rejected')) {
        setErrorMessage('Transaction cancelled');
      } else {
        setErrorMessage(errorMsg.slice(0, 100));
      }
    }
  }, [txError]);

  const handleTip = async (amount: number) => {
    if (!profile || !isConnected || !address) {
      setErrorMessage('Please connect your wallet first');
      setTxStatus('error');
      return;
    }

    // Check if on Base Mainnet
    if (!chainId || chainId !== base.id) {
      setTxStatus('switching');
      try {
        await switchChain({ chainId: base.id });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        setErrorMessage('Please switch to Base network in your wallet');
        setTxStatus('error');
        return;
      }
    }

    // Check balance before sending
    const amountWei = parseUnits(amount.toString(), 6);
    if (usdcBalance !== undefined && usdcBalance < amountWei) {
      const currentBalance = formatUnits(usdcBalance, 6);
      setErrorMessage(`Insufficient USDC. You have $${parseFloat(currentBalance).toFixed(2)} but need $${amount}.`);
      setTxStatus('error');
      return;
    }

    setTxStatus('sending');
    setSelectedAmount(amount);
    setErrorMessage('');

    try {
      // Calculate amounts (USDC has 6 decimals)
      const feePercent = PLATFORM_CONFIG.feePercent;
      const creatorPercent = 100 - feePercent;
      const totalAmountWei = parseUnits(amount.toString(), 6);
      const creatorAmountWei = (totalAmountWei * BigInt(creatorPercent)) / BigInt(100);
      
      // Use payout_address if set, otherwise fall back to wallet_address
      const creatorPayoutAddress = (profile.payout_address || profile.wallet_address) as `0x${string}`;

      // Encode the transfer function call
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [creatorPayoutAddress, creatorAmountWei],
      });

      // Send the transaction
      sendTransaction({
        to: usdcAddress,
        data,
      });

    } catch (err) {
      setTxStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send transaction');
    }
  };

  const handleCustomTip = () => {
    const amount = parseFloat(customAmount);
    if (amount && amount > 0) {
      handleTip(amount);
    }
  };

  const resetState = () => {
    setTxStatus('idle');
    setSelectedAmount(null);
    setErrorMessage('');
    resetTx();
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.loadingRing}>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className={styles.main}>
        <div className={styles.notFound}>
          <div className={styles.notFoundIcon}>🔍</div>
          <h1>Page Not Found</h1>
          <p>This profile doesn&apos;t exist yet</p>
          <a href="/" className={styles.homeBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Go Home
          </a>
        </div>
      </main>
    );
  }

  const isProcessing = isPending || isConfirming || txStatus === 'switching';
  const tipLabels = ['Coffee', 'Lunch', 'Big Tip'];
  const tipEmojis = ['☕', '🍕', '🚀'];
  const formattedBalance = usdcBalance !== undefined ? parseFloat(formatUnits(usdcBalance, 6)).toFixed(2) : '...';

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {profile.display_name[0]?.toUpperCase()}
            </div>
          )}

          <h1 className={styles.name}>{profile.display_name}</h1>
          
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

          {/* Social Links */}
          <div className={styles.socialLinks}>
            {profile.twitter_url && (
              <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span>Support {profile.display_name.split(' ')[0]}</span>
        </div>

        {/* Tip Section */}
        <div className={styles.tipSection}>
          {!isConnected ? (
            <div className={styles.connectSection}>
              <p className={styles.connectLabel}>Connect wallet to send a tip</p>
              <div className={styles.connectWrapper}>
                <ConnectButton />
              </div>
              <p className={styles.networkNote}>Tips are sent as USDC on Base</p>
            </div>
          ) : txStatus === 'success' ? (
            <div className={styles.success}>
              <div className={styles.successAnimation}>
                <svg className={styles.checkmark} viewBox="0 0 52 52">
                  <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none"/>
                  <path className={styles.checkmarkCheck} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
              </div>
              <h3>Tip Sent! 🎉</h3>
              <p>Thank you for supporting {profile.display_name}</p>
              <button 
                className={styles.sendAnotherBtn}
                onClick={resetState}
              >
                Send Another Tip
              </button>
            </div>
          ) : (
            <>
              {/* Connected Wallet Info */}
              {isConnected && address && (
                <div className={styles.walletInfo}>
                  <div className={styles.walletDetails}>
                    <div className={styles.walletAddress}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      <span>{truncateAddress(address)}</span>
                    </div>
                    <div className={styles.walletBalance}>
                      <span>${formattedBalance}</span>
                      <span className={styles.usdcTag}>USDC</span>
                    </div>
                  </div>
                  <button 
                    className={styles.switchWalletBtn}
                    onClick={() => disconnect()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Switch
                  </button>
                </div>
              )}

              {/* Network Warning */}
              {chainId && chainId !== base.id && (
                <div className={styles.networkWarning}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>Switch to Base network to send tips</span>
                  <button onClick={() => switchChain({ chainId: base.id })}>
                    Switch
                  </button>
                </div>
              )}

              {/* Preset Amounts */}
              <div className={styles.tipButtons}>
                {profile.tip_amounts.map((amount, index) => (
                  <button
                    key={index}
                    className={`${styles.tipBtn} ${selectedAmount === amount && isProcessing ? styles.tipBtnActive : ''}`}
                    onClick={() => handleTip(amount)}
                    disabled={isProcessing}
                  >
                    <span className={styles.tipEmoji}>{tipEmojis[index]}</span>
                    <span className={styles.tipAmount}>${amount}</span>
                    <span className={styles.tipLabel}>{tipLabels[index]}</span>
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              {!showCustom ? (
                <button 
                  className={styles.customToggle}
                  onClick={() => setShowCustom(true)}
                  disabled={isProcessing}
                >
                  Or enter custom amount
                </button>
              ) : (
                <div className={styles.customInputWrapper}>
                  <div className={styles.customInput}>
                    <span className={styles.dollarSign}>$</span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0"
                      min="1"
                      step="1"
                      autoFocus
                    />
                    <span className={styles.usdcLabel}>USDC</span>
                  </div>
                  <button 
                    className={styles.sendCustomBtn}
                    onClick={handleCustomTip}
                    disabled={isProcessing || !customAmount || parseFloat(customAmount) <= 0}
                  >
                    {isProcessing ? 'Sending...' : 'Send Tip'}
                  </button>
                </div>
              )}

              {/* Status Messages */}
              {txStatus === 'switching' && (
                <div className={styles.pending}>
                  <div className={styles.pendingSpinner}></div>
                  <span>Switching to Base network...</span>
                </div>
              )}

              {isPending && (
                <div className={styles.pending}>
                  <div className={styles.pendingSpinner}></div>
                  <span>Confirm in your wallet...</span>
                </div>
              )}

              {isConfirming && (
                <div className={styles.pending}>
                  <div className={styles.pendingSpinner}></div>
                  <span>Confirming on Base...</span>
                </div>
              )}

              {txStatus === 'error' && (
                <div className={styles.error}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <span>{errorMessage || 'Transaction failed'}</span>
                  <button onClick={resetState}>Dismiss</button>
                </div>
              )}

              {/* Fee Note */}
              <p className={styles.feeNote}>
                USDC on Base • {profile.display_name.split(' ')[0]} receives 99%
              </p>
            </>
          )}
        </div>
      </div>

      {/* Powered by */}
      <a href="/" className={styles.poweredBy}>
        <span>Powered by</span>
        <strong>⚡ CryptoBio</strong>
      </a>
    </main>
  );
}
