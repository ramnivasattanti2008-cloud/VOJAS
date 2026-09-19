import { describe, it, expect } from 'vitest';
import { Jimp } from 'jimp';
import { MediaValidationService } from '../../src/services/mediaValidationService.js';

// Proves the perceptual-hash duplicate check actually discriminates —
// not just that it compiles. Images are generated in-memory so this has
// no external fixture files to keep in sync.
async function pngBuffer(fill: (x: number, y: number) => number): Promise<Buffer> {
  const image = new Jimp({ width: 64, height: 64, color: 0x000000ff });
  for (let x = 0; x < 64; x++) {
    for (let y = 0; y < 64; y++) {
      image.setPixelColor(fill(x, y), x, y);
    }
  }
  return image.getBuffer('image/png');
}

describe('MediaValidationService perceptual hashing', () => {
  const service = new MediaValidationService();

  it('computes null for non-image mime types', async () => {
    const hash = await service.computePerceptualHash(Buffer.from('not an image'), 'application/pdf');
    expect(hash).toBeNull();
  });

  it('computes null for undecodable image bytes rather than throwing', async () => {
    const hash = await service.computePerceptualHash(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]), 'image/jpeg');
    expect(hash).toBeNull();
  });

  it('gives an identical image a hash distance of 0 from itself', async () => {
    const buf = await pngBuffer((x, y) => ((x + y) % 2 === 0 ? 0xffffffff : 0x000000ff));
    const hashA = await service.computePerceptualHash(buf, 'image/png');
    const hashB = await service.computePerceptualHash(buf, 'image/png');
    expect(hashA).not.toBeNull();
    const match = service.findClosestMatch(hashA!, [{ mediaId: 'self', hash: hashB! }]);
    expect(match?.distance).toBe(0);
  });

  it('flags a re-encoded copy of the same image as a duplicate', async () => {
    // Same checkerboard pattern, generated and re-encoded independently —
    // simulates the real fraud pattern (same photo re-uploaded, possibly
    // recompressed) rather than comparing a buffer to itself byte-for-byte.
    const bufA = await pngBuffer((x, y) => ((x + y) % 2 === 0 ? 0xffffffff : 0x000000ff));
    const bufB = await pngBuffer((x, y) => ((x + y) % 2 === 0 ? 0xffffffff : 0x000000ff));
    const hashA = await service.computePerceptualHash(bufA, 'image/png');
    const hashB = await service.computePerceptualHash(bufB, 'image/png');

    const { signals } = await service.assessMediaForensics(
      __filename, // any real file path, just needs fs.statSync to succeed and report a size >= 1024 bytes
      bufA,
      'image/png',
      [{ mediaId: 'prior-upload', hash: hashB! }]
    );

    expect(signals.duplicateMedia).toBe(true);
    expect(signals.matchedMediaId).toBe('prior-upload');
  });

  it('does not flag a visually different image as a duplicate', async () => {
    // A DCT-based pHash deliberately ignores flat brightness/color (it's
    // built to survive lighting/exposure differences on the same real
    // photo) and hashes structure instead — so two genuinely different
    // *textures* are needed here, not just two different flat colors,
    // which would legitimately hash as near-identical (no texture either
    // way) and isn't the case this test is checking.
    const bufA = await pngBuffer((x, y) => ((x + y) % 2 === 0 ? 0xffffffff : 0x000000ff)); // fine checkerboard
    const bufB = await pngBuffer((x, y) => (x < 32 ? (y < 32 ? 0xffffffff : 0x000000ff) : (y < 32 ? 0x000000ff : 0xffffffff))); // coarse quadrants
    const hashA = await service.computePerceptualHash(bufA, 'image/png');
    const hashB = await service.computePerceptualHash(bufB, 'image/png');

    const { signals } = await service.assessMediaForensics(
      __filename,
      bufA,
      'image/png',
      [{ mediaId: 'unrelated-upload', hash: hashB! }]
    );

    expect(signals.duplicateMedia).toBe(false);
  });

  it('honestly reports AI-manipulation detection as unavailable rather than fabricating a verdict', async () => {
    const buf = await pngBuffer(() => 0xffffffff);
    const { signals } = await service.assessMediaForensics(__filename, buf, 'image/png', []);
    expect(signals.aiManipulationCheck).toBe('NOT_AVAILABLE');
    expect(signals.aiManipulationCheckReason).toMatch(/trained classifier|detection API/);
  });
});
