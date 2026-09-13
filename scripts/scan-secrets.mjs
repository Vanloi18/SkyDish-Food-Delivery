import fs from 'fs';
import { execSync } from 'child_process';

const filesOutput = execSync('git ls-files', { encoding: 'utf-8' });
const files = filesOutput.split('\n').map(f => f.trim()).filter(f => f.length > 0);

const secretPatterns = [
  { name: 'Stripe Live Key', regex: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'Stripe Secret Key (generic)', regex: /sk_test_[0-9a-zA-Z]{24,}/ },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private Key', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH)? ?PRIVATE KEY-----/ },
  { name: 'GitHub Token', regex: /gh[pousr]_[0-9a-zA-Z]{36}/ },
  { name: 'Generic API Key pattern', regex: /api[_-]?key\s*[:=]\s*['"][0-9a-zA-Z]{20,}['"]/i }
];

const skipFiles = [
  'scripts/scan-secrets.mjs',
  'audit/',
  'test-results/',
  'package-lock.json'
];

let violations = [];

for (const file of files) {
  if (skipFiles.some(skip => file.startsWith(skip))) continue;
  if (!fs.existsSync(file)) continue;
  
  try {
    const content = fs.readFileSync(file, 'utf-8');
    for (const pattern of secretPatterns) {
      if (pattern.regex.test(content)) {
        violations.push({
          file,
          rule: pattern.name
        });
      }
    }
  } catch (err) {
    // binary file or read error
  }
}

console.log('=== SECRET SCAN REPORT ===');
console.log(`Scanned ${files.length} tracked files.`);
if (violations.length === 0) {
  console.log('STATUS: PASS — No secrets detected in tracked files.');
  process.exit(0);
} else {
  console.warn(`STATUS: FAIL — Detected ${violations.length} potential secrets:`);
  violations.forEach(v => console.warn(` - ${v.file}: ${v.rule}`));
  process.exit(1);
}
