/**
 * Which video codec a file actually carries.
 *
 * The MIME type is not enough. An iPhone recording "High Efficiency" video
 * produces an .mp4 that is served as video/mp4 and is perfectly valid — but the
 * picture inside is H.265/HEVC, which Chrome on Windows and Android cannot
 * decode. The browser reports it as "No video with supported format and MIME
 * type found", which reads as a broken file rather than an unplayable codec.
 *
 * MP4 and QuickTime name the codec with a four-character code in the sample
 * description, inside the `moov` atom. Phone and camera exports put `moov` near
 * the front, so the first megabyte is far more than enough to find it.
 */
const HEAD_BYTES = 1024 * 1024;

/** Everything a browser is guaranteed to play, and the ones that fail. */
const UNPLAYABLE: Record<string, string> = {
  hvc1: "H.265 / HEVC",
  hev1: "H.265 / HEVC",
  // Apple's editing codecs; enormous, and no browser decodes them.
  apcn: "Apple ProRes",
  apch: "Apple ProRes",
  apcs: "Apple ProRes",
  ap4h: "Apple ProRes",
};

const PLAYABLE = ["avc1", "avc3", "vp08", "vp09", "av01"];

export type CodecCheck =
  | { ok: true }
  | { ok: false; codec: string; label: string };

/**
 * Scans the head of a file for a codec four-character code.
 *
 * Unknown is treated as fine: this exists to catch the one mistake that keeps
 * happening, not to become a gatekeeper that blocks a valid upload it failed to
 * recognise.
 */
export async function checkVideoCodec(file: File): Promise<CodecCheck> {
  let head: string;
  try {
    const buffer = await file.slice(0, HEAD_BYTES).arrayBuffer();
    // latin1 maps each byte to one character, so byte offsets survive intact.
    head = new TextDecoder("latin1").decode(new Uint8Array(buffer));
  } catch {
    return { ok: true };
  }

  const firstAt = (tag: string) => head.indexOf(tag);

  // A file can name several codecs; the one that appears first is the picture.
  let earliest: { at: number; tag: string } | null = null;
  for (const tag of [...Object.keys(UNPLAYABLE), ...PLAYABLE]) {
    const at = firstAt(tag);
    if (at === -1) continue;
    if (!earliest || at < earliest.at) earliest = { at, tag };
  }

  if (earliest && UNPLAYABLE[earliest.tag]) {
    return { ok: false, codec: earliest.tag, label: UNPLAYABLE[earliest.tag] };
  }
  return { ok: true };
}
