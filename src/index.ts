/**
 * UltraWealth Platform - Client Application
 * 
 * AUTHORITATIVE: UltraWealth consolidates visibility, not authority.
 * 
 * This module exports:
 * - Auth (JWT claims, mode resolution, session context)
 * - Routing (route guards, mode-aware routes)
 * - Retail (Retail Mode components)
 * - Group (Group Mode components)
 * 
 * ❌ No permission logic
 * ❌ No role inference
 * ❌ No TuringCore imports
 * 
 * All authority comes from TuringOS, never the UI.
 */

// Auth - JWT claims and mode resolution
export * from './auth';

// Routing - Route guards and mode-aware routes
export * from './routing';

// Retail - Retail Mode components (only accessible in Retail Mode)
export * as Retail from './retail';

// Group - Group Mode components (only accessible in Group Mode)
export * as Group from './group';
