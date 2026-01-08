'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getProfileByWallet } from '@/lib/supabase';
import styles from './page.module.css';

export default function Home() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (isConnected && address) {
        setChecking(true);
        const profile = await getProfileByWallet(address);
        if (profile) {
          router.push('/dashboard');
        } else {
          router.push('/create');
        }
        setChecking(false);
      }
    }
    checkProfile();
  }, [isConnected, address, router]);

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot}></span>
            Built on Base
          </div>
          
          <h1 className={styles.title}>
            Get Paid in Crypto
            <br />
            <span className={styles.gradient}>With One Link</span>
          </h1>
          
          <p className={styles.subtitle}>
            Stop pasting ugly wallet addresses in your bio. 
            Create a beautiful payment page and start receiving tips in seconds.
          </p>

          <div className={styles.cta}>
            {checking ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                Checking profile...
              </div>
            ) : (
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, mounted }) => {
                  const connected = mounted && account && chain;
                  return (
                    <button
                      onClick={openConnectModal}
                      className="btn btn-primary"
                      style={{ fontSize: '18px', padding: '18px 36px' }}
                    >
                      {connected ? 'Continue to App' : 'Connect Wallet to Start'}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            )}
          </div>

          <p className={styles.note}>
            Free to use. We only take 1% when you get paid.
          </p>
        </div>

        {/* Demo Preview */}
        <div className={styles.preview}>
          <div className={styles.mockup}>
            <div className={styles.mockupHeader}>
              <div className={styles.mockupDots}>
                <span></span><span></span><span></span>
              </div>
              <span className={styles.mockupUrl}>cryptobio.com/alex</span>
            </div>
            <div className={styles.mockupContent}>
              <div className={styles.mockupAvatar}></div>
              <h3>Alex Rivera</h3>
              <p>Crypto educator & builder</p>
              <div className={styles.mockupButtons}>
                <button className={styles.mockupBtn}>☕ Buy me a coffee - $5</button>
                <button className={styles.mockupBtn}>🚀 Support my work - $25</button>
                <button className={styles.mockupBtn}>💎 Big tip - $100</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <h2>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Connect Wallet</h3>
            <p>Sign in with your existing wallet. No email or password needed.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Create Your Page</h3>
            <p>Pick a username, add your photo, and set your tip amounts.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Share & Earn</h3>
            <p>Put your link in your bio. Fans click, pay, done.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🔒</div>
          <h3>No Custody</h3>
          <p>We never hold your funds. Payments go directly to your wallet.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>⚡</div>
          <h3>Low Fees</h3>
          <p>Built on Base. Transaction fees are fractions of a cent.</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>💵</div>
          <h3>USDC Payments</h3>
          <p>Receive stablecoins. $5 means $5, no volatility.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Built for creators. 99% goes to you, 1% keeps us running.</p>
      </footer>
    </main>
  );
}



