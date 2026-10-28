/**
 * Zip fixtures for the tests. Imports nothing from `src/`.
 *
 * `rawZip` writes the archive by hand (stored entries) so that hostile shapes that `fflate` refuses
 * to build - duplicate names, `..` paths, backslashes - can be tested. `deflatedZip` uses `fflate`
 * to produce what real tools produce (compressed entries).
 */
import { zipSync } from 'fflate';
import { crc32 } from './png-encoder';

export interface RawEntry {
    name: string;
    data: Uint8Array;
}

function le16(n: number): number[] { return [n & 255, (n >>> 8) & 255]; }
function le32(n: number): number[] { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }

/** DOS date 1980-01-01 and time 00:00. */
const DOS_DATE = 0x0021;

export function rawZip(entries: RawEntry[]): Uint8Array {
    const enc = new TextEncoder();
    const chunks: number[][] = [];
    const central: number[][] = [];
    let offset = 0;
    for (const e of entries) {
        const name = Array.from(enc.encode(e.name));
        const crc = crc32(e.data);
        const local = [
            ...le32(0x04034b50), ...le16(20), ...le16(0), ...le16(0), ...le16(0), ...le16(DOS_DATE),
            ...le32(crc), ...le32(e.data.length), ...le32(e.data.length), ...le16(name.length), ...le16(0),
            ...name,
        ];
        chunks.push(local, Array.from(e.data));
        central.push([
            ...le32(0x02014b50), ...le16(20), ...le16(20), ...le16(0), ...le16(0), ...le16(0), ...le16(DOS_DATE),
            ...le32(crc), ...le32(e.data.length), ...le32(e.data.length), ...le16(name.length), ...le16(0),
            ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(offset), ...name,
        ]);
        offset += local.length + e.data.length;
    }
    const centralBytes = central.flat();
    const end = [
        ...le32(0x06054b50), ...le16(0), ...le16(0), ...le16(entries.length), ...le16(entries.length),
        ...le32(centralBytes.length), ...le32(offset), ...le16(0),
    ];
    return new Uint8Array([...chunks.flat(), ...centralBytes, ...end]);
}

/** Compressed archive in the order of `entries` (what Copilot Studio and zip tools produce). */
export function deflatedZip(entries: RawEntry[]): Uint8Array {
    const obj: Record<string, Uint8Array> = {};
    for (const e of entries) obj[e.name] = e.data;
    return zipSync(obj, { level: 6 });
}

/** Rewrites the uncompressed size that the central directory declares for `name` (zip bomb fixture). */
export function declareSize(zip: Uint8Array, name: string, size: number): Uint8Array {
    const out = zip.slice();
    const dv = new DataView(out.buffer);
    const enc = new TextEncoder().encode(name);
    for (let i = 0; i + 46 < out.length; i++) {
        if (dv.getUint32(i, true) !== 0x02014b50) continue;
        const nameLen = dv.getUint16(i + 28, true);
        const entryName = out.subarray(i + 46, i + 46 + nameLen);
        if (entryName.length === enc.length && entryName.every((b, k) => b === enc[k])) {
            dv.setUint32(i + 24, size >>> 0, true);
            return out;
        }
    }
    throw new Error(`declareSize: ${name} not found`);
}

/** Entries of an archive as `name -> bytes`, read with an independent route (`fflate`). */
export { unzipSync } from 'fflate';
