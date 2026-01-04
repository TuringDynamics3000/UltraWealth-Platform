/**
 * Playwright Auth Helpers
 * 
 * AUTHORITATIVE: Mock JWT injection for mode gating tests.
 * 
 * These helpers inject JWT claims at browser level to simulate:
 * - Retail Mode (no entity_scope)
 * - Group Mode (entity_scope + governance role)
 * - Auditor Mode (entity_scope + AUDITOR role)
 * 
 * This mirrors exactly the JWT semantics defined in TuringOS:
 * - No entity_scope → Retail
 * - Entity + governance role → Group
 */

import { Page } from "@playwright/test";

/**
 * JWT token storage key.
 * Must match the key used by the application.
 */
const AUTH_TOKEN_KEY = "auth_token";

/**
 * Login as a Retail user.
 * 
 * Retail users have:
 * - No entity_scope
 * - Role is irrelevant (defaults to RETAIL)
 * 
 * This simulates the default state for users without governance access.
 */
export async function loginAsRetail(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        sub: "user-retail-001",
        role: "RETAIL",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "turingos",
        // No entity_scope → Retail Mode by definition
      })
    );
  }, AUTH_TOKEN_KEY);
}

/**
 * Login as a Group Founder.
 * 
 * Founders have:
 * - entity_scope with at least one entity
 * - Role = FOUNDER
 * - Full mutation capability
 */
export async function loginAsGroupFounder(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        sub: "user-founder-001",
        role: "FOUNDER",
        entity_scope: [
          {
            entity_id: "entity-123",
            permissions: ["VIEW", "EDIT", "BOARD_PACK", "EXPORT", "APPROVE", "LOCK"]
          }
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "turingos",
      })
    );
  }, AUTH_TOKEN_KEY);
}

/**
 * Login as a Group Board member.
 * 
 * Board members have:
 * - entity_scope with at least one entity
 * - Role = BOARD
 * - Full mutation capability (Board ≠ Founder, but both can mutate)
 */
export async function loginAsGroupBoard(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        sub: "user-board-001",
        role: "BOARD",
        entity_scope: [
          {
            entity_id: "entity-123",
            permissions: ["VIEW", "BOARD_PACK", "EXPORT", "APPROVE", "LOCK"]
          }
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "turingos",
      })
    );
  }, AUTH_TOKEN_KEY);
}

/**
 * Login as a Group CFO.
 * 
 * CFOs have:
 * - entity_scope with at least one entity
 * - Role = CFO
 * - Mutation capability
 */
export async function loginAsGroupCFO(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        sub: "user-cfo-001",
        role: "CFO",
        entity_scope: [
          {
            entity_id: "entity-123",
            permissions: ["VIEW", "EDIT", "BOARD_PACK", "EXPORT"]
          }
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "turingos",
      })
    );
  }, AUTH_TOKEN_KEY);
}

/**
 * Login as a Group Auditor.
 * 
 * Auditors have:
 * - entity_scope with at least one entity
 * - Role = AUDITOR
 * - NO mutation capability (read-only)
 * 
 * Auditor is Group-visible, not Group-powerful.
 */
export async function loginAsGroupAuditor(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        sub: "user-auditor-001",
        role: "AUDITOR",
        entity_scope: [
          {
            entity_id: "entity-123",
            permissions: ["VIEW", "EXPORT"]
          }
        ],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "turingos",
      })
    );
  }, AUTH_TOKEN_KEY);
}

/**
 * Clear authentication state.
 * 
 * Use this to reset to unauthenticated state.
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    localStorage.removeItem(key);
  }, AUTH_TOKEN_KEY);
}

/**
 * Login with custom claims.
 * 
 * Use this for edge case testing.
 */
export async function loginWithCustomClaims(
  page: Page,
  claims: Record<string, unknown>
): Promise<void> {
  await page.addInitScript(
    ({ key, claims }) => {
      localStorage.setItem(key, JSON.stringify(claims));
    },
    { key: AUTH_TOKEN_KEY, claims }
  );
}
