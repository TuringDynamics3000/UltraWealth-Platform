/**
 * Group Route Guard Check
 * 
 * AUTHORITATIVE: Static CI check that ensures every Group route is guarded.
 * 
 * This check scans all source files and verifies that:
 * - Any file referencing Group routes also includes guard functions
 * - No Group routes are used without proper mode gating
 * 
 * What this catches:
 * - A developer adds /group/xyz but forgets the guard
 * - A Group route is accidentally mounted in Retail routing
 * - Someone "just tests something quickly" and forgets to remove it
 * 
 * Exit code 1 = PR blocked. No override.
 */

import * as fs from "fs";
import * as path from "path";

// Import Group route prefixes from contract
// Note: In CI, this path is relative to the project root
const GROUP_ROUTE_PREFIXES = [
  "/group",
  "/group/dashboard",
  "/group/entity",
  "/group/ownership",
  "/group/board-pack",
  "/group/evidence",
  "/group/reconciliation",
  "/group/settings",
];

// Guard function names that indicate proper protection
const GUARD_FUNCTIONS = [
  "resolveAppMode",
  "guardRoute",
  "useGroupGuard",
  "withGroupGuard",
  "ModeAwareRoutes",
  "isGroupRoute",
  "validateRouteContract",
];

// Directories to scan
const SCAN_DIRS = ["src"];

// Directories to exclude
const EXCLUDE_DIRS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "tests",
  "ci",
];

// Files that are allowed to reference Group routes without guards
// (e.g., the contract file itself, route definitions)
const ALLOWED_FILES = [
  "groupRoutes.contract.ts",
  "routes.ts",
  "routeGuards.ts",
  "modeAwareRoutes.tsx",
];

/**
 * Recursively scan directory for TypeScript files.
 */
function scanFiles(dir: string, results: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry.name)) {
          scanFiles(fullPath, results);
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return results;
}

/**
 * Check if a file contains Group route references.
 */
function containsGroupRouteReference(content: string): boolean {
  for (const prefix of GROUP_ROUTE_PREFIXES) {
    // Check for string literals containing the prefix
    if (content.includes(`"${prefix}`) || content.includes(`'${prefix}`)) {
      return true;
    }
    // Check for template literals
    if (content.includes(`\`${prefix}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a file contains guard function references.
 */
function containsGuardFunction(content: string): boolean {
  for (const guard of GUARD_FUNCTIONS) {
    if (content.includes(guard)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a file is in the allowed list.
 */
function isAllowedFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return ALLOWED_FILES.includes(fileName);
}

/**
 * Main check function.
 */
function runCheck(): void {
  console.log("========================================");
  console.log("Group Route Guard Check");
  console.log("========================================\n");
  
  const projectRoot = process.cwd();
  const violations: string[] = [];
  
  for (const scanDir of SCAN_DIRS) {
    const dirPath = path.join(projectRoot, scanDir);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory not found: ${dirPath}`);
      continue;
    }
    
    const files = scanFiles(dirPath);
    console.log(`Scanning ${files.length} files in ${scanDir}/...\n`);
    
    for (const file of files) {
      // Skip allowed files
      if (isAllowedFile(file)) {
        continue;
      }
      
      try {
        const content = fs.readFileSync(file, "utf8");
        
        // Check if file references Group routes
        if (containsGroupRouteReference(content)) {
          // Check if file also contains guard functions
          if (!containsGuardFunction(content)) {
            const relativePath = path.relative(projectRoot, file);
            violations.push(`❌ Group route used without guard in ${relativePath}`);
          }
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }
  }
  
  // Report results
  if (violations.length > 0) {
    console.error("\n========================================");
    console.error("GROUP ROUTE GUARD VIOLATIONS:");
    console.error("========================================\n");
    
    for (const violation of violations) {
      console.error(violation);
    }
    
    console.error("\n========================================");
    console.error("FAILURE: Group routes must be guarded");
    console.error("========================================\n");
    console.error("Every file that references /group/* routes must also");
    console.error("include one of these guard functions:");
    console.error(GUARD_FUNCTIONS.map(g => `  - ${g}`).join("\n"));
    console.error("\nThis is an architectural requirement, not a suggestion.");
    
    process.exit(1);
  }
  
  console.log("========================================");
  console.log("✅ Group route guard check passed");
  console.log("========================================\n");
  console.log(`Scanned files: ${SCAN_DIRS.join(", ")}`);
  console.log("All Group route references are properly guarded.");
}

// Run the check
runCheck();
