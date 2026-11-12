/* eslint-env node */
/**
 * Builds the Play Store listing graphics from real app screenshots.
 *
 * Usage (needs sharp: npm i -D sharp):
 *   node scripts/generate-store-assets.js <rawScreenshotsDir> <outDir>
 *
 * rawScreenshotsDir must contain full-resolution device captures named:
 *   home.png, launcher2.png (widget), alarm.png, home_dark.png,
 *   edit_dark.png, settings_top.png
 *
 * Output:
 *   feature-graphic-1024x500.png   Play "Feature graphic" (no alpha)
 *   screenshots/0N-*.png           Captioned phone screenshots, 1080x1920 (9:16)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const [, , RAW, OUT] = process.argv;
const FONT = 'Helvetica Neue';

const C = {
  bgTop: '#7373F2',
  bgBottom: '#3B3BB3',
  greenTop: '#2FA866',
  greenBottom: '#145C34',
  amber: '#FBBF24',
};

const b64 = async (file, width) => {
  const buf = await sharp(path.join(RAW, file)).resize({ width }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  return { uri: `data:image/png;base64,${buf.toString('base64')}`, w: meta.width, h: meta.height };
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** A phone: dark bezel, rounded screen with the screenshot, small camera dot. */
const phone = (img, x, y, screenW, { rotate = 0, shadow = true } = {}) => {
  const screenH = Math.round((img.h / img.w) * screenW);
  const bez = Math.round(screenW * 0.035);
  const W = screenW + bez * 2;
  const H = screenH + bez * 2;
  const r = Math.round(screenW * 0.11);
  const id = `s${Math.random().toString(36).slice(2, 8)}`;
  return `
  <g transform="translate(${x} ${y}) rotate(${rotate} ${W / 2} ${H / 2})">
    <defs>
      <clipPath id="${id}"><rect x="${bez}" y="${bez}" width="${screenW}" height="${screenH}" rx="${r - bez}"/></clipPath>
    </defs>
    ${shadow ? `<rect x="${W * 0.04}" y="${H * 0.025}" width="${W}" height="${H}" rx="${r}" fill="#0B0B2A" opacity="0.28" filter="url(#blur)"/>` : ''}
    <rect width="${W}" height="${H}" rx="${r}" fill="#14141C"/>
    <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="${r - 1}" fill="none" stroke="#3A3A48" stroke-width="3"/>
    <image href="${img.uri}" x="${bez}" y="${bez}" width="${screenW}" height="${screenH}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="${W / 2}" cy="${bez + screenW * 0.045}" r="${screenW * 0.016}" fill="#0A0A0F"/>
  </g>`;
};

const defs = (top, bottom) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0.1" r="0.9">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>`;

// ---- feature graphic ---------------------------------------------------

const iconGlyph = fs
  .readFileSync(path.join(__dirname, '..', 'assets', 'brand', 'icon.svg'), 'utf8')
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');

const featureGraphic = async () => {
  const home = await b64('home.png', 420);
  const widget = await b64('launcher2.png', 420);
  const chip = (y, title, sub) => `
    <g transform="translate(64 ${y})">
      <circle cx="11" cy="11" r="11" fill="${C.amber}"/>
      <path d="M6 11.5 l3.5 3.5 l7 -8" fill="none" stroke="#3B3BB3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="34" y="10" font-family="${FONT}" font-size="20" font-weight="700" fill="#FFFFFF" dominant-baseline="middle">${esc(title)}</text>
      <text x="34" y="33" font-family="${FONT}" font-size="15" fill="#FFFFFF" fill-opacity="0.78" dominant-baseline="middle">${esc(sub)}</text>
    </g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
    ${defs(C.bgTop, C.bgBottom)}
    <rect width="1024" height="500" fill="url(#bg)"/>
    <rect width="1024" height="500" fill="url(#glow)"/>
    <circle cx="960" cy="-30" r="230" fill="#FFFFFF" fill-opacity="0.06"/>
    <circle cx="560" cy="560" r="180" fill="#FFFFFF" fill-opacity="0.05"/>

    <g transform="translate(64 52)">
      <svg width="76" height="76" viewBox="0 0 1024 1024"><clipPath id="ic"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#ic)">${iconGlyph}</g></svg>
    </g>
    <text x="156" y="90" font-family="${FONT}" font-size="50" font-weight="800" fill="#FFFFFF" dominant-baseline="middle">DailyBell</text>
    <text x="64" y="166" font-family="${FONT}" font-size="25" font-weight="600" fill="#FFFFFF">Your daily timetable,</text>
    <text x="64" y="198" font-family="${FONT}" font-size="25" font-weight="600" fill="#FFFFFF">with a bell for every activity.</text>

    ${chip(238, 'Live countdown', 'Know what is on now and what is next')}
    ${chip(298, 'Gentle bell reminders', 'Rings 3 times, even when the app is closed')}
    ${chip(358, 'Home-screen widget', 'Your day at a glance, without opening the app')}
    ${chip(418, '10 colours, light & dark', 'Works offline. No account, no ads')}

    ${phone(widget, 590, 72, 196, { rotate: -6 })}
    ${phone(home, 770, 44, 196, { rotate: 5 })}
  </svg>`;
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(1024, 500)
    .flatten({ background: C.bgBottom })
    .removeAlpha()
    .png()
    .toFile(path.join(OUT, 'feature-graphic-1024x500.png'));
};

// ---- captioned screenshots ----------------------------------------------

const SHOTS = [
  {
    file: 'home.png',
    title: ['Know what is on,', 'every minute'],
    sub: 'Live countdown for the activity you are in',
  },
  {
    file: 'launcher2.png',
    title: ['Your day on the', 'home screen'],
    sub: 'Countdown, up next and progress in one widget',
  },
  {
    file: 'alarm.png',
    title: ['A bell for', 'every activity'],
    sub: 'Rings 3 times, then stays quiet',
  },
  {
    file: 'home_dark.png',
    title: ['Light, dark and', '10 theme colours'],
    sub: 'Make DailyBell feel like yours',
    green: true,
  },
  {
    file: 'edit_dark.png',
    title: ['Edit your day', 'in seconds'],
    sub: 'Rename, retime, add or remove activities',
    green: true,
  },
  {
    file: 'settings_top.png',
    title: ['Reminders you', 'can rely on'],
    sub: 'Works offline. No account, no ads',
  },
];

const screenshot = async (shot, i) => {
  const img = await b64(shot.file, 760);
  const [top, bottom] = shot.green ? [C.greenTop, C.greenBottom] : [C.bgTop, C.bgBottom];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    ${defs(top, bottom)}
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <rect width="1080" height="1920" fill="url(#glow)"/>
    <circle cx="1010" cy="120" r="260" fill="#FFFFFF" fill-opacity="0.06"/>
    <text x="540" y="190" text-anchor="middle" font-family="${FONT}" font-size="84" font-weight="800" fill="#FFFFFF">${esc(shot.title[0])}</text>
    <text x="540" y="290" text-anchor="middle" font-family="${FONT}" font-size="84" font-weight="800" fill="#FFFFFF">${esc(shot.title[1])}</text>
    <text x="540" y="372" text-anchor="middle" font-family="${FONT}" font-size="38" font-weight="500" fill="#FFFFFF" fill-opacity="0.85">${esc(shot.sub)}</text>
    ${phone(img, 150, 450, 720)}
  </svg>`;
  const name = `${String(i + 1).padStart(2, '0')}-${path.basename(shot.file, '.png')}.png`;
  await sharp(Buffer.from(svg), { density: 96 })
    .resize(1080, 1920)
    .flatten({ background: bottom })
    .removeAlpha()
    .png()
    .toFile(path.join(OUT, 'screenshots', name));
};

(async () => {
  fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
  await featureGraphic();
  for (const [i, s] of SHOTS.entries()) await screenshot(s, i);
  console.log('done');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
