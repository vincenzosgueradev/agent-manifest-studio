/**
 * In jsdom the global `Uint8Array` and the one returned by `TextEncoder` are from different
 * realms: `fflate` checks `instanceof Uint8Array`, takes files for folders and writes wrong zips.
 * The real browser has one realm, so this is not an app defect: the test is put in the same
 * condition. It must run BEFORE `fflate` is imported, which is why it lives in the setup file.
 */
const NodeUint8Array = new TextEncoder().encode('').constructor as Uint8ArrayConstructor;
if (globalThis.Uint8Array !== NodeUint8Array) {
    (globalThis as unknown as { Uint8Array: Uint8ArrayConstructor }).Uint8Array = NodeUint8Array;
}
