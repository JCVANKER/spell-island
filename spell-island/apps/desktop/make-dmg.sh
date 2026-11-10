#!/usr/bin/env bash
# Linux 上制作 Mac 安装盘（.dmg）：ad-hoc 签名 → HFS+ 卷（libguestfs 写入）→ UDIF zlib 压缩
# 依赖：rcodesign、hfsprogs（mkfs.hfsplus）、libguestfs-tools + libguestfs-hfsplus、python3
# 在 macOS 上更简单：codesign --force --deep -s - xxx.app && hdiutil create -srcfolder stage -format UDZO xxx.dmg
set -euo pipefail
cd "$(dirname "$0")"
APP_NAME="咒语岛"
APP="release/mac-arm64/${APP_NAME}.app"
VOL="${APP_NAME}"
OUT="release/${APP_NAME}-1.3.1-arm64.dmg"
WORK="release/dmg-work"

rcodesign sign "$APP" >/dev/null
rm -rf "$WORK" && mkdir -p "$WORK/stage"
cp -a "$APP" "$WORK/stage/"
cp dmg-readme.txt "$WORK/stage/打开前必读.txt"

SIZE_MB=$(( $(du -sm "$WORK/stage" | cut -f1) * 115 / 100 + 40 ))
truncate -s "${SIZE_MB}M" "$WORK/volume.img"
mkfs.hfsplus -v "$VOL" "$WORK/volume.img" >/dev/null
export LIBGUESTFS_BACKEND=direct
guestfish -a "$WORK/volume.img" -m /dev/sda:/:defaults:hfsplus <<EOF
copy-in $WORK/stage/${APP_NAME}.app $WORK/stage/打开前必读.txt /
ln-s /Applications /Applications
ll /
vfs-label /dev/sda
EOF
fsck.hfsplus -n "$WORK/volume.img" || true
python3 udif.py "$WORK/volume.img" "$OUT"
echo "DMG → $OUT"
