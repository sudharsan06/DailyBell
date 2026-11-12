/* eslint-env node */
/* DailyBell icon + store asset generator.
 * Usage (needs sharp: npm i -D sharp): node scripts/generate-icons.js . <outDir>
 * Regenerates Android mipmaps, iOS AppIcon set, assets/brand SVGs and Play Store assets. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const [, , ROOT, OUT] = process.argv;
const BRAND_DIR = path.join(ROOT, 'assets', 'brand');

// Brand palette (matches src/theme primary #5B5BD6)
const C = {
  bgTop: '#7373F2',
  bgBottom: '#3B3BB3',
  bell: '#FFFFFF',
  face: '#5B5BD6',
  faceDeep: '#4646C2',
  hands: '#FFFFFF',
  clapper: '#FBBF24',
  clapperDeep: '#F59E0B',
};

/**
 * The glyph: a bell whose body holds a clock face — "a bell that rings on your
 * schedule". Drawn in a 1024 box, centred on (512, 512).
 * mono = single-colour silhouette (Android 13 themed icons).
 */
const glyph = ({ mono = false } = {}) => {
  const fill = mono ? '#FFFFFF' : C.bell;
  const clock = mono
    ? '' // clock cut out via mask below
    : `
    <circle cx="512" cy="488" r="128" fill="url(#face)"/>
    ${[0, 90, 180, 270]
      .map(
        a =>
          `<rect x="506" y="372" width="12" height="30" rx="6" fill="#FFFFFF" fill-opacity="0.85" transform="rotate(${a} 512 488)"/>`,
      )
      .join('')}
    <rect x="503" y="400" width="18" height="98" rx="9" fill="${C.hands}"/>
    <rect x="503" y="420" width="18" height="80" rx="9" fill="${
      C.hands
    }" transform="rotate(118 512 488)"/>
    <circle cx="512" cy="488" r="17" fill="${C.clapper}"/>`;

  const monoMask = mono
    ? `<mask id="m"><rect width="1024" height="1024" fill="#fff"/>
         <circle cx="512" cy="488" r="128" fill="#000"/></mask>`
    : '';
  const monoHands = mono
    ? `<rect x="503" y="400" width="18" height="98" rx="9" fill="#fff"/>
       <rect x="503" y="420" width="18" height="80" rx="9" fill="#fff" transform="rotate(118 512 488)"/>
       <circle cx="512" cy="488" r="17" fill="#fff"/>`
    : '';

  return `
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.face}"/><stop offset="1" stop-color="${
    C.faceDeep
  }"/>
    </linearGradient>
    <linearGradient id="clap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${
        C.clapper
      }"/><stop offset="1" stop-color="${C.clapperDeep}"/>
    </linearGradient>
    ${monoMask}
  </defs>
  <!-- ring waves -->
  <g fill="none" stroke="${fill}" stroke-width="26" stroke-linecap="round" opacity="${
    mono ? 1 : 0.55
  }">
    <path d="M 262 330 A 300 300 0 0 0 232 470"/>
    <path d="M 762 330 A 300 300 0 0 1 792 470"/>
  </g>
  <g ${mono ? 'mask="url(#m)"' : ''}>
    <!-- handle -->
    <rect x="482" y="232" width="60" height="64" rx="24" fill="${fill}"/>
    <!-- bell body -->
    <path fill="${fill}" d="M512 268
      C 392 268 322 352 322 474 L 322 600
      C 322 650 296 686 262 712 L 762 712
      C 728 686 702 650 702 600 L 702 474
      C 702 352 632 268 512 268 Z"/>
    <!-- rim -->
    <rect x="236" y="700" width="552" height="58" rx="29" fill="${fill}"/>
  </g>
  ${monoHands}
  ${clock}
  <!-- clapper -->
  <circle cx="512" cy="800" r="46" fill="${mono ? '#fff' : 'url(#clap)'}"/>`;
};

const background = (w, h, rx = 0) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.bgTop}"/><stop offset="1" stop-color="${C.bgBottom}"/>
    </linearGradient>
    <radialGradient id="shine" cx="0.3" cy="0.2" r="0.8">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="${rx}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" rx="${rx}" fill="url(#shine)"/>`;

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

/** Full-bleed square icon (glyph scaled about centre). */
const iconSvg = ({ scale = 1.0, rx = 0, circle = false } = {}) => {
  const clip = circle
    ? `<clipPath id="c"><circle cx="512" cy="512" r="512"/></clipPath>`
    : '';
  return svg(
    1024,
    1024,
    `${clip}<g ${circle ? 'clip-path="url(#c)"' : ''}>${background(
      1024,
      1024,
      rx,
    )}
     <g transform="translate(512 512) scale(${scale}) translate(-512 -530)">${glyph()}</g></g>`,
  );
};

/** Android adaptive foreground: 108dp canvas, art inside the 66dp safe zone. */
const adaptiveFg = mono =>
  svg(
    1024,
    1024,
    `<g transform="translate(512 512) scale(0.75) translate(-512 -530)">${glyph(
      { mono },
    )}</g>`,
  );
const adaptiveBg = () => svg(1024, 1024, background(1024, 1024));

/** Play Store feature graphic 1024x500. */
const featureSvg = () => {
  const row = (y, time, name, state) => {
    const active = state === 'now';
    const done = state === 'done';
    return `
    <g transform="translate(640 ${y})">
      <rect width="310" height="64" rx="18" fill="#FFFFFF" fill-opacity="${
        active ? 1 : 0.14
      }"/>
      <circle cx="34" cy="32" r="10" fill="${
        active ? C.clapper : done ? '#A7F3D0' : '#FFFFFF'
      }" fill-opacity="${active || done ? 1 : 0.6}"/>
      <text x="58" y="28" font-family="Helvetica Neue" font-size="15" font-weight="500" fill="${
        active ? '#6B6BD8' : '#FFFFFF'
      }" fill-opacity="${active ? 1 : 0.75}">${time}</text>
      <text x="58" y="49" font-family="Helvetica Neue" font-size="19" font-weight="700" fill="${
        active ? '#1F1F4D' : '#FFFFFF'
      }"${
      done ? ' text-decoration="line-through" fill-opacity="0.7"' : ''
    }>${name}</text>
      ${
        active
          ? `<text x="292" y="40" text-anchor="end" font-family="Helvetica Neue" font-size="16" font-weight="700" fill="${C.face}">NOW</text>`
          : ''
      }
    </g>`;
  };
  return svg(
    1024,
    500,
    `${background(1024, 500)}
    <circle cx="930" cy="-40" r="220" fill="#FFFFFF" fill-opacity="0.06"/>
    <circle cx="80" cy="540" r="200" fill="#FFFFFF" fill-opacity="0.05"/>
    <g transform="translate(70 120)">
      <rect width="150" height="150" rx="36" fill="#FFFFFF" fill-opacity="0.14"/>
      <g transform="translate(75 75) scale(0.15) translate(-512 -530)">${glyph()}</g>
    </g>
    <text x="70" y="340" font-family="Helvetica Neue" font-size="64" font-weight="800" fill="#FFFFFF">DailyBell</text>
    <text x="72" y="384" font-family="Helvetica Neue" font-size="25" font-weight="500" fill="#FFFFFF" fill-opacity="0.88">Your daily timetable, with a bell</text>
    <text x="72" y="416" font-family="Helvetica Neue" font-size="25" font-weight="500" fill="#FFFFFF" fill-opacity="0.88">for every activity.</text>
    ${row(104, '9:30 AM – 11:00 AM', 'Office Work', 'done')}
    ${row(182, '11:15 AM – 12:45 PM', 'Deep Work', 'now')}
    ${row(260, '12:45 PM – 1:15 PM', 'Lunch', 'next')}
    ${row(338, '1:15 PM – 3:15 PM', 'Learning', 'next')}`,
  );
};

const png = (s, size, file, { flatten = false } = {}) => {
  let p = sharp(Buffer.from(s), { density: 72 * (size / 1024) * 4 }).resize(
    size,
    size,
  );
  if (flatten) p = p.flatten({ background: C.bgBottom }).removeAlpha();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return p.png({ compressionLevel: 9 }).toFile(file);
};

(async () => {
  fs.mkdirSync(BRAND_DIR, { recursive: true });
  fs.writeFileSync(path.join(BRAND_DIR, 'icon.svg'), iconSvg());
  fs.writeFileSync(
    path.join(BRAND_DIR, 'icon-foreground.svg'),
    adaptiveFg(false),
  );
  fs.writeFileSync(
    path.join(BRAND_DIR, 'icon-monochrome.svg'),
    adaptiveFg(true),
  );
  fs.writeFileSync(path.join(BRAND_DIR, 'feature-graphic.svg'), featureSvg());

  // ---- Android ----
  const res = path.join(ROOT, 'android/app/src/main/res');
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const dir = path.join(res, `mipmap-${d}`);
    await png(
      iconSvg({ rx: 180, scale: 1.0 }),
      48 * k,
      path.join(dir, 'ic_launcher.png'),
    );
    await png(
      iconSvg({ circle: true, scale: 0.92 }),
      48 * k,
      path.join(dir, 'ic_launcher_round.png'),
    );
    await png(
      adaptiveFg(false),
      108 * k,
      path.join(dir, 'ic_launcher_foreground.png'),
    );
    await png(
      adaptiveBg(),
      108 * k,
      path.join(dir, 'ic_launcher_background.png'),
    );
    await png(
      adaptiveFg(true),
      108 * k,
      path.join(dir, 'ic_launcher_monochrome.png'),
    );
  }
  const anydpi = path.join(res, 'mipmap-anydpi-v26');
  fs.mkdirSync(anydpi, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), adaptiveXml);

  // ---- iOS (no alpha; iOS applies its own corner mask) ----
  const iosDir = path.join(
    ROOT,
    'ios/DailyBell/Images.xcassets/AppIcon.appiconset',
  );
  const iosSpec = [
    ['iphone', 20, 2],
    ['iphone', 20, 3],
    ['iphone', 29, 2],
    ['iphone', 29, 3],
    ['iphone', 40, 2],
    ['iphone', 40, 3],
    ['iphone', 60, 2],
    ['iphone', 60, 3],
    ['ios-marketing', 1024, 1],
  ];
  const images = [];
  for (const [idiom, pt, sc] of iosSpec) {
    const px = pt * sc;
    const filename = `AppIcon-${pt}@${sc}x.png`;
    await png(iconSvg(), px, path.join(iosDir, filename), { flatten: true });
    images.push({ filename, idiom, scale: `${sc}x`, size: `${pt}x${pt}` });
  }
  fs.writeFileSync(
    path.join(iosDir, 'Contents.json'),
    JSON.stringify({ images, info: { author: 'xcode', version: 1 } }, null, 2) +
      '\n',
  );

  // ---- Play Store listing assets ----
  const store = path.join(OUT, 'DailyBell-PlayStore-Assets');
  fs.rmSync(store, { recursive: true, force: true });
  await png(iconSvg(), 512, path.join(store, 'play-store-icon-512.png'));
  await sharp(Buffer.from(featureSvg()), { density: 288 })
    .resize(1024, 500)
    .flatten({ background: C.bgBottom })
    .removeAlpha()
    .png()
    .toFile(path.join(store, 'feature-graphic-1024x500.png'));
  await png(iconSvg(), 1024, path.join(store, 'source/icon-1024.png'));
  await png(iconSvg(), 1024, path.join(store, 'app-store-icon-1024.png'), {
    flatten: true,
  });
  for (const f of fs.readdirSync(BRAND_DIR))
    fs.copyFileSync(path.join(BRAND_DIR, f), path.join(store, 'source', f));
  // Android launcher set, for reference
  for (const d of Object.keys(dens)) {
    const dir = path.join(store, 'android-launcher', `mipmap-${d}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(path.join(res, `mipmap-${d}`)))
      fs.copyFileSync(path.join(res, `mipmap-${d}`, f), path.join(dir, f));
  }
  fs.mkdirSync(path.join(store, 'android-launcher/mipmap-anydpi-v26'), {
    recursive: true,
  });
  for (const f of fs.readdirSync(anydpi))
    fs.copyFileSync(
      path.join(anydpi, f),
      path.join(store, 'android-launcher/mipmap-anydpi-v26', f),
    );
  console.log('done');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
