-- CryptoBio Database Schema
-- Run this in your Supabase SQL Editor

-- Drop existing table if you need to recreate
-- DROP TABLE IF EXISTS profiles;

-- Create profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(20) UNIQUE NOT NULL,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  payout_address VARCHAR(42), -- Where tips get sent (can be different from login wallet)
  display_name VARCHAR(100) NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  twitter_url TEXT DEFAULT '',
  tip_amounts INTEGER[] DEFAULT ARRAY[5, 10, 25],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read profiles (public pages)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Allow anyone to insert (wallet verification happens via signature on client)
CREATE POLICY "Anyone can create a profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- Allow updates (MVP - production should verify wallet signatures server-side)
CREATE POLICY "Anyone can update profiles" ON profiles
  FOR UPDATE USING (true);

-- Optional: Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- If you already have the table, just add the payout_address column:
-- ALTER TABLE profiles ADD COLUMN payout_address VARCHAR(42);
