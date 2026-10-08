#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ALLOWLIST = new Set([
  "©", "®", "™", "←", "→", "↑", "↓", "↔", "↕", "↖", "↗", "↘", "↙"
]);

// Extended pictographic regex
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

// Tailwind gradient class regex
const TAILWIND_GRADIENT_CLASS_REGEX = /\b(bg-gradient-[a-z0-9-]+|(?:from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|\[[^\]]+\])(?:-\d+)?)\b/i;

const TARGET_EXTENSIONS = new Set([".css", ".ts", ".tsx", ".md"]);

function getFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        results.push(...getFiles(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (TARGET_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function scan() {
  const files = [];

  const readmePath = path.resolve(process.cwd(), "README.md");
  if (fs.existsSync(readmePath)) {
    files.push(readmePath);
  }

  const srcDir = path.resolve(process.cwd(), "src");
  if (fs.existsSync(srcDir)) {
    files.push(...getFiles(srcDir));
  }

  const errors = [];

  for (const filePath of files) {
    const relativePath = path.relative(process.cwd(), filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // 1. Substring "gradient" (case-insensitive)
      const gradientMatch = line.match(/gradient/i);
      if (gradientMatch) {
        errors.push(`${relativePath}:${lineNum} contains forbidden word "gradient"`);
      }

      // 2. Tailwind gradient classes (from-, via-, to-)
      const tailwindMatch = line.match(TAILWIND_GRADIENT_CLASS_REGEX);
      if (tailwindMatch && !gradientMatch) {
        errors.push(`${relativePath}:${lineNum} contains forbidden gradient class "${tailwindMatch[1]}"`);
      }

      // 3. Emojis / Pictographics (excluding allowlist)
      const emojiMatches = line.match(EMOJI_REGEX);
      if (emojiMatches) {
        for (const char of emojiMatches) {
          if (!ALLOWLIST.has(char)) {
            errors.push(`${relativePath}:${lineNum} contains forbidden emoji "${char}" (code: ${char.codePointAt(0)?.toString(16)})`);
          }
        }
      }
    });
  }

  if (errors.length > 0) {
    console.error(`Design rules check failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  } else {
    console.log(`Design rules check passed (scanned ${files.length} files). Zero gradients, zero emojis.`);
    process.exit(0);
  }
}

scan();
