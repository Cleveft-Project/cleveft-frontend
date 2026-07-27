import { File as NativeFile } from 'expo-file-system';
import { cacheDirectory as legacyCacheDirectory, copyAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Builds the multipart file part for a lecture upload.
 *
 * The two platforms need genuinely different objects here, and getting this
 * wrong fails silently in a way that looks like a backend problem:
 *
 * - **Native.** The classic React Native shorthand — appending a plain
 *   `{uri, name, type}` descriptor and letting the bridge stream the file off
 *   disk — does NOT work here. Expo's own `fetch`/`FormData` (installed
 *   globally as of SDK 56, for React Server Components support) replaces
 *   React Native's networking layer and only accepts a real Blob-like part: it
 *   checks for an object with a `.bytes()` method, and a plain descriptor
 *   object has none, so it throws `Unsupported FormDataPart implementation`.
 *   `expo-file-system`'s `File` class does implement that interface, so it's
 *   used to wrap the recorder's on-disk URI instead.
 * - **Web.** A plain descriptor object is just a plain object there too, so
 *   `FormData.append` stringifies it to `"[object Object]"` and posts a *text*
 *   field named `file`. Spring then reports `Required part 'file' is not
 *   present`, because a text field is not a file part. The recorder hands back
 *   a `blob:` URL, so the blob has to be fetched back out and appended as a
 *   real File.
 */

/** Extension per MIME type, so the name always matches the bytes. */
const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/webm': 'webm',
};

export interface AudioPart {
  /** Appended straight into FormData. */
  part: Blob;
  fileName: string;
  mimeType: string;
}

/**
 * Strips codec parameters: MediaRecorder reports `audio/webm;codecs=opus`, but
 * the transcription provider expects a bare type and rejects the parameterised
 * form outright.
 */
export function normaliseMimeType(raw: string | undefined | null, fallback: string): string {
  if (!raw) {
    return fallback;
  }
  const bare = raw.split(';')[0].trim().toLowerCase();
  return bare.startsWith('audio/') ? bare : fallback;
}

function extensionFor(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? 'webm';
}

export async function buildAudioPart(
  uri: string,
  baseName: string,
  fallbackMimeType: string,
): Promise<AudioPart> {
  if (Platform.OS !== 'web') {
    const file = new NativeFile(uri);
    // `type` is derived by the native module from the file's on-disk
    // extension, which is more reliable than our own guess — fall back to it
    // only if the file genuinely has no detectable type.
    const mimeType = file.type || fallbackMimeType;
    return {
      part: file,
      fileName: file.name,
      mimeType,
    };
  }

  // Reading a blob: URL back through fetch is the supported way to recover the
  // Blob the recorder produced.
  const response = await fetch(uri);
  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error('The recording produced no audio data.');
  }

  const mimeType = normaliseMimeType(blob.type, fallbackMimeType);
  const fileName = `${baseName}.${extensionFor(mimeType)}`;

  // Re-wrap so the part carries the normalised type and a real filename; the
  // backend prefers the extension over the declared content type.
  //
  // `globalThis.File` deliberately, not the imported one: expo-file-system's
  // `File` is a disk handle taking a URI, and importing it unqualified used to
  // shadow the DOM constructor here — silently breaking every web upload.
  return {
    part: new globalThis.File([blob], fileName, { type: mimeType }),
    fileName,
    mimeType,
  };
}

/**
 * The same platform dance, for a file the student picked rather than recorded.
 *
 * Shares {@link buildAudioPart}'s rules — see the note at the top of this file
 * — plus one that only applies to picked files.
 *
 * **A picked file is not ours to read.** A recording is written by this app
 * into its own sandbox, so `File` can read it directly. A file chosen through
 * the system picker belongs to whichever app provided it (Drive, Files, a
 * download), and Android hands over a `content://` URI carrying a temporary
 * grant. `expo-file-system`'s `File` is sandbox-scoped and refuses it outright
 * with "Missing 'READ' permission for accessing the file" — thrown from
 * `.bytes()`, deep inside `fetch`, which is why it first looked like a network
 * failure.
 *
 * The legacy `copyAsync` goes through Android's ContentResolver, which *is*
 * allowed to read that URI. Copying into our own cache first turns a file we
 * may not touch into one we own, after which everything downstream is ordinary.
 * The copy is unconditional rather than attempted-then-recovered, because the
 * URI shape depends on the providing app and is not worth predicting.
 */
export async function buildFilePart(
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<{ part: Blob; fileName: string }> {
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((response) => response.blob());
    return {
      part: new globalThis.File([blob], fileName, { type: mimeType }),
      fileName,
    };
  }

  if (!legacyCacheDirectory) {
    throw new Error('No cache directory is available to copy the file into.');
  }

  // Anything outside this set can be a path separator or need escaping once it
  // is spliced into a URI. The timestamp keeps two imports of the same filename
  // from colliding.
  const safeName = (fileName || 'import').replace(/[^A-Za-z0-9._-]+/g, '_');
  const destination = `${legacyCacheDirectory}cleveft-${Date.now()}-${safeName}`;

  try {
    await copyAsync({ from: uri, to: destination });
  } catch (copyError) {
    /*
     * Fallback: read the bytes ourselves.
     *
     * expo-file-system refuses any path outside this experience's sandbox,
     * which under Expo Go excludes the host app's own picker cache. React
     * Native's XMLHttpRequest has no such notion — it hands `file://` and
     * `content://` straight to the platform loader — so it can reach files
     * expo-file-system will not touch.
     *
     * Second rather than first because the copy keeps the bytes off the JS
     * thread; this route pulls the whole PDF into memory.
     */
    try {
      const blob = await readAsBlob(uri);
      return {
        part: new globalThis.File([blob], safeName, { type: mimeType }),
        fileName: safeName,
      };
    } catch (readError) {
      throw new Error(
        `copy failed (${uri} -> ${destination}): ` +
          `${(copyError as Error)?.message ?? String(copyError)} | ` +
          `direct read also failed: ${(readError as Error)?.message ?? String(readError)}`,
      );
    }
  }

  const file = new NativeFile(destination);

  // Compared against `false` rather than tested for truthiness: if this build
  // of expo-file-system does not expose `exists`, the property is `undefined`
  // and a plain `!file.exists` would throw on every successful copy.
  if ((file as { exists?: boolean }).exists === false) {
    throw new Error(`copy reported success but ${destination} does not exist`);
  }

  return { part: file, fileName: file.name || safeName };
}

/** Reads a local URI into a Blob via the platform loader, bypassing sandboxing. */
function readAsBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.responseType = 'blob';
    request.onload = () => {
      if (request.response) {
        resolve(request.response as Blob);
      } else {
        reject(new Error('the file read returned no data'));
      }
    };
    request.onerror = () => reject(new Error('XMLHttpRequest could not read the file'));
    request.open('GET', uri, true);
    request.send(null);
  });
}

/**
 * Picks the recording container for web.
 *
 * Browsers disagree on what MediaRecorder can produce, and the transcription
 * provider does not accept everything they can make. Preference order runs from
 * best-supported-upstream to most-widely-available, so Safari and Chrome each
 * land on something the backend can actually transcribe.
 */
export function preferredWebMimeType(): string | undefined {
  if (Platform.OS !== 'web' || typeof MediaRecorder === 'undefined') {
    return undefined;
  }

  const candidates = [
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/webm;codecs=opus',
    'audio/webm',
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}
