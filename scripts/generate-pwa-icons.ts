import { getBrowser, closeBrowser } from '../lib/server/pdf';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function generateIcons() {
  const logoBase64 = readFileSync(join(process.cwd(), 'public', 'nissan.png')).toString('base64');
  const browser = await getBrowser();

  const sizes = [
    { name: 'icon-192.png', size: 192, pad: 20 },
    { name: 'icon-512.png', size: 512, pad: 60 },
    { name: 'icon-maskable-192.png', size: 192, pad: 40, bg: '#ffffff' },
    { name: 'icon-maskable-512.png', size: 512, pad: 100, bg: '#ffffff' },
    { name: 'apple-touch-icon.png', size: 180, pad: 20, bg: '#ffffff' },
  ];

  for (const { name, size, pad, bg } of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const background = bg ? bg : 'transparent';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: ${size}px;
            height: ${size}px;
            background: ${background};
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          img {
            max-width: ${size - pad * 2}px;
            max-height: ${size - pad * 2}px;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="data:image/png;base64,${logoBase64}" />
      </body>
      </html>
    `;
    await page.setContent(html);
    const buffer = await page.screenshot({ omitBackground: !bg });
    writeFileSync(join(process.cwd(), 'public', name), buffer);
    console.log(`Generated public/${name} (${size}x${size})`);
    await page.close();
  }

  await browser.close();
  console.log('All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
