'use client';

import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getProfileByWallet, updateProfile, type Profile } from '@/lib/supabase';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet'>('profile');
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [tipAmounts, setTipAmounts] = useState([5, 10, 25]);
  const [payoutAddress, setPayoutAddress] = useState('');

  useEffect(() => {
    async function loadProfile() {
      if (isConnected && address) {
        const p = await getProfileByWallet(address);
        if (p) {
          setProfile(p);
          setDisplayName(p.display_name);
          setBio(p.bio);
          setAvatarUrl(p.avatar_url);
          setTwitterUrl(p.twitter_url);
          setTipAmounts(p.tip_amounts.length > 0 ? p.tip_amounts : [5, 10, 25]);
          setPayoutAddress(p.payout_address || p.wallet_address);
        } else {
          router.push('/create');
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [isConnected, address, router]);

  const handleSave = async () => {
    if (!address) return;
    
    setSaving(true);
    setSaved(false);
    
    const updated = await updateProfile(address, {
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
      twitter_url: twitterUrl,
      tip_amounts: tipAmounts.filter(a => a > 0),
      payout_address: payoutAddress || address,
    });
    
    if (updated) {
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleTipAmountChange = (index: number, value: string) => {
    const num = parseInt(value) || 0;
    const newAmounts = [...tipAmounts];
    newAmounts[index] = num;
    setTipAmounts(newAmounts);
  };

  const copyLink = () => {
    if (profile) {
      navigator.clipboard.writeText(`${window.location.origin}/${profile.username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  if (!isConnected) {
    return (
      <main className={styles.main}>
        <div className={styles.connectCard}>
          <div className={styles.connectIcon}>🔐</div>
          <h1>Connect Your Wallet</h1>
          <p>Connect your wallet to access your dashboard.</p>
          <div className={styles.connectWrapper}>
            <ConnectButton />
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your profile...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/" className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            CryptoBio
          </a>
        </div>
        <div className={styles.headerRight}>
          <a 
            href={`/${profile.username}`} 
            target="_blank" 
            className={styles.viewPageBtn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            View Page
          </a>
          <button className={styles.disconnectBtn} onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      </header>

      <div className={styles.container}>
        {/* Link Card */}
        <div className={styles.linkCard}>
          <div className={styles.linkContent}>
            <span className={styles.linkLabel}>Your payment link</span>
            <div className={styles.linkUrl}>
              <span className={styles.linkDomain}>{typeof window !== 'undefined' ? window.location.host : ''}/</span>
              <span className={styles.linkUsername}>{profile.username}</span>
            </div>
          </div>
          <button 
            className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} 
            onClick={copyLink}
          >
            {copied ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Preview */}
          <div className={styles.previewSection}>
            <h2 className={styles.sectionTitle}>Preview</h2>
            <div className={styles.previewCard}>
              <div className={styles.previewPhone}>
                <div className={styles.phoneNotch}></div>
                <div className={styles.phoneContent}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className={styles.previewAvatar} />
                  ) : (
                    <div className={styles.previewAvatarPlaceholder}>
                      {(displayName || profile.username)[0]?.toUpperCase()}
                    </div>
                  )}
                  <h3 className={styles.previewName}>{displayName || profile.username}</h3>
                  <p className={styles.previewBio}>{bio || 'No bio yet'}</p>
                  <div className={styles.previewButtons}>
                    {tipAmounts.filter(a => a > 0).map((amount, i) => (
                      <button key={i} className={styles.previewBtn}>
                        {i === 0 ? '☕' : i === 1 ? '🍕' : '🚀'} ${amount} USDC
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className={styles.editSection}>
            {/* Tabs */}
            <div className={styles.tabs}>
              <button 
                className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'wallet' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('wallet')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Payout Wallet
              </button>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className={styles.tabContent}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={styles.input}
                    placeholder="Your name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={styles.textarea}
                    rows={3}
                    placeholder="Tell your fans about yourself..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Avatar URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className={styles.input}
                    placeholder="https://example.com/your-photo.jpg"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Twitter/X Link</label>
                  <input
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    className={styles.input}
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Tip Amounts (USDC)</label>
                  <div className={styles.tipRow}>
                    {tipAmounts.map((amount, index) => (
                      <div key={index} className={styles.tipInput}>
                        <span className={styles.tipEmoji}>
                          {index === 0 ? '☕' : index === 1 ? '🍕' : '🚀'}
                        </span>
                        <span className={styles.tipDollar}>$</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => handleTipAmountChange(index, e.target.value)}
                          min="1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <div className={styles.tabContent}>
                <div className={styles.walletInfo}>
                  <div className={styles.walletIcon}>💰</div>
                  <h3>Where should tips go?</h3>
                  <p>Set the wallet address where you want to receive your tips. By default, it's your connected wallet.</p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Payout Wallet Address</label>
                  <input
                    type="text"
                    value={payoutAddress}
                    onChange={(e) => setPayoutAddress(e.target.value)}
                    className={`${styles.input} ${styles.walletInput} ${payoutAddress && !isValidAddress(payoutAddress) ? styles.inputError : ''}`}
                    placeholder="0x..."
                  />
                  {payoutAddress && !isValidAddress(payoutAddress) && (
                    <span className={styles.errorText}>Please enter a valid wallet address</span>
                  )}
                </div>

                <div className={styles.walletNote}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span>Tips are sent as USDC on the Base network. Make sure your wallet supports Base!</span>
                </div>

                <div className={styles.currentWallet}>
                  <span className={styles.currentLabel}>Connected wallet:</span>
                  <span className={styles.currentAddress}>{address}</span>
                  <button 
                    className={styles.useCurrentBtn}
                    onClick={() => setPayoutAddress(address || '')}
                  >
                    Use this
                  </button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button 
              className={`${styles.saveBtn} ${saved ? styles.savedBtn : ''}`}
              onClick={handleSave}
              disabled={saving || (payoutAddress && !isValidAddress(payoutAddress))}
            >
              {saving ? (
                <>
                  <div className={styles.btnSpinner}></div>
                  Saving...
                </>
              ) : saved ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
