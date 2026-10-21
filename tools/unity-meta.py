#!/usr/bin/env python3
# يولّد ملفات .meta (GUID عشوائي) لأي ملف أو مجلد جديد تحت Assets قبل الـcommit.
# الاستخدام: python3 tools/unity-meta.py unity/FootballQuest/Assets
import os, sys, uuid
root = sys.argv[1]
TAIL = "  userData: \n  assetBundleName: \n  assetBundleVariant: \n"
def meta_for(path, is_dir):
    g = uuid.uuid4().hex
    head = f"fileFormatVersion: 2\nguid: {g}\n"
    if is_dir:
        return head + "folderAsset: yes\nDefaultImporter:\n  externalObjects: {}\n" + TAIL
    ext = os.path.splitext(path)[1]
    if ext == ".cs":
        return head + "MonoImporter:\n  externalObjects: {}\n  serializedVersion: 2\n  defaultReferences: []\n  executionOrder: 0\n  icon: {instanceID: 0}\n" + TAIL
    if ext == ".asmdef":
        return head + "AssemblyDefinitionImporter:\n  externalObjects: {}\n" + TAIL
    return head + "DefaultImporter:\n  externalObjects: {}\n" + TAIL
created = 0
for dirpath, dirnames, filenames in os.walk(root):
    for name in dirnames + filenames:
        if name.startswith(".") or name.endswith(".meta"):
            continue
        p = os.path.join(dirpath, name)
        m = p + ".meta"
        if not os.path.exists(m):
            with open(m, "w") as f:
                f.write(meta_for(p, os.path.isdir(p)))
            created += 1
print("created", created)
