/**
 * Server-only binary resume decoding (PDF / DOCX / plain text).
 *
 * The server runtime is a Worker: native parsers such as `pdf-parse`, `mammoth`
 * or `sharp` are unavailable, so this module implements the two container
 * formats we accept in pure JavaScript on top of Web standard APIs:
 *
 *  - `DecompressionStream("deflate-raw")` for DEFLATE payloads (PDF
 *    `/FlateDecode` content streams and DOCX ZIP entries),
 *  - `TextDecoder` for byte → string conversion.
 *
 * Memory safety: every loop is bounded (stream count, per-stream size, total
 * decoded characters) so a 10 MB resume can never balloon the Worker heap, and
 * decoding stops as soon as enough text has been collected.
 */

/** Hard cap on characters returned for a single document. */
export const MAX_RESUME_CHARS = 40_000;

/** Largest single compressed stream we will attempt to inflate (bytes). */
const MAX_STREAM_BYTES = 4_000_000;

/** Upper bound on PDF content streams inspected, newest-first order aside. */
const MAX_PDF_STREAMS = 400;

/** Supported upload formats, used for validation messages. */
export type ResumeFormat = "pdf" | "docx" | "text" | "unsupported";

/** Detects the container format from mime type and file name. */
export function detectResumeFormat(mimeType: string | null, fileName: string | null): ResumeFormat {
  const mime = (mimeType ?? "").toLowerCase();
  const name = (fileName ?? "").toLowerCase();

  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (
    mime.includes("officedocument.wordprocessingml") ||
    mime.includes("msword") ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (
    mime.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".rtf")
  ) {
    return "text";
  }
  return "unsupported";
}

/** Inflates a raw DEFLATE (or zlib-wrapped) buffer. Returns null on failure. */
async function inflate(bytes: Uint8Array, zlibWrapped: boolean): Promise<Uint8Array | null> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_STREAM_BYTES) return null;
  if (typeof DecompressionStream === "undefined") return null;

  try {
    const format = zlibWrapped ? "deflate" : "deflate-raw";
    const stream = new Blob([bytes as unknown as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream(format));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

/**
 * Inflates a PDF/ZIP payload, trying the zlib header first and falling back to
 * raw DEFLATE (some producers omit the 2-byte header).
 */
async function inflateEither(bytes: Uint8Array): Promise<Uint8Array | null> {
  const looksZlib = bytes.length > 2 && (bytes[0]! & 0x0f) === 8;
  return (await inflate(bytes, looksZlib)) ?? (await inflate(bytes, !looksZlib));
}

/* --------------------------------- PDF ------------------------------------ */

/** Decodes an ASCII85 (`/ASCII85Decode`) stream body. */
function decodeAscii85(bytes: Uint8Array): Uint8Array | null {
  let input = new TextDecoder("latin1").decode(bytes).replace(/\s+/g, "");
  if (input.startsWith("<~")) input = input.slice(2);
  const end = input.indexOf("~>");
  if (end !== -1) input = input.slice(0, end);

  const out: number[] = [];
  let tuple: number[] = [];

  for (const char of input) {
    if (char === "z" && tuple.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    const code = char.charCodeAt(0) - 33;
    if (code < 0 || code > 84) return null;
    tuple.push(code);
    if (tuple.length === 5) {
      let value = 0;
      for (const digit of tuple) value = value * 85 + digit;
      out.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
      tuple = [];
    }
  }

  if (tuple.length > 1) {
    const missing = 5 - tuple.length;
    let value = 0;
    for (const digit of [...tuple, ...Array.from({ length: missing }, () => 84)]) {
      value = value * 85 + digit;
    }
    const decoded = [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
    out.push(...decoded.slice(0, 4 - missing));
  }

  return new Uint8Array(out);
}

/** Decodes an ASCIIHex (`/ASCIIHexDecode`) stream body. */
function decodeAsciiHex(bytes: Uint8Array): Uint8Array {
  const hex = new TextDecoder("latin1").decode(bytes).split(">")[0]!.replace(/[^0-9a-fA-F]/g, "");
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Filters we can undo in pure JavaScript, in the order PDF applies them. */
const SUPPORTED_FILTERS = new Set(["FlateDecode", "ASCII85Decode", "ASCIIHexDecode"]);

/** Reads the `/Filter` entry of a stream dictionary as an ordered list. */
function readFilters(dict: string): string[] {
  const match = /\/Filter\s*(\[[^\]]*\]|\/[A-Za-z0-9]+)/.exec(dict);
  if (!match) return [];
  return Array.from(match[1]!.matchAll(/\/([A-Za-z0-9]+)/g)).map((entry) => entry[1]!);
}

/** Applies a stream's filter chain, returning null when it cannot be undone. */
async function applyFilters(bytes: Uint8Array, filters: string[]): Promise<Uint8Array | null> {
  let current: Uint8Array | null = bytes;
  for (const filter of filters) {
    if (!current) return null;
    if (!SUPPORTED_FILTERS.has(filter)) return null;
    if (filter === "FlateDecode") current = await inflateEither(current);
    else if (filter === "ASCII85Decode") current = decodeAscii85(current);
    else current = decodeAsciiHex(current);
  }
  return current;
}


const PDF_ESCAPES: Record<string, string> = {
  n: "\n",
  r: "\n",
  t: " ",
  b: "",
  f: "",
};

/** Decodes a PDF string literal body (already stripped of its parentheses). */
function decodePdfLiteral(body: string): string {
  let out = "";
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i]!;
    if (char !== "\\") {
      out += char;
      continue;
    }
    const next = body[i + 1];
    if (next === undefined) break;
    if (next >= "0" && next <= "7") {
      let octal = "";
      let j = i + 1;
      while (j < body.length && octal.length < 3 && body[j]! >= "0" && body[j]! <= "7") {
        octal += body[j];
        j += 1;
      }
      const code = Number.parseInt(octal, 8);
      out += code >= 32 && code < 256 ? String.fromCharCode(code) : " ";
      i = j - 1;
      continue;
    }
    out += PDF_ESCAPES[next] ?? next;
    i += 1;
  }
  return out;
}

/** Decodes a UTF-16BE hex string literal (`<00480069>`). */
function decodePdfHex(body: string): string {
  const hex = body.replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  // Heuristic: 4-digit groups are UTF-16BE, 2-digit groups are single bytes.
  if (hex.length % 4 === 0 && /00/.test(hex)) {
    for (let i = 0; i + 3 < hex.length; i += 4) {
      const code = Number.parseInt(hex.slice(i, i + 4), 16);
      if (code >= 32) out += String.fromCharCode(code);
    }
    return out;
  }
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const code = Number.parseInt(hex.slice(i, i + 2), 16);
    if (code >= 32) out += String.fromCharCode(code);
  }
  return out;
}

/**
 * Pulls text out of a decoded PDF content stream by walking the text-showing
 * operators (`Tj`, `'`, `"`, `TJ`) and inserting line breaks on `Td`/`TD`/`T*`
 * positioning and `ET` block ends.
 */
function readPdfContentStream(content: string): string {
  const pieces: string[] = [];
  const tokenRegex =
    /\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]*>|\bT[Jj]\b|'|"|\bT[dD]\b|\bT\*|\bET\b|\bTd\b/g;

  let pending: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(content)) !== null) {
    const token = match[0];
    if (token.startsWith("(")) {
      pending.push(decodePdfLiteral(token.slice(1, -1)));
    } else if (token.startsWith("<")) {
      pending.push(decodePdfHex(token.slice(1, -1)));
    } else if (token === "Tj" || token === "TJ" || token === "'" || token === '"') {
      if (pending.length) {
        pieces.push(pending.join(""));
        pending = [];
      }
    } else {
      if (pending.length) {
        pieces.push(pending.join(""));
        pending = [];
      }
      pieces.push("\n");
    }
  }
  if (pending.length) pieces.push(pending.join(""));

  return pieces
    .join("")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Extracts text from a PDF, inflating `/FlateDecode` content streams.
 *
 * Streams are processed one at a time and released immediately, so peak memory
 * stays proportional to the largest single stream rather than the whole file.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const latin = new TextDecoder("latin1").decode(bytes);
  const collected: string[] = [];
  let total = 0;
  let streams = 0;
  let cursor = 0;

  while (streams < MAX_PDF_STREAMS && total < MAX_RESUME_CHARS) {
    const streamStart = latin.indexOf("stream", cursor);
    if (streamStart === -1) break;

    // Dictionary preceding the stream keyword decides whether it is compressed.
    const dictStart = Math.max(0, latin.lastIndexOf("<<", streamStart));
    const dict = latin.slice(dictStart, streamStart);

    let bodyStart = streamStart + "stream".length;
    if (latin[bodyStart] === "\r") bodyStart += 1;
    if (latin[bodyStart] === "\n") bodyStart += 1;

    const bodyEnd = latin.indexOf("endstream", bodyStart);
    if (bodyEnd === -1) break;
    cursor = bodyEnd + "endstream".length;
    streams += 1;

    // Skip images, fonts and metadata — they hold no page text.
    if (/\/Subtype\s*\/(Image|Type1C|TrueType|CIDFontType\d)/.test(dict)) continue;
    if (/\/Type\s*\/(XObject|Font|Metadata)/.test(dict) && !/\/Type\s*\/Page/.test(dict)) continue;

    const length = bodyEnd - bodyStart;
    if (length <= 0 || length > MAX_STREAM_BYTES) continue;

    const filters = readFilters(dict);
    let content: string;
    if (filters.length === 0) {
      content = latin.slice(bodyStart, bodyEnd);
    } else {
      const decoded = await applyFilters(bytes.subarray(bodyStart, bodyEnd), filters);
      if (!decoded) continue;
      content = new TextDecoder("latin1").decode(decoded);
    }

    if (!/T[Jj]|\bTd\b|\bTf\b/.test(content)) continue;

    const text = readPdfContentStream(content);
    if (text.trim().length === 0) continue;

    collected.push(text);
    total += text.length;
  }

  return collected.join("\n").slice(0, MAX_RESUME_CHARS);
}

/* --------------------------------- DOCX ----------------------------------- */

interface ZipEntry {
  name: string;
  method: number;
  offset: number;
  compressedSize: number;
}

/** Reads the ZIP central directory (little-endian) without buffering entries. */
function readZipEntries(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const limit = Math.max(0, bytes.byteLength - 22);

  let eocd = -1;
  for (let i = limit; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) return [];

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  const decoder = new TextDecoder("utf-8");

  for (let i = 0; i < count && offset + 46 <= bytes.byteLength; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    entries.push({ name, method, offset: localOffset, compressedSize });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

/** Reads and inflates a single ZIP entry body. */
async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (entry.offset + 30 > bytes.byteLength) return "";
  if (view.getUint32(entry.offset, true) !== 0x04034b50) return "";

  const nameLength = view.getUint16(entry.offset + 26, true);
  const extraLength = view.getUint16(entry.offset + 28, true);
  const start = entry.offset + 30 + nameLength + extraLength;
  const size =
    entry.compressedSize > 0 ? entry.compressedSize : Math.max(0, bytes.byteLength - start);
  const body = bytes.subarray(start, Math.min(bytes.byteLength, start + size));

  if (entry.method === 0) return new TextDecoder("utf-8").decode(body);
  if (entry.method !== 8) return "";

  const inflated = await inflate(body, false);
  return inflated ? new TextDecoder("utf-8").decode(inflated) : "";
}

/** Converts WordprocessingML into readable plain text. */
function wordXmlToText(xml: string): string {
  return xml
    .replace(/<w:tab[^>]*\/?>/g, " ")
    .replace(/<w:br[^>]*\/?>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Extracts text from a DOCX package by reading `word/document.xml` (plus
 * headers, footers and footnotes when present) out of the ZIP container.
 */
export async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const entries = readZipEntries(bytes);
  if (entries.length === 0) return "";

  const wanted = entries.filter(
    (entry) =>
      entry.name === "word/document.xml" ||
      /^word\/(header|footer|footnotes|endnotes)\d*\.xml$/.test(entry.name),
  );
  wanted.sort((a, b) => (a.name === "word/document.xml" ? -1 : b.name === "word/document.xml" ? 1 : 0));

  const parts: string[] = [];
  let total = 0;
  for (const entry of wanted) {
    if (total >= MAX_RESUME_CHARS) break;
    const xml = await readZipEntry(bytes, entry);
    if (!xml) continue;
    const text = wordXmlToText(xml).trim();
    if (!text) continue;
    parts.push(text);
    total += text.length;
  }

  return parts.join("\n\n").slice(0, MAX_RESUME_CHARS);
}

/* ------------------------------- Plain text -------------------------------- */

/** Decodes a payload that is already text-like; returns "" for binary input. */
export function extractPlainText(bytes: Uint8Array): string {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(
    bytes.subarray(0, Math.min(bytes.byteLength, MAX_RESUME_CHARS * 2)),
  );
  const printable = decoded.replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]/g, "");
  if (printable.length / Math.max(decoded.length, 1) < 0.85) return "";
  return printable.slice(0, MAX_RESUME_CHARS);
}

/** Decodes any supported resume container into plain text. */
export async function extractTextFromBytes(
  bytes: Uint8Array,
  format: ResumeFormat,
): Promise<string> {
  switch (format) {
    case "pdf":
      return extractPdfText(bytes);
    case "docx":
      return extractDocxText(bytes);
    case "text":
      return extractPlainText(bytes);
    default: {
      // Best effort for an unknown mime type: sniff the magic bytes.
      if (bytes[0] === 0x25 && bytes[1] === 0x50) return extractPdfText(bytes);
      if (bytes[0] === 0x50 && bytes[1] === 0x4b) return extractDocxText(bytes);
      return extractPlainText(bytes);
    }
  }
}
