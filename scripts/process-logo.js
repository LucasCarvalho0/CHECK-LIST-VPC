const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function processLogo() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fileData = fs.readFileSync(path.join(process.cwd(), 'Grupo-Sesé.png')).toString('base64');

  await page.setContent(`<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>`);

  const result = await page.evaluate(async (b64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.getElementById('c');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);

        let minX = c.width, maxX = 0, minY = c.height, maxY = 0;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            const idx = (y * c.width + x) * 4;
            const r = data.data[idx], g = data.data[idx+1], b = data.data[idx+2], a = data.data[idx+3];
            // Not white and has opacity (the blue text)
            if (a > 30 && (r < 230 || g < 230 || b < 230)) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const padX = 16;
        const padY = 16;
        const cropX = Math.max(0, minX - padX);
        const cropY = Math.max(0, minY - padY);
        const cropW = Math.min(c.width - cropX, (maxX - minX) + padX * 2);
        const cropH = Math.min(c.height - cropY, (maxY - minY) + padY * 2);

        // 1. Transparent PNG with original blue letters
        const cBlue = document.createElement('canvas');
        cBlue.width = cropW;
        cBlue.height = cropH;
        const ctxBlue = cBlue.getContext('2d');
        const imgData = ctx.getImageData(cropX, cropY, cropW, cropH);

        for (let i = 0; i < imgData.data.length; i += 4) {
          const r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
          // If pixel is near-white, make it transparent
          if (r > 235 && g > 235 && b > 235) {
            imgData.data[i+3] = 0;
          } else {
            // Anti-aliasing smoothing for edges
            const brightness = (r + g + b) / 3;
            if (brightness > 180) {
              const alphaRatio = 1 - ((brightness - 180) / (255 - 180));
              imgData.data[i+3] = Math.round(255 * Math.max(0, Math.min(1, alphaRatio)));
            }
          }
        }
        ctxBlue.putImageData(imgData, 0, 0);

        // 2. White letters version (for dark backgrounds)
        const cWhite = document.createElement('canvas');
        cWhite.width = cropW;
        cWhite.height = cropH;
        const ctxWhite = cWhite.getContext('2d');
        const whiteData = ctxBlue.getImageData(0, 0, cropW, cropH);
        for (let i = 0; i < whiteData.data.length; i += 4) {
          if (whiteData.data[i+3] > 0) {
            whiteData.data[i] = 255;
            whiteData.data[i+1] = 255;
            whiteData.data[i+2] = 255;
          }
        }
        ctxWhite.putImageData(whiteData, 0, 0);

        resolve({
          box: { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY },
          blueUrl: cBlue.toDataURL('image/png'),
          whiteUrl: cWhite.toDataURL('image/png')
        });
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  }, fileData);

  console.log('Processed box:', result.box);

  const blueB64 = result.blueUrl.replace(/^data:image\/png;base64,/, '');
  const whiteB64 = result.whiteUrl.replace(/^data:image\/png;base64,/, '');

  fs.writeFileSync(path.join(process.cwd(), 'public', 'grupo-sese.png'), Buffer.from(blueB64, 'base64'));
  fs.writeFileSync(path.join(process.cwd(), 'public', 'grupo-sese-white.png'), Buffer.from(whiteB64, 'base64'));
  fs.writeFileSync(path.join(process.cwd(), 'public', 'cce.png'), Buffer.from(blueB64, 'base64'));
  fs.writeFileSync(path.join(process.cwd(), 'public', 'grupo-cce.png'), Buffer.from(blueB64, 'base64'));

  console.log('Logos successfully generated!');
  await browser.close();
}

processLogo().catch(console.error);
