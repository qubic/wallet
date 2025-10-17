const fs = require('fs');
const path = require('path');

// Read package.json version
const packageJson = require('../package.json');
const version = packageJson.version;

console.log(`Updating version to ${version}...`);

// Update environment.ts
const envPath = path.join(__dirname, '../src/environments/environment.ts');
let envContent = fs.readFileSync(envPath, 'utf8');
envContent = envContent.replace(/version:\s*'[^']*'/, `version: '${version}'`);
fs.writeFileSync(envPath, envContent);

// Update environment.prod.ts
const envProdPath = path.join(__dirname, '../src/environments/environment.prod.ts');
let envProdContent = fs.readFileSync(envProdPath, 'utf8');
envProdContent = envProdContent.replace(/version:\s*'[^']*'/, `version: '${version}'`);
fs.writeFileSync(envProdPath, envProdContent);

console.log('✅ Version updated successfully!');
