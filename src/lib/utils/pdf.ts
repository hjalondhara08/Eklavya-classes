// Minimal, zero-dependency PDF generator.
//
// Builds a single-page A4 PDF from positioned text + line primitives and returns
// a Blob. This avoids pulling in a heavy library (jspdf/pdfkit) — keeping the
// client bundle tiny and the Vercel build light. It only supports the standard
// Helvetica fonts (WinAnsi), so all text is ASCII — the Rupee sign and other
// non-Latin glyphs are transliterated/stripped before rendering.

export interface PdfTextItem {
  text: string;
  x: number; // points from the left edge
  y: number; // points from the TOP edge (this generator flips to PDF's bottom-up space)
  size?: number; // default 11
  bold?: boolean;
}

export interface PdfLineItem {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number; // default 1
}

// A4 in PostScript points.
export const PDF_PAGE_W = 595.28;
export const PDF_PAGE_H = 841.89;

function escapePdfText(value: string): string {
  return String(value ?? '')
    .replace(/₹/g, 'Rs.') // ₹ -> Rs.
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, '') // drop any remaining non-ASCII (Helvetica/WinAnsi safe)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function generateSimplePdf(items: PdfTextItem[], lines: PdfLineItem[] = []): Blob {
  // ── Build the content stream ──
  let content = '';
  for (const ln of lines) {
    const w = ln.width ?? 1;
    content +=
      `${w} w ${ln.x1.toFixed(2)} ${(PDF_PAGE_H - ln.y1).toFixed(2)} m ` +
      `${ln.x2.toFixed(2)} ${(PDF_PAGE_H - ln.y2).toFixed(2)} l S\n`;
  }
  for (const it of items) {
    const size = it.size ?? 11;
    const font = it.bold ? '/F2' : '/F1';
    const py = (PDF_PAGE_H - it.y).toFixed(2);
    content += `BT ${font} ${size} Tf ${it.x.toFixed(2)} ${py} Td (${escapePdfText(it.text)}) Tj ET\n`;
  }

  // ── Assemble PDF objects ──
  const objects: string[] = [
    `<</Type/Catalog/Pages 2 0 R>>`,
    `<</Type/Pages/Kids[3 0 R]/Count 1>>`,
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PDF_PAGE_W.toFixed(2)} ${PDF_PAGE_H.toFixed(2)}]` +
      `/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>/Contents 4 0 R>>`,
    `<</Length ${content.length}>>\nstream\n${content}endstream`,
    `<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>`,
    `<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  const size = objects.length + 1;
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${size}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;

  // Latin1/byte-exact encoding so xref offsets (computed from char length) stay valid.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}
