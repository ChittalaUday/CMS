import { Buffer } from 'buffer';

function parsePng(buffer: Buffer) {
  if (buffer.length < 24) return null;
  const width = buffer.readInt32BE(16);
  const height = buffer.readInt32BE(20);
  return { width, height };
}

function parseGif(buffer: Buffer) {
  if (buffer.length < 10) return null;
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return { width, height };
}

function parseJpg(buffer: Buffer) {
  if (buffer.length < 2) return null;
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null;
  
  let i = 2;
  while (i < buffer.length - 8) {
    if (buffer[i] === 0xFF) {
      const marker = buffer[i + 1];
      if (
        marker === 0xC0 || marker === 0xC1 || marker === 0xC2 || marker === 0xC3 ||
        marker === 0xC5 || marker === 0xC6 || marker === 0xC7 || marker === 0xC9 ||
        marker === 0xCA || marker === 0xCB || marker === 0xCD || marker === 0xCE ||
        marker === 0xCF
      ) {
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height };
      }
      const length = buffer.readUInt16BE(i + 2);
      i += 2 + length;
    } else {
      i++;
    }
  }
  return null;
}

function parseWebp(buffer: Buffer) {
  if (buffer.length < 30) return null;
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || webp !== 'WEBP') return null;

  const type = buffer.toString('ascii', 12, 16);
  if (type === 'VP8 ') {
    const w = buffer.readUInt16LE(26);
    const h = buffer.readUInt16LE(28);
    return { width: w & 0x3fff, height: h & 0x3fff };
  } else if (type === 'VP8L') {
    if (buffer[20] !== 0x2f) return null;
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    
    const width = 1 + (((b1 & 0x3F) << 8) | b0);
    const height = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6));
    return { width, height };
  } else if (type === 'VP8X') {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height };
  }
  return null;
}

function parseSvg(buffer: Buffer) {
  const content = buffer.toString('utf8');
  const svgTagMatch = content.match(/<svg[^>]*>/i);
  if (!svgTagMatch) return null;
  const svgTag = svgTagMatch[0];

  const widthMatch = svgTag.match(/width=["'](\d+(?:\.\d+)?)(?:px|em|rem|%)?["']/i);
  const heightMatch = svgTag.match(/height=["'](\d+(?:\.\d+)?)(?:px|em|rem|%)?["']/i);

  if (widthMatch && heightMatch) {
    return {
      width: Math.round(parseFloat(widthMatch[1])),
      height: Math.round(parseFloat(heightMatch[1])),
    };
  }

  const viewBoxMatch = svgTag.match(/viewBox=["']\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*["']/i);
  if (viewBoxMatch) {
    return {
      width: Math.round(parseFloat(viewBoxMatch[3])),
      height: Math.round(parseFloat(viewBoxMatch[4])),
    };
  }
  return null;
}

export function getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  try {
    if (mimeType === 'image/png') {
      return parsePng(buffer);
    }
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return parseJpg(buffer);
    }
    if (mimeType === 'image/gif') {
      return parseGif(buffer);
    }
    if (mimeType === 'image/webp') {
      return parseWebp(buffer);
    }
    if (mimeType === 'image/svg+xml') {
      return parseSvg(buffer);
    }
    
    // Fallback checks by signature
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return parsePng(buffer);
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      return parseJpg(buffer);
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return parseGif(buffer);
    }
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      return parseWebp(buffer);
    }
    if (buffer.toString('utf8', 0, 100).includes('<svg')) {
      return parseSvg(buffer);
    }
  } catch (e) {
    console.error('Error parsing image dimensions:', e);
  }
  return null;
}
