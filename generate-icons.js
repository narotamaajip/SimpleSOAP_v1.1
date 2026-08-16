import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// SVGs for icon generation

// 1. Icon mark SVG centered in 512x512 square (transparent background)
const iconSvgTransparent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(0, 4)">
    <!-- Smartphone Frame Silhouette -->
    <rect x="156" y="44" width="200" height="380" rx="34" fill="none" stroke="#10B981" stroke-width="22"/>
    
    <!-- Speaker/Sensor Notch -->
    <line x1="230" y1="70" x2="282" y2="70" stroke="#10B981" stroke-width="11" stroke-linecap="round"/>

    <!-- Sharp-edged Medical Cross (+) in medium-dark emerald -->
    <path d="M256 160v95M208.5 207.5h95" stroke="#059669" stroke-width="40" stroke-linecap="square" stroke-linejoin="miter"/>

    <!-- Supporting color accents (3 Data Lines) -->
    <line x1="195" y1="300" x2="317" y2="300" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
    <line x1="195" y1="332" x2="268" y2="332" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
    <line x1="195" y1="364" x2="295" y2="364" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
  </g>
</svg>
`;

// 2. Icon with white rounded-rectangle background for standard app icon
const iconSvgWithBg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Background -->
  <rect width="512" height="512" fill="#ffffff"/>
  
  <g transform="translate(0, 4)">
    <!-- Smartphone Frame Silhouette -->
    <rect x="156" y="44" width="200" height="380" rx="34" fill="none" stroke="#10B981" stroke-width="22"/>
    
    <!-- Speaker/Sensor Notch -->
    <line x1="230" y1="70" x2="282" y2="70" stroke="#10B981" stroke-width="11" stroke-linecap="round"/>

    <!-- Sharp-edged Medical Cross (+) in medium-dark emerald -->
    <path d="M256 160v95M208.5 207.5h95" stroke="#059669" stroke-width="40" stroke-linecap="square" stroke-linejoin="miter"/>

    <!-- Supporting color accents (3 Data Lines) -->
    <line x1="195" y1="300" x2="317" y2="300" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
    <line x1="195" y1="332" x2="268" y2="332" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
    <line x1="195" y1="364" x2="295" y2="364" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
  </g>
</svg>
`;

// 3. Maskable Icon with safe-zone padding (scaled down to 80% to fit within circle/squircle crop)
const iconSvgMaskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Background for maskable icon -->
  <rect width="512" height="512" fill="#ffffff"/>
  
  <!-- Centered and scaled to 78% for safe zone -->
  <g transform="translate(56, 56) scale(0.78)">
    <g transform="translate(0, 4)">
      <!-- Smartphone Frame Silhouette -->
      <rect x="156" y="44" width="200" height="380" rx="34" fill="none" stroke="#10B981" stroke-width="22"/>
      
      <!-- Speaker/Sensor Notch -->
      <line x1="230" y1="70" x2="282" y2="70" stroke="#10B981" stroke-width="11" stroke-linecap="round"/>

      <!-- Sharp-edged Medical Cross (+) in medium-dark emerald -->
      <path d="M256 160v95M208.5 207.5h95" stroke="#059669" stroke-width="40" stroke-linecap="square" stroke-linejoin="miter"/>

      <!-- Supporting color accents (3 Data Lines) -->
      <line x1="195" y1="300" x2="317" y2="300" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
      <line x1="195" y1="332" x2="268" y2="332" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
      <line x1="195" y1="364" x2="295" y2="364" stroke="#4B5563" stroke-width="13" stroke-linecap="round"/>
    </g>
  </g>
</svg>
`;

async function generate() {
  const iconsDir = path.resolve('public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. icon-512.png (512x512 with white background)
  await sharp(Buffer.from(iconSvgWithBg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('✓ Created public/icons/icon-512.png');

  // 2. icon-192.png (192x192 with white background)
  await sharp(Buffer.from(iconSvgWithBg))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('✓ Created public/icons/icon-192.png');

  // 3. icon-512-maskable.png (512x512 with safe area margin)
  await sharp(Buffer.from(iconSvgMaskable))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512-maskable.png'));
  console.log('✓ Created public/icons/icon-512-maskable.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(Buffer.from(iconSvgWithBg))
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // 5. favicon.ico (64x64 png as favicon or ico)
  await sharp(Buffer.from(iconSvgWithBg))
    .resize(64, 64)
    .png()
    .toFile(path.resolve('public/favicon.ico'));
  console.log('✓ Created public/favicon.ico');
}

generate().catch(console.error);
