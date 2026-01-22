import type { Tournament } from '../types';

export interface Env {
  TOURNAMENTS: KVNamespace;
}

export interface SharedTournament {
  id: string;
  pinHash: string;
  tournament: Tournament;
  createdAt: string;
  expiresAt: string;
}

export interface CreateGameResponse {
  id: string;
  pin: string;
  shareUrl: string;
}

export interface ErrorResponse {
  error: string;
}

// Simple hash function for PIN (not cryptographically secure, but fine for this use case)
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Generate a random 6-character alphanumeric ID
export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// Generate a 4-digit PIN
export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// TTL: 24 hours in seconds
export const TTL_SECONDS = 24 * 60 * 60;
