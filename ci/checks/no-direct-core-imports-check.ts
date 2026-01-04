/**
 * No Direct TuringCore Imports Check
 * 
 * AUTHORITATIVE: Static CI check that ensures UltraWealth never imports TuringCore directly.
 * 
 * Architectural principle:
 * - UltraWealth → TuringOS → TuringCore
 * - UltraWealth MUST NOT import TuringCore directly
 * 
 * TuringCore is an implementation detail. TuringOS is the authoritative interface.
 * 
 * Exit code 1 = PR blocked. No override.
 */

import * as fs from "fs";
import * as path from "path";

// Import patterns to detect (TuringCore direct imports)
const FORBIDDEN_PATTERNS = [
  /from\s+['"].*turingcore/i,
  /from\s+['"].*turing-core/i,
  /from\s+['"]@turingdynamics\/core/i,
  /from\s+['"]@turingdynamics\/turingcore/i,
  /import\s+.*\s+from\s+['"].*turingcore/i,
  /require\s*\(\s*['"].*turingcore/i,
];

// Directories to scan
const SCAN_DIRS = ["src"];

// Directories to exclude
const EXCLUDE_DIRS = ["node_modules", "dist", "build", ".git", "tests", "ci"];

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
 * Check file content against forbidden patterns.
 */
function checkFileForForbiddenPatterns(
  content: string,
  patterns: RegExp[]
): { line: number; text: string }[] {
  const violations: { line: number; text: string }[] = [];
  const lines = content.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        violations.push({ line: i + 1, text: line.trim() });
        break; // Only report once per line
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
  console.log("No Direct TuringCore Imports Check");
  console.log("========================================\n");
  
  const projectRoot = process.cwd();
  const allViolations: { file: string; violations: { line: number; text: string }[] }[] = [];
  
  for (const scanDir of SCAN_DIRS) {
    const dirPath = path.join(projectRoot, scanDir);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory not found: ${dirPath}`);
      continue;
    }
    
    const files = scanFiles(dirPath);
    console.log(`Scanning ${files.length} files in ${scanDir}/...\n`);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf8");
        const violations = checkFileForForbiddenPatterns(content, FORBIDDEN_PATTERNS);
        
        if (violations.length > 0) {
          const relativePath = path.relative(projectRoot, file);
          allViolations.push({ file: relativePath, violations });
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }
  }
  
  // Report results
  if (allViolations.length > 0) {
    console.error("\n========================================");
    console.error("DIRECT TURINGCORE IMPORT VIOLATIONS:");
    console.error("========================================\n");
    
    for (const { file, violations } of allViolations) {
      console.error(`\nFile: ${file}`);
      for (const { line, text } of violations) {
        console.error(`  ❌ Line ${line}: ${text}`);
      }
    }
    
    console.error("\n========================================");
    console.error("FAILURE: Direct TuringCore imports detected");
    console.error("========================================\n");
    console.error("Architectural principle:");
    console.error("  UltraWealth → TuringOS → TuringCore");
    console.error("\nUltraWealth MUST NOT import TuringCore directly.");
    console.error("All access to TuringCore must go through TuringOS APIs.");
    console.error("\nTuringCore records facts.");
    console.error("TuringOS decides meaning, authority, and safety.");
    console.error("\nThis is an architectural requirement, not a suggestion.");
    
    process.exit(1);
  }
  
  console.log("========================================");
  console.log("✅ No direct TuringCore imports detected");
  console.log("========================================\n");
  console.log("All TuringCore access goes through TuringOS.");
}

// Run the check
runCheck();
