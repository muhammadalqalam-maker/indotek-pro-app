import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const logoPath = path.join(publicDir, 'app-logo.png');
const iconSize = 512;

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generate() {
  const logo = await sharp(logoPath)
    .resize(320, 320, { fit: 'contain' })
    .png()
    .toBuffer();
  const circle = Buffer.from(
    `<svg width="${iconSize}" height="${iconSize}" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="256" r="195" fill="#F6F7F9"/></svg>`,
  );
  const icon = await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: { r: 15, g: 42, b: 74, alpha: 1 },
    },
  })
    .composite([
      { input: circle, top: 0, left: 0 },
      { input: logo, top: 96, left: 96 },
    ])
    .png()
    .toBuffer();

  await sharp(icon).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(icon).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(icon).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  await sharp(icon).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

  const favicon = await sharp(icon).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32.png'), favicon);

  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);
  icoHeader.writeUInt8(32, 6);
  icoHeader.writeUInt8(32, 7);
  icoHeader.writeUInt16LE(1, 10);
  icoHeader.writeUInt16LE(32, 12);
  icoHeader.writeUInt32LE(favicon.length, 14);
  icoHeader.writeUInt32LE(icoHeader.length, 18);
  fs.writeFileSync(
    path.join(publicDir, 'favicon.ico'),
    Buffer.concat([icoHeader, favicon]),
  );

  process.stdout.write('Successfully generated all PWA icons!\n');
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
