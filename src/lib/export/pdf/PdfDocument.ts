/**
 * A tiny, dependency-free PDF 1.4 writer: just enough for tabular reports.
 *
 * - Uses the built-in Helvetica / Helvetica-Bold fonts (no embedding), WinAnsi encoded.
 * - Coordinates passed to the drawing API are top-left based (like the DOM);
 *   they are flipped to PDF's bottom-left space internally.
 * - All output is 7-bit ASCII (non-ASCII bytes are written as octal escapes),
 *   so byte offsets in the xref table equal string lengths.
 */

export type PdfFont = 'regular' | 'bold';
export type RGB = [number, number, number];

export const A4 = { width: 595.28, height: 841.89 } as const;

// Helvetica advance widths (1/1000 em) for ASCII 32..126, from the standard AFM metrics.
// prettier-ignore
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** Unicode code points that WinAnsiEncoding places in the 0x80–0x9F range. */
const WIN_ANSI_EXTRAS: Record<number, number> = {
  0x20ac: 0x80, // €
  0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, // …
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94,
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

const EXTRA_WIDTHS: Record<number, number> = { 0x85: 1000, 0x95: 350, 0x96: 556, 0x97: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333 };

/** Converts a JS string to WinAnsi byte codes; unsupported characters become '?'. */
export function encodeWinAnsi(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 32 && cp <= 126) out.push(cp);
    else if (cp >= 0xa0 && cp <= 0xff) out.push(cp);
    else if (WIN_ANSI_EXTRAS[cp]) out.push(WIN_ANSI_EXTRAS[cp]);
    else if (cp === 9 || cp === 10 || cp === 13) out.push(32);
    else out.push(63);
  }
  return out;
}

function charWidth(code: number): number {
  if (code >= 32 && code <= 126) return HELVETICA_WIDTHS[code - 32];
  return EXTRA_WIDTHS[code] ?? 556;
}

/** Approximate rendered width in points. Bold is ~6% wider on average than regular Helvetica. */
export function measureText(text: string, font: PdfFont, size: number): number {
  const units = encodeWinAnsi(text).reduce((sum, c) => sum + charWidth(c), 0);
  return (units * size * (font === 'bold' ? 1.06 : 1)) / 1000;
}

/** Shortens text with an ellipsis so it fits within maxWidth. */
export function truncateText(text: string, maxWidth: number, font: PdfFont, size: number): string {
  if (measureText(text, font, size) <= maxWidth) return text;
  const chars = Array.from(text);
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measureText(chars.slice(0, mid).join('') + '…', font, size) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return chars.slice(0, lo).join('').trimEnd() + '…';
}

function pdfString(text: string): string {
  let s = '(';
  for (const code of encodeWinAnsi(text)) {
    if (code === 0x28 || code === 0x29 || code === 0x5c) s += '\\' + String.fromCharCode(code);
    else if (code < 32 || code > 126) s += '\\' + code.toString(8).padStart(3, '0');
    else s += String.fromCharCode(code);
  }
  return s + ')';
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const rgb = ([r, g, b]: RGB) => `${n(r / 255)} ${n(g / 255)} ${n(b / 255)}`;

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

interface TextOptions {
  font?: PdfFont;
  size?: number;
  color?: RGB;
  align?: 'left' | 'right' | 'center';
}

export class PdfPage {
  readonly ops: string[] = [];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  /** Draws text whose *baseline* sits at (x, y) from the top-left. */
  text(x: number, y: number, value: string, { font = 'regular', size = 10, color = [15, 23, 42], align = 'left' }: TextOptions = {}) {
    const w = align === 'left' ? 0 : measureText(value, font, size);
    const tx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    const fontRef = font === 'bold' ? 'F2' : 'F1';
    this.ops.push(`BT /${fontRef} ${n(size)} Tf ${rgb(color)} rg 1 0 0 1 ${n(tx)} ${n(this.height - y)} Tm ${pdfString(value)} Tj ET`);
  }

  rect(x: number, y: number, w: number, h: number, fill: RGB) {
    this.ops.push(`${rgb(fill)} rg ${n(x)} ${n(this.height - y - h)} ${n(w)} ${n(h)} re f`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.5) {
    this.ops.push(`${rgb(color)} RG ${n(width)} w ${n(x1)} ${n(this.height - y1)} m ${n(x2)} ${n(this.height - y2)} l S`);
  }

  circle(cx: number, cy: number, r: number, fill: RGB) {
    // Four Bézier arcs approximating a circle.
    const k = 0.5523 * r;
    const y = this.height - cy;
    this.ops.push(
      `${rgb(fill)} rg ${n(cx + r)} ${n(y)} m ` +
        `${n(cx + r)} ${n(y + k)} ${n(cx + k)} ${n(y + r)} ${n(cx)} ${n(y + r)} c ` +
        `${n(cx - k)} ${n(y + r)} ${n(cx - r)} ${n(y + k)} ${n(cx - r)} ${n(y)} c ` +
        `${n(cx - r)} ${n(y - k)} ${n(cx - k)} ${n(y - r)} ${n(cx)} ${n(y - r)} c ` +
        `${n(cx + k)} ${n(y - r)} ${n(cx + r)} ${n(y - k)} ${n(cx + r)} ${n(y)} c f`,
    );
  }
}

function pdfDate(d: Date): string {
  const p = (v: number) => String(v).padStart(2, '0');
  return `D:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

export class PdfDocument {
  readonly pages: PdfPage[] = [];

  constructor(private readonly info: { title: string; createdAt: Date }) {}

  addPage(width: number = A4.width, height: number = A4.height): PdfPage {
    const page = new PdfPage(width, height);
    this.pages.push(page);
    return page;
  }

  /** Serializes the document to a PDF string (pure ASCII). */
  build(): string {
    const objects: string[] = [];
    const add = (body: string) => objects.push(body) as number; // returns 1-based object id

    const catalogId = add('<< /Type /Catalog /Pages 2 0 R >>');
    add(''); // placeholder for the Pages tree (id 2), filled in below
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const infoId = add(
      `<< /Title ${pdfString(this.info.title)} /Producer (Spendwise) /CreationDate (${pdfDate(this.info.createdAt)}) >>`,
    );

    const pageIds: number[] = [];
    for (const page of this.pages) {
      const content = page.ops.join('\n');
      const contentId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      pageIds.push(
        add(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(page.width)} ${n(page.height)}] ` +
            `/Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentId} 0 R >>`,
        ),
      );
    }
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(out.length);
      out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefOffset = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return out;
  }

  toBlob(): Blob {
    const text = this.build();
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
    return new Blob([bytes], { type: 'application/pdf' });
  }
}
