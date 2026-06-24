// Builds the React frontend and copies its output into backend/public,
// so NestJS can serve it as static files in a single deployable.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', '..', 'frontend');
const frontendDist = path.join(frontendDir, 'dist');
const backendPublic = path.join(__dirname, '..', 'public');

console.log('Installing frontend dependencies...');
execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });

console.log('Building frontend...');
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

console.log('Copying frontend/dist -> backend/public ...');
fs.rmSync(backendPublic, { recursive: true, force: true });
fs.cpSync(frontendDist, backendPublic, { recursive: true });

console.log('✓ Frontend ready at backend/public');
