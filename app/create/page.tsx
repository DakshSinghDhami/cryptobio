'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { checkUsernameAvailable, createProfile, getProfileByWallet } from '@/lib/supabase';
import styles from './create.module.css';

export default function CreateProfile() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [tipAmounts, setTipAmounts] = useState([5, 10, 25]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Check if user already has a profile
  useEffect(() => {
    async function check() {
      if (isConnected && address) {
        const profile = await getProfileByWallet(address);
        if (profile) {
          router.push('/dashboard');
        }
      }
    }
    check();
  }, [isConnected, address, router]);

  // Check username availability with debounce
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      const available = await checkUsernameAvailable(username);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
  };

  const handleTipAmountChange = (index: number, value: string) => {
    const num = parseInt(value) || 0;
    const newAmounts = [...tipAmounts];
    newAmounts[index] = num;
    setTipAmounts(newAmounts);
  };

  const handleCreate = async () => {
    if (!address) return;
    
    setCreating(true);
    setError('');

    try {
      const result = await createProfile({
        username,
        wallet_address: address,
        payout_address: address, // Default payout to the same wallet
        display_name: displayName || username,
        bio,
        avatar_url: avatarUrl,
        twitter_url: twitterUrl,
        tip_amounts: tipAmounts.filter(a => a > 0),
      });

      if (result.data) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to create profile. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }

    setCreating(false);
  };

  if (!isConnected) {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <h1>Connect Your Wallet</h1>
          <p>Connect your wallet to create your profile page.</p>
          <div className={styles.connectWrapper}>
            <ConnectButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {/* Progress */}
        <div className={styles.progress}>
          <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>1</div>
          <div className={styles.progressLine}></div>
          <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>2</div>
          <div className={styles.progressLine}></div>
          <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>3</div>
        </div>

        {/* Step 1: Username */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h1>Claim Your Username</h1>
            <p className={styles.subtitle}>This will be your unique profile URL</p>
            
            <div className={styles.usernameInput}>
              <span className={styles.prefix}>cryptobio.com/</span>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="yourname"
                className={styles.usernameField}
                maxLength={20}
              />
            </div>

            {usernameStatus === 'checking' && (
              <p className={styles.statusChecking}>Checking availability...</p>
            )}
            {usernameStatus === 'available' && (
              <p className={styles.statusAvailable}>✓ Username available!</p>
            )}
            {usernameStatus === 'taken' && (
              <p className={styles.statusTaken}>✗ Username already taken</p>
            )}

            <button
              className="btn btn-primary"
              onClick={() => setStep(2)}
              disabled={usernameStatus !== 'available'}
              style={{ width: '100%', marginTop: '24px' }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Profile Details */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h1>Your Profile</h1>
            <p className={styles.subtitle}>Tell your fans about yourself</p>

            <div className={styles.formGroup}>
              <label className="label">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Rivera"
                className="input"
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Crypto educator & builder 🚀"
                className="textarea"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">Avatar URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="input"
              />
              <span className={styles.hint}>Paste a link to your profile image</span>
            </div>

            <div className={styles.formGroup}>
              <label className="label">Twitter/X Link (optional)</label>
              <input
                type="url"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://twitter.com/yourhandle"
                className="input"
              />
            </div>

            <div className={styles.buttonRow}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Tip Amounts */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <h1>Set Your Tip Amounts</h1>
            <p className={styles.subtitle}>Choose preset amounts for your fans</p>

            <div className={styles.tipAmounts}>
              {tipAmounts.map((amount, index) => (
                <div key={index} className={styles.tipAmount}>
                  <span className={styles.tipLabel}>
                    {index === 0 ? '☕ Coffee' : index === 1 ? '🍕 Lunch' : '🚀 Big Tip'}
                  </span>
                  <div className={styles.tipInputWrapper}>
                    <span>$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => handleTipAmountChange(index, e.target.value)}
                      className={styles.tipInput}
                      min="1"
                    />
                    <span>USDC</span>
                  </div>
                </div>
              ))}
            </div>

            <p className={styles.feeNote}>
              💡 You receive 99% of each tip. 1% platform fee keeps us running.
            </p>

            {error && (
              <div className={styles.error}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className={styles.buttonRow}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create My Page'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
