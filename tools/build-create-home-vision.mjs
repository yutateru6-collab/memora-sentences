import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const screenshotsDir = process.env.SCREENSHOT_DIR || 'qa-create-home-artifacts/screenshots';
const visionDir = process.env.VISION_DIR || 'qa-create-home-artifacts/vision';
const WRAP = 2048;

const sources = [
  'desktop-1440x900-create-home-ai-preview.jpg',
  'iphone-16-create-home-ai-preview.jpg',
  'iphone-16-create-home-persona.png',
];

await fs.mkdir(visionDir, { recursive: true });
const manifest = { generatedAt: new Date().toISOString(), files: [] };

for (const file of sources) {
  const inputPath = `${screenshotsDir}/${file}`;
  try {
    const bytes = await fs.readFile(inputPath);
    const encoded = bytes.toString('base64');
    const lines = encoded.match(new RegExp(`.{1,${WRAP}}`, 'g')) || [];
    const output = `${visionDir}/${file}.b64`;
    await fs.writeFile(output, `${lines.join('\n')}\n`, 'utf8');
    manifest.files.push({
      source: file,
      base64: `vision/${file}.b64`,
      byteLength: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      base64LineLength: WRAP,
      base64LineCount: lines.length,
    });
  } catch (error) {
    manifest.files.push({ source: file, missing: true, error: String(error) });
  }
}

await fs.writeFile(`${visionDir}/manifest.json`, JSON.stringify(manifest, null, 2), 'utf8');
console.log(JSON.stringify(manifest, null, 2));
