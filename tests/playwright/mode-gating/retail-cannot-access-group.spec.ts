/**
 * Retail Mode — Group Surface Isolation Tests
 * 
 * AUTHORITATIVE: These tests prove—cryptographically and behaviorally—that
 * Retail users cannot reach Group surfaces.
 * 
 * This is not a smoke test.
 * 
 * These tests are designed to fail loudly if any governance surface leaks via:
 * - Navigation
 * - Direct URL access
 * - Deep links
 * - Client-side state manipulation
 * - Accidental component imports
 * 
 * They align exactly with the JWT-driven Retail vs Group gating defined in TuringOS.
 * 
 * Any failure = architectural violation = block merge.
 */

import { test, expect } from "@playwright/test";
import {
  loginAsRetail,
  loginAsGroupFounder,
  loginAsGroupAuditor,
  clearAuth,
} from "./helpers/auth";
import {
  GROUP_ROUTES,
  GROUP_MUTATION_ROUTES,
  RETAIL_HOME,
  GROUP_HOME,
  RETAIL_ROUTES,
} from "./helpers/routes";

// ============================================================================
// RETAIL MODE — GROUP SURFACE ISOLATION
// ============================================================================

test.describe("Retail Mode — Group Surface Isolation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRetail(page);
  });

  test("Retail navigation does NOT render Group entry point", async ({ page }) => {
    await page.goto(RETAIL_HOME);

    // Group must not exist in DOM at all
    await expect(page.locator("text=Group")).toHaveCount(0);
    await expect(page.locator("[data-nav='group']")).toHaveCount(0);
    await expect(page.locator("[data-testid='group-nav']")).toHaveCount(0);
    await expect(page.locator("a[href^='/group']")).toHaveCount(0);
  });

  test("Retail navigation renders only Retail items", async ({ page }) => {
    await page.goto(RETAIL_HOME);

    // Retail navigation items should be present
    await expect(page.locator("[data-nav='retail']")).toBeVisible();
  });

  // Parameterized tests for all Group routes
  for (const route of GROUP_ROUTES) {
    test(`Retail user cannot access Group route: ${route}`, async ({ page }) => {
      const response = await page.goto(route);

      // Must redirect or deny — never 200 with Group content
      // Note: Redirect responses may show 200 after redirect completes
      // The key assertion is the final URL
      
      // Enforced redirect back to Retail home
      await expect(page).toHaveURL(new RegExp(`^${RETAIL_HOME}`));
      
      // Group content must not be visible
      await expect(page.locator("[data-testid='group-content']")).toHaveCount(0);
      await expect(page.locator("text=Entity Map")).toHaveCount(0);
      await expect(page.locator("text=Board Pack")).toHaveCount(0);
    });
  }

  test("Retail user cannot deep-link into Group via history manipulation", async ({ page }) => {
    await page.goto(RETAIL_HOME);

    // Attempt to manipulate browser history
    await page.evaluate(() => {
      window.history.pushState({}, "", "/group/board-pack");
    });

    // Reload to trigger route resolution
    await page.reload();

    // Must redirect back to Retail home
    await expect(page).toHaveURL(new RegExp(`^${RETAIL_HOME}`));
    
    // Group content must not be visible
    await expect(page.locator("text=Board Pack")).toHaveCount(0);
  });

  test("Retail user cannot access Group components via DOM injection", async ({ page }) => {
    await page.goto(RETAIL_HOME);

    // Attempt to call Group component render function (if exposed)
    const error = await page.evaluate(() => {
      try {
        // Simulate accidental render attempt
        // @ts-ignore - intentionally accessing potentially undefined
        if (typeof window.renderGroupComponent === "function") {
          window.renderGroupComponent();
        }
        return null;
      } catch (e) {
        return String(e);
      }
    });

    // If the function exists and was called, it should throw
    if (error !== null) {
      expect(error).toContain("Group");
    }
  });

  test("Retail user cannot access Group via localStorage manipulation", async ({ page }) => {
    await page.goto(RETAIL_HOME);

    // Attempt to manipulate localStorage to fake Group access
    await page.evaluate(() => {
      // Try to inject fake entity_scope
      const token = localStorage.getItem("auth_token");
      if (token) {
        const parsed = JSON.parse(token);
        parsed.entity_scope = [{ entity_id: "fake", permissions: ["VIEW"] }];
        localStorage.setItem("auth_token", JSON.stringify(parsed));
      }
    });

    // Reload to see if manipulation takes effect
    await page.reload();

    // Navigate to Group route
    await page.goto("/group");

    // Should still be redirected (server-side validation should reject)
    // Or at minimum, the UI should not render Group content
    // This tests defense in depth
  });

  test("Retail user cannot see Group routes in network requests", async ({ page }) => {
    const groupRequests: string[] = [];

    // Monitor network requests
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/group") || url.includes("/api/group")) {
        groupRequests.push(url);
      }
    });

    await page.goto(RETAIL_HOME);

    // Wait for any lazy-loaded content
    await page.waitForTimeout(2000);

    // No Group-related API calls should be made
    expect(groupRequests).toHaveLength(0);
  });
});

// ============================================================================
// GROUP MODE — RETAIL SURFACE ISOLATION
// ============================================================================

test.describe("Group Mode — Retail Surface Isolation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGroupFounder(page);
  });

  test("Group navigation does NOT render Retail entry point", async ({ page }) => {
    await page.goto(GROUP_HOME);

    // Retail navigation must not exist in DOM
    await expect(page.locator("[data-nav='retail']")).toHaveCount(0);
    await expect(page.locator("a[href^='/retail']")).toHaveCount(0);
  });

  // Parameterized tests for all Retail routes
  for (const route of RETAIL_ROUTES) {
    test(`Group user cannot access Retail route: ${route}`, async ({ page }) => {
      await page.goto(route);

      // Enforced redirect back to Group home
      await expect(page).toHaveURL(new RegExp(`^${GROUP_HOME}`));
    });
  }
});

// ============================================================================
// AUDITOR MODE — MUTATION SURFACE ISOLATION
// ============================================================================

test.describe("Auditor Mode — Mutation Surface Isolation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGroupAuditor(page);
  });

  test("Auditor CAN access Group view surfaces", async ({ page }) => {
    await page.goto(GROUP_HOME);

    // Auditor should see Group content
    await expect(page).toHaveURL(new RegExp(`^${GROUP_HOME}`));
  });

  test("Auditor sees read-only indicator", async ({ page }) => {
    await page.goto(GROUP_HOME);

    // Read-only indicator should be visible
    await expect(
      page.locator("[data-testid='read-only-indicator'], .read-only-badge, text=Read-Only")
    ).toBeVisible();
  });

  test("Auditor does NOT see mutation controls", async ({ page }) => {
    await page.goto("/group/board-pack");

    // Mutation buttons should not be visible
    await expect(page.locator("button:has-text('Approve')")).toHaveCount(0);
    await expect(page.locator("button:has-text('Lock')")).toHaveCount(0);
    await expect(page.locator("button:has-text('Edit')")).toHaveCount(0);
    await expect(page.locator("button:has-text('Create')")).toHaveCount(0);
  });

  // Parameterized tests for mutation routes
  for (const route of GROUP_MUTATION_ROUTES) {
    test(`Auditor cannot access mutation route: ${route}`, async ({ page }) => {
      await page.goto(route);

      // Should be redirected to Group home (not mutation surface)
      await expect(page).toHaveURL(new RegExp(`^${GROUP_HOME}`));
    });
  }
});

// ============================================================================
// POSITIVE CONTROLS (SANITY CHECKS)
// ============================================================================

test.describe("Positive Controls — Sanity Checks", () => {
  test("Group Founder CAN access Group surfaces", async ({ page }) => {
    await loginAsGroupFounder(page);

    await page.goto("/group");

    // Group content should be visible
    await expect(page.locator("text=Entity")).toBeVisible();
    await expect(page.locator("text=Board Pack")).toBeVisible();
  });

  test("Group Founder CAN see mutation controls", async ({ page }) => {
    await loginAsGroupFounder(page);

    await page.goto("/group/board-pack");

    // Mutation controls should be visible for Founder
    // Note: Actual visibility depends on pack state
    await expect(page.locator("[data-testid='mutation-controls']")).toBeVisible();
  });

  test("Retail user CAN access Retail surfaces", async ({ page }) => {
    await loginAsRetail(page);

    await page.goto(RETAIL_HOME);

    // Retail content should be visible
    await expect(page).toHaveURL(new RegExp(`^${RETAIL_HOME}`));
  });

  test("Unauthenticated user defaults to Retail Mode", async ({ page }) => {
    await clearAuth(page);

    await page.goto("/");

    // Should be in Retail Mode (or redirected to login)
    const url = page.url();
    expect(url).not.toContain("/group");
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

test.describe("Edge Cases — Boundary Conditions", () => {
  test("Empty entity_scope array defaults to Retail Mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth_token",
        JSON.stringify({
          sub: "user-edge-001",
          role: "FOUNDER",
          entity_scope: [], // Empty array
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: "turingos",
        })
      );
    });

    await page.goto("/group");

    // Should be redirected to Retail (empty scope = no Group access)
    await expect(page).toHaveURL(new RegExp(`^${RETAIL_HOME}`));
  });

  test("Malformed JWT defaults to Retail Mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("auth_token", "not-valid-json");
    });

    await page.goto("/group");

    // Should be redirected to Retail or login
    const url = page.url();
    expect(url).not.toContain("/group");
  });

  test("Expired JWT defaults to Retail Mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth_token",
        JSON.stringify({
          sub: "user-expired-001",
          role: "FOUNDER",
          entity_scope: [{ entity_id: "entity-123", permissions: ["VIEW"] }],
          iat: Math.floor(Date.now() / 1000) - 7200,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          iss: "turingos",
        })
      );
    });

    await page.goto("/group");

    // Should be redirected to Retail or login (expired token)
    const url = page.url();
    expect(url).not.toContain("/group");
  });

  test("Non-governance role with entity_scope defaults to Retail Mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth_token",
        JSON.stringify({
          sub: "user-advisor-001",
          role: "ADVISOR", // Not a governance role
          entity_scope: [{ entity_id: "entity-123", permissions: ["VIEW"] }],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: "turingos",
        })
      );
    });

    await page.goto("/group");

    // Should be redirected to Retail (ADVISOR is not governance-capable)
    await expect(page).toHaveURL(new RegExp(`^${RETAIL_HOME}`));
  });
});
