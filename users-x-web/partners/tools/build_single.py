import sys, base64, os, re
S, F, OUT = sys.argv[1], sys.argv[2], sys.argv[3]   # deck folder, fonts folder, output file
s = open(os.path.join(S, 'index.html'), encoding='utf-8').read()
b64 = lambda path: base64.b64encode(open(path, 'rb').read()).decode()
AR = 'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC'
LA = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2190-2199, U+2212, U+FEFF, U+FFFD'
faces = [('Kufam', '700', 'kufam-%s-700-normal'), ('Kufam', '800', 'kufam-%s-800-normal'),
         ('IBM Plex Sans Arabic', '400', 'ibm-plex-sans-arabic-%s-400-normal'), ('IBM Plex Sans Arabic', '500', 'ibm-plex-sans-arabic-%s-500-normal'), ('IBM Plex Sans Arabic', '700', 'ibm-plex-sans-arabic-%s-700-normal'),
         ('Blaka', '400 800', 'blaka-%s-400-normal'), ('Changa', '800', 'changa-%s-800-normal'), ('Marhey', '700', 'marhey-%s-700-normal')]
css = []
for fam, w, pat in faces:
    for sub, rng in (('arabic', AR), ('latin', LA)):
        css.append("@font-face{font-family:'%s';font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}" % (fam, w, b64(os.path.join(F, pat % sub + '.woff2')), rng))
for fam, w, f in (('Handjet', '500 600', 'handjet-latin-500-normal'), ('Handjet', '700 800', 'handjet-latin-700-normal'), ('Space Mono', '400', 'space-mono-latin-400-normal'), ('Space Mono', '700', 'space-mono-latin-700-normal')):
    css.append("@font-face{font-family:'%s';font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, w, b64(os.path.join(F, f + '.woff2'))))
# drop the Google Fonts links, inline the faces
s = re.sub(r'<link rel="preconnect"[^>]*>\n', '', s)
s = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\n', '<style>' + ''.join(css) + '</style>\n', s)
# images
for name in os.listdir(os.path.join(S, 'assets')):
    full = os.path.join(S, 'assets', name)
    if os.path.isfile(full):
        mime = 'image/jpeg' if name.endswith('.jpg') else 'image/png'
        s = s.replace('assets/' + name, 'data:%s;base64,%s' % (mime, b64(full)))
# voice clips: an array of data URIs instead of file paths
clips = sorted(f for f in os.listdir(os.path.join(S, 'assets/voice')) if f.endswith('.mp3'))
data = ',\n'.join('"data:audio/mpeg;base64,%s"' % b64(os.path.join(S, 'assets/voice', f)) for f in clips)
old = "CLIP[t] = 'assets/voice/' + String(i).padStart(2, '0') + '.mp3';"
assert old in s
s = s.replace(old, 'CLIP[t] = VOICE_DATA[i];')
s = s.replace('  var CLIP = {};', '  var VOICE_DATA = [\n' + data + '\n];\n  var CLIP = {};', 1)
assert 'assets/' not in s.replace('assets/voice/NN.mp3', ''), [m for m in re.findall(r'assets/[\w./-]+', s)][:5]
doc = ('<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8">'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
       '<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style></head><body>\n' + s + '\n</body></html>\n')
open(OUT, 'w', encoding='utf-8').write(doc)
print('wrote', OUT, round(len(doc.encode()) / 1e6, 2), 'MB')
