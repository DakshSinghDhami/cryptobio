import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Profile {
  id: string;
  username: string;
  wallet_address: string;
  payout_address: string | null;
  display_name: string;
  bio: string;
  avatar_url: string;
  twitter_url: string;
  tip_amounts: number[];
  created_at: string;
  updated_at: string;
}

// Profile operations
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();
  
  if (error) {
    return null;
  }
  return data;
}

export async function getProfileByWallet(walletAddress: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();
  
  if (error) {
    return null;
  }
  return data;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .single();
  
  return !data;
}

export async function createProfile(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      ...profile,
      username: profile.username.toLowerCase(),
      wallet_address: profile.wallet_address.toLowerCase(),
      payout_address: profile.payout_address?.toLowerCase() || profile.wallet_address.toLowerCase(),
    })
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data, error: null };
}

export async function updateProfile(
  walletAddress: string,
  updates: Partial<Omit<Profile, 'id' | 'username' | 'wallet_address' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> {
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  if (updates.payout_address) {
    updateData.payout_address = updates.payout_address.toLowerCase();
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('wallet_address', walletAddress.toLowerCase())
    .select()
    .single();
  
  if (error) {
    return null;
  }
  return data;
}
