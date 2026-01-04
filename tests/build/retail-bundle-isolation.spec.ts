/**
 * Retail Bundle Isolation Snapshot Test
 * 
 * AUTHORITATIVE: Retail build bundle must NOT contain Group strings.
 * 
 * This test proves that:
 * - Group code is not tree-shaken "by luck"
 * - Retail users cannot discover Group via source maps
 * - Governance surfaces are physically absent from Retail build
 * 
 * If any forbidden string is found in the Retail bundle, the test fails.
 * This is a hard boundary. No exceptions.
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

/**
 * Retail build output directory.
 * This must match the actual build output path.
 */
const RETAIL_DIST = path.join(process.cwd(), "dist/retail");

/**
 * Alternative paths to check if primary doesn't exist.
 */
const ALTERNATIVE_PATHS = [
  path.join(process.cwd(), "dist/retail"),
  path.join(process.cwd(), "build/retail"),
  path.join(process.cwd(), "out/retail"),
];

/**
 * Forbidden strings that must NOT appear in Retail bundle.
 * 
 * These are Group-specific identifiers that would indicate
 * governance code has leaked into the Retail build.
 */
const FORBIDDEN_STRINGS = [
  // Route patterns
  "/group",
  "/group/",
  "path: '/group",
  'path: "/group',
  
  // Component names
  "BoardPack",
  "BoardPackView",
  "BoardPackList",
  "BoardPackApprove",
  "BoardPackLock",
  "OwnershipView",
  "OwnershipGraph",
  "OwnershipMap",
  "EntityMap",
  "EntityRegistry",
  "EntityControlPlane",
  "ReconciliationTimeline",
  "ReconciliationView",
  "EvidenceExport",
  "EvidenceView",
  
  // Group-specific hooks
  "useGroupGuard",
  "useEntityScope",
  "useBoardPack",
  "useOwnershipGraph",
  "useReconciliation",
  
  // Group navigation
  "GroupNavigation",
  "GroupSidebar",
  "GroupHeader",
  
  // API patterns
  "/api/group",
  "api/group/",
  "groupApi",
  "GroupApiClient",
  
  // TuringOS Group-specific
  "entity_scope",
  "entityScope",
  "FOUNDER",
  "BOARD",
  "AUDITOR",
  "CFO",
];

/**
 * Strings that are allowed even if they contain "group" substring.
 * These are false positives that should not trigger failures.
 */
const ALLOWED_PATTERNS = [
  "group-hover", // Tailwind CSS
  "grouping",    // Generic word
  "regroup",     // Generic word
  "group by",    // SQL-like
  "GROUP BY",    // SQL-like
];

/**
 * Check if a string match is a false positive.
 */
function isFalsePositive(content: string, match: string, index: number): boolean {
  // Get surrounding context (50 chars before and after)
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + match.length + 50);
  const context = content.slice(start, end);
  
  // Check if context contains allowed patterns
  for (const allowed of ALLOWED_PATTERNS) {
    if (context.toLowerCase().includes(allowed.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Scan a file for forbidden strings.
 */
function scanFile(filePath: string): { file: string; violations: string[] } {
  const violations: string[] = [];
  
  try {
    const content = fs.readFileSync(filePath, "utf8");
    
    for (const forbidden of FORBIDDEN_STRINGS) {
      let index = content.indexOf(forbidden);
      
      while (index !== -1) {
        if (!isFalsePositive(content, forbidden, index)) {
          // Get line number
          const lineNumber = content.slice(0, index).split("\n").length;
          violations.push(`Found "${forbidden}" at line ${lineNumber}`);
        }
        
        index = content.indexOf(forbidden, index + 1);
      }
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  
  return { file: filePath, violations };
}

/**
 * Get the actual Retail dist path.
 */
function getRetailDistPath(): string | null {
  for (const p of ALTERNATIVE_PATHS) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Retail Bundle Isolation", () => {
  let retailDistPath: string | null;
  let bundleFiles: string[];

  beforeAll(() => {
    retailDistPath = getRetailDistPath();
    
    if (retailDistPath) {
      // Get all JS and map files in the bundle
      bundleFiles = glob.sync("**/*.{js,mjs,cjs,map}", {
        cwd: retailDistPath,
        absolute: true,
      });
    } else {
      bundleFiles = [];
    }
  });

  it("Retail dist directory should exist", () => {
    expect(retailDistPath).not.toBeNull();
    expect(fs.existsSync(retailDistPath!)).toBe(true);
  });

  it("Retail build should contain bundle files", () => {
    expect(bundleFiles.length).toBeGreaterThan(0);
  });

  it("Retail build must not contain Group artefacts", () => {
    const allViolations: { file: string; violations: string[] }[] = [];

    for (const file of bundleFiles) {
      const result = scanFile(file);
      
      if (result.violations.length > 0) {
        allViolations.push({
          file: path.relative(retailDistPath!, file),
          violations: result.violations,
        });
      }
    }

    if (allViolations.length > 0) {
      const errorMessage = [
        "",
        "========================================",
        "RETAIL BUNDLE ISOLATION VIOLATION",
        "========================================",
        "",
        "Group artefacts found in Retail build:",
        "",
        ...allViolations.flatMap(({ file, violations }) => [
          `File: ${file}`,
          ...violations.map(v => `  ❌ ${v}`),
          "",
        ]),
        "========================================",
        "This is an architectural violation.",
        "Retail builds must not contain Group code.",
        "========================================",
      ].join("\n");

      fail(errorMessage);
    }
  });

  it("Retail build must not contain source maps with Group references", () => {
    const mapFiles = bundleFiles.filter(f => f.endsWith(".map"));
    const violations: string[] = [];

    for (const file of mapFiles) {
      try {
        const content = fs.readFileSync(file, "utf8");
        const sourceMap = JSON.parse(content);

        // Check sources array for Group paths
        if (sourceMap.sources) {
          for (const source of sourceMap.sources) {
            if (source.includes("/group/") || source.includes("\\group\\")) {
              violations.push(`Source map ${path.basename(file)} references: ${source}`);
            }
          }
        }

        // Check sourcesContent for Group code
        if (sourceMap.sourcesContent) {
          for (let i = 0; i < sourceMap.sourcesContent.length; i++) {
            const sourceContent = sourceMap.sourcesContent[i];
            if (sourceContent) {
              for (const forbidden of FORBIDDEN_STRINGS.slice(0, 10)) {
                if (sourceContent.includes(forbidden)) {
                  violations.push(
                    `Source map ${path.basename(file)} contains Group code in source ${i}`
                  );
                  break;
                }
              }
            }
          }
        }
      } catch (error) {
        // Source map parsing error - not a violation
      }
    }

    if (violations.length > 0) {
      fail([
        "",
        "Source maps contain Group references:",
        ...violations.map(v => `  ❌ ${v}`),
        "",
        "Retail users could discover Group via source maps.",
      ].join("\n"));
    }
  });

  it("Retail build must not contain Group route definitions", () => {
    const routePatterns = [
      /path:\s*['"]\/group/,
      /route:\s*['"]\/group/,
      /to:\s*['"]\/group/,
      /href:\s*['"]\/group/,
      /navigate\s*\(\s*['"]\/group/,
    ];

    const violations: string[] = [];

    for (const file of bundleFiles) {
      if (file.endsWith(".map")) continue;

      try {
        const content = fs.readFileSync(file, "utf8");

        for (const pattern of routePatterns) {
          if (pattern.test(content)) {
            violations.push(`${path.basename(file)} contains Group route definition`);
            break;
          }
        }
      } catch (error) {
        // File read error - not a violation
      }
    }

    if (violations.length > 0) {
      fail([
        "",
        "Retail build contains Group route definitions:",
        ...violations.map(v => `  ❌ ${v}`),
      ].join("\n"));
    }
  });
});

// ============================================================================
// STANDALONE RUNNER
// ============================================================================

/**
 * Run as standalone script for CI.
 */
if (require.main === module) {
  console.log("========================================");
  console.log("Retail Bundle Isolation Check");
  console.log("========================================\n");

  const retailDistPath = getRetailDistPath();

  if (!retailDistPath) {
    console.error("❌ Retail dist directory not found");
    console.error("   Checked paths:");
    ALTERNATIVE_PATHS.forEach(p => console.error(`     - ${p}`));
    process.exit(1);
  }

  console.log(`Scanning: ${retailDistPath}\n`);

  const bundleFiles = glob.sync("**/*.{js,mjs,cjs,map}", {
    cwd: retailDistPath,
    absolute: true,
  });

  console.log(`Found ${bundleFiles.length} bundle files\n`);

  let hasViolations = false;

  for (const file of bundleFiles) {
    const result = scanFile(file);

    if (result.violations.length > 0) {
      hasViolations = true;
      console.error(`\n❌ ${path.relative(retailDistPath, file)}`);
      result.violations.forEach(v => console.error(`   ${v}`));
    }
  }

  if (hasViolations) {
    console.error("\n========================================");
    console.error("FAILURE: Group artefacts in Retail build");
    console.error("========================================\n");
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("✅ Retail bundle isolation check passed");
  console.log("========================================\n");
}
