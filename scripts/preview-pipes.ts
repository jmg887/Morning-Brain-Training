import { getConnections, type PipeType } from '../src/lib/pipeGenerator.ts';

const SIZE = 80;
const HALF = SIZE / 2;

function buildPipePath(connections: string[], half: number, size: number, inset: number): string {
  const parts: string[] = [];
  for (const dir of connections) {
    let x = 0, y = 0, w = 0, h = 0;
    switch (dir) {
      case 'up':
        x = half - size * 0.20 + inset; y = 0;
        w = size * 0.40 - inset * 2; h = half + size * 0.20 - inset;
        break;
      case 'down':
        x = half - size * 0.20 + inset; y = half - size * 0.20 + inset;
        w = size * 0.40 - inset * 2; h = half + size * 0.20 - inset;
        break;
      case 'left':
        x = 0; y = half - size * 0.20 + inset;
        w = half + size * 0.20 - inset; h = size * 0.40 - inset * 2;
        break;
      case 'right':
        x = half - size * 0.20 + inset; y = half - size * 0.20 + inset;
        w = half + size * 0.20 - inset; h = size * 0.40 - inset * 2;
        break;
    }
    parts.push(`M${x},${y}h${w}v${h}h${-w}z`);
  }
  return parts.join(' ');
}

const types: { type: PipeType; label: string }[] = [
  { type: 'straight', label: 'Straight' },
  { type: 'bend', label: 'Bend' },
  { type: 'tee', label: 'Tee' },
  { type: 'cross', label: 'Cross' },
  { type: 'dead', label: 'Dead End' },
];

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${5 * (SIZE + 20) + 20}" height="${types.length * 2 * (SIZE + 40) + 20}" viewBox="0 0 ${5 * (SIZE + 20) + 20} ${types.length * 2 * (SIZE + 40) + 20}">`;
svg += `<rect width="100%" height="100%" fill="#F0F0F0"/>`;

types.forEach(({ type, label }, row) => {
  for (let rot = 0; rot < (type === 'cross' ? 1 : 4); rot++) {
    const conns = getConnections(type, rot);
    const wallPath = buildPipePath(conns, HALF, SIZE, 0);
    const innerPath = buildPipePath(conns, HALF, SIZE, SIZE * 0.065);
    const col = rot % 5;
    const x = 10 + col * (SIZE + 20);
    const y = 10 + (row * 2) * (SIZE + 40);

    // Empty version
    svg += `<g transform="translate(${x},${y})">`;
    svg += `<rect width="${SIZE}" height="${SIZE}" rx="4" fill="#F5F5F5" stroke="#DDD" stroke-width="1"/>`;
    svg += `<path d="${wallPath}" fill="#777"/>`;
    svg += `<path d="${innerPath}" fill="#D0D0D0"/>`;
    svg += `</g>`;

    // Filled version
    const y2 = y + SIZE + 8;
    svg += `<g transform="translate(${x},${y2})">`;
    svg += `<rect width="${SIZE}" height="${SIZE}" rx="4" fill="#F5F5F5" stroke="#DDD" stroke-width="1"/>`;
    svg += `<path d="${wallPath}" fill="#777"/>`;
    svg += `<path d="${innerPath}" fill="#1CB0F6"/>`;
    svg += `</g>`;

    if (rot === 0) {
      svg += `<text x="${x + SIZE / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="#666" font-family="sans-serif">${label}</text>`;
    }
  }
});

svg += '</svg>';

import { writeFileSync } from 'fs';
writeFileSync('/home/z/my-project/upload/pipe-preview.svg', svg);
console.log('Saved to /home/z/my-project/upload/pipe-preview.svg');
