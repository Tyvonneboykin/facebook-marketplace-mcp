import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'dist');
const metafilePath = path.join(distDir, 'esbuild-meta.json');
const metafile = JSON.parse(fs.readFileSync(metafilePath, 'utf8'));

const packages = new Set();
for (const input of Object.keys(metafile.inputs)) {
  const normalized = input.replaceAll('\\', '/');
  const marker = 'node_modules/';
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex < 0) continue;
  const parts = normalized.slice(markerIndex + marker.length).split('/');
  packages.add(parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]);
}

const sections = [
  'THIRD-PARTY SOFTWARE NOTICES',
  '',
  'This file is generated from the packages included in the committed esbuild bundle.',
  '',
];

for (const packageName of [...packages].sort()) {
  const packageRoot = path.join(repoRoot, 'node_modules', ...packageName.split('/'));
  const metadata = JSON.parse(
    fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  );
  const licenseFile = fs
    .readdirSync(packageRoot)
    .find((name) => /^(licen[cs]e|copying)(\..*)?$/i.test(name));
  if (!licenseFile) {
    throw new Error(`No license file found for bundled package ${packageName}`);
  }
  const licenseText = fs.readFileSync(path.join(packageRoot, licenseFile), 'utf8').trim();
  sections.push(
    '='.repeat(78),
    `${packageName} ${metadata.version} (${metadata.license ?? 'license file attached'})`,
    '='.repeat(78),
    licenseText,
    '',
  );
}

fs.writeFileSync(
  path.join(distDir, 'THIRD_PARTY_NOTICES.txt'),
  `${sections.join('\n')}\n`,
  'utf8',
);
fs.unlinkSync(metafilePath);
