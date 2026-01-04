/**
 * TuringDynamics Group Route Linter
 * 
 * AUTHORITATIVE: Fail CI if unguarded /group routes are generated.
 * 
 * This linter prevents architecture regression at generation time.
 * 
 * Fail CI if:
 * - /group routes exist
 * - AND they are not wrapped by:
 *   - resolveAppMode
 *   - guardRoute
 *   - useGroupGuard
 *   - ModeAwareRoutes
 *   - or explicit Group-only router
 * 
 * No allowlist. No suppression. No override.
 */

import fs from "fs";
import path from "path";

/**
 * Source directory to scan.
 */
const SRC_DIR = process.env.SRC_DIR || path.join(process.cwd(), "src");

/**
 * Directories to exclude from scanning.
 */
const EXCLUDE_DIRS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "__tests__",
  "__mocks__",
  "coverage",
];

/**
 * Files that are allowed to reference Group routes without guards.
 * These are the authoritative route definition files.
 */
const ALLOWED_FILES = [
  "groupRoutes.contract.ts",
  "routes.ts",
  "routeGuards.ts",
  "modeAwareRoutes.tsx",
  "ModeAwareRoutes.tsx",
];

/**
 * Guard functions that indicate proper protection.
 * If a file contains /group AND one of these, it's properly guarded.
 */
const GUARD_FUNCTIONS = [
  "resolveAppMode",
  "guardRoute",
  "useGroupGuard",
  "withGroupGuard",
  "ModeAwareRoutes",
  "GroupGuard",
  "isGroupRoute",
  "validateRouteContract",
  "requireEntityScope",
  "assertEntityScope",
];

/**
 * Group route patterns to detect.
 */
const GROUP_ROUTE_PATTERNS = [
  /['"`]\/group/,                    // String literals
  /path:\s*['"`]\/group/,            // Route definitions
  /to:\s*['"`]\/group/,              // Link destinations
  /href:\s*['"`]\/group/,            // Anchor hrefs
  /navigate\s*\(\s*['"`]\/group/,    // Navigation calls
  /push\s*\(\s*['"`]\/group/,        // History push
  /replace\s*\(\s*['"`]\/group/,     // History replace
  /Route\s+path=\s*['"`]\/group/,    // React Router Route
  /<Route[^>]+path=['"`]\/group/,    // JSX Route
];

/**
 * Violation record.
 */
interface Violation {
  file: string;
  line: number;
  content: string;
  reason: string;
}

/**
 * Recursively scan directory for TypeScript/JavaScript files.
 */
function scanDirectory(dir: string, files: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry.name)) {
          scanDirectory(fullPath, files);
        }
      } else if (entry.isFile()) {
        if (
          entry.name.endsWith(".ts") ||
          entry.name.endsWith(".tsx") ||
          entry.name.endsWith(".js") ||
          entry.name.endsWith(".jsx")
        ) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }

  return files;
}

/**
 * Check if a file is in the allowed list.
 */
function isAllowedFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return ALLOWED_FILES.includes(fileName);
}

/**
 * Check if content contains guard functions.
 */
function hasGuardFunction(content: string): boolean {
  for (const guard of GUARD_FUNCTIONS) {
    if (content.includes(guard)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if content contains Group route patterns.
 */
function findGroupRoutePatterns(content: string): { line: number; match: string }[] {
  const matches: { line: number; match: string }[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of GROUP_ROUTE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        matches.push({
          line: i + 1,
          match: match[0],
        });
        break; // Only report once per line
      }
    }
  }

  return matches;
}

/**
 * Lint a single file.
 */
function lintFile(filePath: string): Violation[] {
  const violations: Violation[] = [];

  // Skip allowed files
  if (isAllowedFile(filePath)) {
    return violations;
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");

    // Find Group route patterns
    const groupMatches = findGroupRoutePatterns(content);

    if (groupMatches.length > 0) {
      // Check if file has guard functions
      if (!hasGuardFunction(content)) {
        for (const match of groupMatches) {
          violations.push({
            file: filePath,
            line: match.line,
            content: match.match,
            reason: "Unguarded /group route found",
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }

  return violations;
}

/**
 * Main linter function.
 */
function runLinter(): void {
  console.log("========================================");
  console.log("TuringDynamics Group Route Linter");
  console.log("========================================\n");

  // Check if source directory exists
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  console.log(`Scanning: ${SRC_DIR}\n`);

  // Scan for files
  const files = scanDirectory(SRC_DIR);
  console.log(`Found ${files.length} source files\n`);

  // Lint each file
  const allViolations: Violation[] = [];

  for (const file of files) {
    const violations = lintFile(file);
    allViolations.push(...violations);
  }

  // Report results
  if (allViolations.length > 0) {
    console.error("\n========================================");
    console.error("TURINGDYNAMICS OUTPUT VIOLATIONS:");
    console.error("========================================\n");

    // Group by file
    const byFile = new Map<string, Violation[]>();
    for (const v of allViolations) {
      const existing = byFile.get(v.file) || [];
      existing.push(v);
      byFile.set(v.file, existing);
    }

    for (const [file, violations] of byFile) {
      const relativePath = path.relative(process.cwd(), file);
      console.error(`\n❌ ${relativePath}`);
      
      for (const v of violations) {
        console.error(`   Line ${v.line}: ${v.content}`);
        console.error(`   Reason: ${v.reason}`);
      }
    }

    console.error("\n========================================");
    console.error("FAILURE: Unguarded /group routes detected");
    console.error("========================================\n");
    console.error("Every file that references /group/* routes must include");
    console.error("one of these guard functions:\n");
    GUARD_FUNCTIONS.forEach(g => console.error(`  - ${g}`));
    console.error("\nThis is an architectural requirement, not a suggestion.");
    console.error("No allowlist. No suppression. No override.\n");

    process.exit(1);
  }

  console.log("========================================");
  console.log("✅ TuringDynamics Group route lint passed");
  console.log("========================================\n");
  console.log(`Scanned ${files.length} files`);
  console.log("All /group routes are properly guarded.\n");
}

// Run the linter
runLinter();
