/**
 * Retail ↔ Group Import Isolation Check
 * 
 * AUTHORITATIVE: Static CI check that ensures Retail code never imports Group code.
 * 
 * This check enforces the architectural boundary:
 * - Retail components MUST NOT import from Group module
 * - Group components MUST NOT import from Retail module
 * 
 * This is a hard boundary. No exceptions. No feature flags.
 * 
 * Exit code 1 = PR blocked. No override.
 */

import * as fs from "fs";
import * as path from "path";

// Import patterns to detect
const RETAIL_TO_GROUP_PATTERNS = [
  /from\s+['"].*\/group/,
  /from\s+['"]\.\.\/group/,
  /from\s+['"]\.\.\/\.\.\/group/,
  /import\s+.*\s+from\s+['"].*\/group/,
  /require\s*\(\s*['"].*\/group/,
];

const GROUP_TO_RETAIL_PATTERNS = [
  /from\s+['"].*\/retail/,
  /from\s+['"]\.\.\/retail/,
  /from\s+['"]\.\.\/\.\.\/retail/,
  /import\s+.*\s+from\s+['"].*\/retail/,
  /require\s*\(\s*['"].*\/retail/,
];

// Directories to check
const RETAIL_DIR = "src/retail";
const GROUP_DIR = "src/group";

// Directories to exclude
const EXCLUDE_DIRS = ["node_modules", "dist", "build", ".git"];

/**
 * Recursively scan directory for TypeScript files.
 */
function scanFiles(dir: string, results: string[] = []): string[] {
  try {
    if (!fs.existsSync(dir)) {
      return results;
    }
    
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
 * Check file content against patterns.
 */
function checkFileForPatterns(
  filePath: string,
  content: string,
  patterns: RegExp[]
): string[] {
  const violations: string[] = [];
  const lines = content.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        violations.push(`  Line ${i + 1}: ${line.trim()}`);
      }
    }
  }
  
  return violations;
}

/**
 * Main check function.
 */
function runCheck(): void {
  console.log("========================================");
  console.log("Retail ↔ Group Import Isolation Check");
  console.log("========================================\n");
  
  const projectRoot = process.cwd();
  const allViolations: { file: string; violations: string[] }[] = [];
  
  // Check Retail → Group imports
  console.log("Checking Retail code for Group imports...\n");
  const retailDir = path.join(projectRoot, RETAIL_DIR);
  const retailFiles = scanFiles(retailDir);
  
  for (const file of retailFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const violations = checkFileForPatterns(file, content, RETAIL_TO_GROUP_PATTERNS);
      
      if (violations.length > 0) {
        const relativePath = path.relative(projectRoot, file);
        allViolations.push({
          file: relativePath,
          violations: violations.map(v => `❌ Retail code imports Group: ${v}`),
        });
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }
  
  // Check Group → Retail imports
  console.log("Checking Group code for Retail imports...\n");
  const groupDir = path.join(projectRoot, GROUP_DIR);
  const groupFiles = scanFiles(groupDir);
  
  for (const file of groupFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const violations = checkFileForPatterns(file, content, GROUP_TO_RETAIL_PATTERNS);
      
      if (violations.length > 0) {
        const relativePath = path.relative(projectRoot, file);
        allViolations.push({
          file: relativePath,
          violations: violations.map(v => `❌ Group code imports Retail: ${v}`),
        });
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }
  
  // Report results
  if (allViolations.length > 0) {
    console.error("\n========================================");
    console.error("RETAIL ↔ GROUP ISOLATION VIOLATIONS:");
    console.error("========================================\n");
    
    for (const { file, violations } of allViolations) {
      console.error(`\nFile: ${file}`);
      for (const violation of violations) {
        console.error(violation);
      }
    }
    
    console.error("\n========================================");
    console.error("FAILURE: Import isolation violated");
    console.error("========================================\n");
    console.error("Architectural boundaries:");
    console.error("  - Retail code MUST NOT import from Group module");
    console.error("  - Group code MUST NOT import from Retail module");
    console.error("\nIn Retail Mode, Group does not exist.");
    console.error("In Group Mode, Retail does not exist.");
    console.error("\nThis is an architectural requirement, not a suggestion.");
    
    process.exit(1);
  }
  
  console.log("========================================");
  console.log("✅ Retail/Group import isolation passed");
  console.log("========================================\n");
  console.log(`Retail files checked: ${retailFiles.length}`);
  console.log(`Group files checked: ${groupFiles.length}`);
  console.log("No cross-boundary imports detected.");
}

// Run the check
runCheck();
