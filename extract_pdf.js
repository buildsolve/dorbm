const fs = require('fs');
const buf = fs.readFileSync('C:/Users/Public/cakeerp/JNS_Maerz.pdf');
const str = buf.toString('latin1');
const matches = str.match(/\(([^\)\\]{2,80})\)/g) || [];
const lines = matches.map(m => m.slice(1,-1)).filter(l => /[A-Za-z0-9äöüß,\.\-]{2,}/.test(l));
console.log(lines.join('\n'));
