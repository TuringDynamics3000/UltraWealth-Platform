/**
 * Session Provider
 * 
 * AUTHORITATIVE: React provider that manages session state from TuringOS JWT.
 * 
 * This provider:
 * - Fetches JWT claims from TuringOS
 * - Provides session state to the component tree
 * - Handles token refresh
 * 
 * ❌ No local storage persistence of claims
 * ❌ No manual mode overrides
 * ❌ No role elevation
 * 
 * All authority comes from TuringOS, never the UI.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { TuringJWTClaims } from './types';
import { SessionContext, createSessionState, DEFAULT_SESSION_STATE } from './sessionContext';

/**
 * Props for SessionProvider.
 */
export interface SessionProviderProps {
  /** Child components */
  children: React.ReactNode;
  
  /** 
   * Function to fetch JWT claims from TuringOS.
   * This should call your auth service to get current claims.
   */
  fetchClaims: () => Promise<TuringJWTClaims | null>;
  
  /**
   * Optional: Interval in ms to refresh claims.
   * Default: 60000 (1 minute)
   */
  refreshInterval?: number;
}

/**
 * Session Provider Component.
 * 
 * Wraps the application and provides session state derived from TuringOS JWT.
 * Mode resolution happens automatically based on claims.
 */
export function SessionProvider({
  children,
  fetchClaims,
  refreshInterval = 60000,
}: SessionProviderProps): React.ReactElement {
  const [claims, setClaims] = useState<TuringJWTClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load claims from TuringOS.
   * On error, fall back to null claims (Retail Mode).
   */
  const loadClaims = useCallback(async () => {
    try {
      const newClaims = await fetchClaims();
      setClaims(newClaims);
      setError(null);
    } catch (err) {
      // On error, fall back to Retail Mode (null claims)
      console.error('[SessionProvider] Failed to fetch claims, falling back to Retail Mode:', err);
      setClaims(null);
      setError(err instanceof Error ? err : new Error('Failed to fetch claims'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchClaims]);

  // Initial load
  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      loadClaims();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [loadClaims, refreshInterval]);

  // Create immutable session state
  const sessionState = useMemo(() => {
    return createSessionState(claims, isLoading);
  }, [claims, isLoading]);

  return (
    <SessionContext.Provider value={sessionState}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Export default for convenience.
 */
export default SessionProvider;
