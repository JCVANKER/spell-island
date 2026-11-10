#!/usr/bin/env python3
"""Wrap a raw HFS+ volume image into a compressed Apple UDIF (.dmg, UDZO / zlib).

Usage: python3 udif.py volume.img out.dmg
Layout is "NONE" (the whole image is one Apple_HFS partition), like `hdiutil create -layout NONE`.
"""
import plistlib, struct, sys, uuid, zlib

SECTOR = 512
CHUNK_SECTORS = 512          # 256 KiB per chunk, like hdiutil
ZLIB, RAW, ZERO, END = 0x80000005, 0x00000001, 0x00000002, 0xFFFFFFFF
CRC32 = 2


def checksum_blob(crc: int) -> bytes:
    return struct.pack('>II', CRC32, 32) + struct.pack('>I', crc) + b'\0' * 124


def main(src, dst):
    data = open(src, 'rb').read()
    if len(data) % SECTOR:
        data += b'\0' * (SECTOR - len(data) % SECTOR)
    total = len(data) // SECTOR
    chunks, out = [], open(dst, 'wb')
    off = 0
    data_crc = 0
    for s in range(0, total, CHUNK_SECTORS):
        n = min(CHUNK_SECTORS, total - s)
        piece = data[s * SECTOR:(s + n) * SECTOR]
        if piece.count(0) == len(piece):
            chunks.append((ZERO, s, n, off, 0))
            continue
        comp = zlib.compress(piece, 9)
        if len(comp) < len(piece):
            chunks.append((ZLIB, s, n, off, len(comp)))
            blob = comp
        else:
            chunks.append((RAW, s, n, off, len(piece)))
            blob = piece
        out.write(blob)
        data_crc = zlib.crc32(blob, data_crc)
        off += len(blob)
    chunks.append((END, total, 0, off, 0))
    data_len = off
    part_crc = zlib.crc32(data) & 0xFFFFFFFF

    mish = struct.pack('>4sIQQQII', b'mish', 1, 0, total, 0, 0x208, 0)
    mish += b'\0' * 24 + checksum_blob(part_crc) + struct.pack('>I', len(chunks))
    for t, s, n, o, l in chunks:
        mish += struct.pack('>IIQQQQ', t, 0, s, n, o, l)

    name = 'disk image (Apple_HFS : 0)'
    plist = plistlib.dumps({'resource-fork': {'blkx': [{
        'Attributes': '0x0050', 'CFName': name, 'Data': mish, 'ID': '0', 'Name': name,
    }]}}, fmt=plistlib.FMT_XML)
    xml_off = data_len
    out.write(plist)

    master = zlib.crc32(struct.pack('>I', part_crc)) & 0xFFFFFFFF
    koly = struct.pack('>4sIIIQQQQQII16s', b'koly', 4, 512, 1, 0, 0, data_len, 0, 0, 1, 1, uuid.uuid4().bytes)
    koly += checksum_blob(data_crc & 0xFFFFFFFF)
    koly += struct.pack('>QQ', xml_off, len(plist))
    koly += b'\0' * 120
    koly += checksum_blob(master)
    koly += struct.pack('>IQIII', 1, total, 0, 0, 0)
    assert len(koly) == 512, len(koly)
    out.write(koly)
    out.close()
    print(f'{dst}: {total * SECTOR / 1e6:.0f} MB → {(data_len + len(plist) + 512) / 1e6:.0f} MB')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
