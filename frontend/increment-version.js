import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionFile = path.join(__dirname, 'version.json');
const version = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));

version.patch += 1;

fs.writeFileSync(versionFile, JSON.stringify(version, null, 2) + '\n');
console.log(`📦 Version incremented to ${version.major}.${version.minor}.${version.patch}`);
