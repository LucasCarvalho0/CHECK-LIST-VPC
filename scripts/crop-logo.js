const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function crop() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fileData = fs.readFileSync(path.join(process.cwd(), 'public', 'grupo-sese.png')).toString('base64');
  
  await page.setContent(`
    <!DOCTYPE html>
    <html><body>
      <canvas id="c"></canvas>
    </body></html>
  `);

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
            // not white and not transparent
            if (a > 30 && !(r > 240 && g > 240 && b > 240)) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Add 15px padding
        const pad = 15;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(c.width - cropX, (maxX - minX) + pad * 2);
        const cropH = Math.min(c.height - cropY, (maxY - minY) + pad * 2);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = cropW;
        outCanvas.height = cropH;
        const outCtx = outCanvas.getContext('2d');
        outCtx.drawImage(c, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        resolve({
          box: { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY },
          dataUrl: outCanvas.toDataURL('image/png')
        });
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  }, fileData);

  console.log('Detected box:', result.box);
  const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(process.cwd(), 'public', 'grupo-sese.png'), Buffer.from(base64Data, 'base64'));
  fs.writeFileSync(path.join(process.cwd(), 'public', 'grupo-cce.png'), Buffer.from(base64Data, 'base64'));
  fs.writeFileSync(path.join(process.cwd(), 'public', 'cce.png'), Buffer.from(base64Data, 'base64'));
  console.log('Saved cropped logo to public/grupo-sese.png, public/grupo-cce.png, public/cce.png');
  await browser.close();
}

crop().catch(console.error);
