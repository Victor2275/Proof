import { Jimp } from 'jimp';

async function main() {
  try {
    const image = await Jimp.read('public/logo.png');
    
    // First, crop out the massive black borders (Jimp's autocrop does this automatically for pure black/transparent)
    image.autocrop({ tolerance: 0.05 });
    
    // Now remove the black background smoothly
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      const max = Math.max(red, green, blue);
      
      if (max < 15) {
        this.bitmap.data[idx + 3] = 0; // completely transparent
      } else {
        const alpha = max;
        const alphaFactor = Math.pow(alpha / 255, 0.8) * 255;
        
        this.bitmap.data[idx + 0] = Math.min(255, (red * 255) / alpha);
        this.bitmap.data[idx + 1] = Math.min(255, (green * 255) / alpha);
        this.bitmap.data[idx + 2] = Math.min(255, (blue * 255) / alpha);
        this.bitmap.data[idx + 3] = alphaFactor;
      }
    });
    
    await image.write('public/logo.png');
    console.log('Background removed and saved to public/logo.png');
  } catch (err) {
    console.error('Error removing background:', err);
  }
}

main();
