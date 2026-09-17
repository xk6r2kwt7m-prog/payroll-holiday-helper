/**
 * Turns the plain text of a compliance document into on-screen reading sections.
 *
 * Pure functions only — no Deno or browser APIs — so the same logic runs in the
 * edge function that builds a reading version and in the automated tests.
 *
 * The original document is never modified: this only produces a readable copy.
 */

export interface RawSection {
  heading: string;
  body: string;
  source_page?: number | null;
}

const MAX_SECTION_CHARS = 2200;
const MIN_SECTION_CHARS = 120;

/** Collapses repeated blank lines and strips page furniture. */
export function tidyDocumentText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, "").replace(/^[ \t]+/g, ""))
    // Drop bare page numbers and "Page 3 of 12" style furniture.
    .filter((l) => !/^page\s+\d+(\s+of\s+\d+)?$/i.test(l.trim()))
    .filter((l) => !/^\d{1,3}$/.test(l.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when a line looks like a heading rather than body copy. */
export function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  if (/[.:;,]$/.test(t) && !/:$/.test(t)) return false;
  // Numbered headings: "1.", "1.2", "Section 4 —"
  if (/^(\d+(\.\d+)*[).:]?|section\s+\d+|part\s+[a-z0-9]+|appendix\s+[a-z0-9]+)\s+\S/i.test(t)) return true;
  // ALL CAPS lines
  const letters = t.replace(/[^a-z]/gi, "");
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;
  // Title Case short line with no sentence punctuation
  if (!/[.!?]/.test(t) && t.split(/\s+/).length <= 9 && /^[A-Z]/.test(t)) return true;
  return false;
}

function pushSection(out: RawSection[], heading: string, lines: string[]) {
  const body = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!body && !heading.trim()) return;
  out.push({ heading: heading.trim() || "Introduction", body });
}

/** Splits raw document text into ordered reading sections. */
export function splitIntoSections(rawText: string, fallbackTitle = "Document"): RawSection[] {
  const text = tidyDocumentText(rawText);
  if (!text) return [];

  const lines = text.split("\n");
  const sections: RawSection[] = [];
  let heading = "";
  let buffer: string[] = [];

  for (const line of lines) {
    if (looksLikeHeading(line) && (buffer.join("").trim().length >= MIN_SECTION_CHARS || sections.length === 0)) {
      if (buffer.join("").trim() || heading) pushSection(sections, heading, buffer);
      heading = line.trim();
      buffer = [];
      continue;
    }
    buffer.push(line);
  }
  pushSection(sections, heading, buffer);

  const usable = sections.filter((s) => s.body.trim() || s.heading.trim());
  const merged = mergeTinySections(usable);
  const split = merged.flatMap((s) => splitLongSection(s));

  if (split.length === 0) {
    return [{ heading: fallbackTitle, body: text }];
  }
  // A document with no headings at all reads better under its own name.
  if (split.length === 1 && split[0].heading === "Introduction") {
    split[0].heading = fallbackTitle;
  }
  return split;
}

/** Joins very short sections into the previous one so staff aren't tapping through scraps. */
export function mergeTinySections(sections: RawSection[]): RawSection[] {
  const out: RawSection[] = [];
  for (const s of sections) {
    const prev = out[out.length - 1];
    if (prev && s.body.trim().length < MIN_SECTION_CHARS) {
      prev.body = `${prev.body}\n\n${s.heading ? `${s.heading}\n` : ""}${s.body}`.trim();
      continue;
    }
    out.push({ ...s });
  }
  return out;
}

/** Breaks an over-long section into readable parts at paragraph boundaries. */
export function splitLongSection(section: RawSection): RawSection[] {
  if (section.body.length <= MAX_SECTION_CHARS) return [section];
  const paragraphs = section.body.split(/\n{2,}/);
  const parts: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && (current.length + p.length) > MAX_SECTION_CHARS) {
      parts.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.map((body, i) => ({
    heading: parts.length > 1 ? `${section.heading} (${i + 1} of ${parts.length})` : section.heading,
    body,
    source_page: section.source_page ?? null,
  }));
}
