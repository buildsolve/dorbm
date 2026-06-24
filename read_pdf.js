const fs = require('fs');
const { execSync } = require('child_process');
try {
  execSync('npm install pdf-parse --no-save 2>&1', { stdio: 'pipe', cwd: 'C:\\Users\\Public\\cakeerp\\backend' });
} catch(e) {}
const pdfParse = require('C:\\Users\\Public\\cakeerp\\backend\\node_modules\\pdf-parse');
const buf = fs.readFileSync('C:\\Users\\User\\Desktop\\trello tasks.pdf');
pdfParse(buf).then(d => {
  console.log('PAGES:', d.numpages);
  // Print first 8000 chars
  console.log(d.text.substring(0, 8000));
}).catch(e => console.error('ERROR:', e.message));
