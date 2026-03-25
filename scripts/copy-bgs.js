import fs from 'fs';
import path from 'path';

const bgDir = path.join(process.cwd(), 'bg');
const source = path.join(bgDir, '001.jpg');

for (let i = 3; i <= 10; i++) {
  const filename = String(i).padStart(3, '0') + '.jpg';
  fs.copyFileSync(source, path.join(bgDir, filename));
}
console.log('Done');
