#!/usr/bin/env python3
"""咒语岛 update server — the publish half (the download half is plain nginx static files).

Layout under ROOT (served read-only by nginx at /spell-island/):
  latest.json                    what the apps check (keyless, public)
  web/<build>.json               one web release: {path: [sha256, size]}
  web/blobs/<sha256>             content-addressed files (deduplicated across releases)
  installers/<name>              DMG / APK

API (behind nginx at /spell-island/api/). Every request is signed, the key never travels:
  X-Spell-Time: <unix seconds>   X-Body-Sha256: <hex>   X-Spell-Sig: hex(HMAC-SHA256(key, METHOD\nPATH\nTIME\nBODY_SHA256))
  (requests older than 5 minutes, or whose body doesn't match X-Body-Sha256, are refused)
  POST /api/has            body {"hashes": [...]}  -> {"missing": [...]}
  PUT  /api/blob/<sha256>  raw body, verified against the hash
  PUT  /api/file/<rel>     raw body (web/<build>.json, installers/<name>), atomic write
  PUT  /api/latest         JSON body, validated, atomic switch (the moment a release goes live)
  POST /api/join           body {"rel": "installers/<name>", "parts": [sha256...], "sha256": <whole file>} glues blob parts
  POST /api/prune         body {"keep": ["<build>", ...]} removes old manifests, unreferenced blobs, old installers
Standard library only.
"""
import hashlib, hmac, json, os, re, sys, tempfile, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.environ.get('SPELL_ROOT', '/var/www/spell-island')
TOKEN = open(os.environ.get('SPELL_TOKEN_FILE', '/etc/spell-island/token')).read().strip()
PORT = int(os.environ.get('SPELL_PORT', '9311'))
HEX = re.compile(r'^[0-9a-f]{64}$')
SAFE = re.compile(r'^(web/[A-Za-z0-9._-]+\.json|installers/[A-Za-z0-9._-]+\.(dmg|apk))$')

def atomic_write(path, data_iter):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix='.up-')
    h = hashlib.sha256()
    try:
        with os.fdopen(fd, 'wb') as f:
            for chunk in data_iter:
                f.write(chunk); h.update(chunk)
        os.chmod(tmp, 0o644)
        return tmp, h.hexdigest()
    except Exception:
        os.unlink(tmp); raise

class H(BaseHTTPRequestHandler):
    server_version = 'spell-update/1'

    def _auth(self):
        t, body, sig = self.headers.get('X-Spell-Time', '0'), self.headers.get('X-Body-Sha256', ''), self.headers.get('X-Spell-Sig', '')
        try: fresh = abs(time.time() - int(t)) < 300
        except ValueError: fresh = False
        path = self.path.split('?')[0]
        want = hmac.new(TOKEN.encode(), f'{self.command}\n{path}\n{t}\n{body}'.encode(), hashlib.sha256).hexdigest()
        if not fresh or not HEX.match(body) or not hmac.compare_digest(want, sig):
            list(self._body_iter()); self._send(401, {'error': 'unauthorized'}); return False
        self.body_sha = body
        return True

    def _send(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def _body_iter(self):
        n = int(self.headers.get('Content-Length', '0'))
        while n > 0:
            c = self.rfile.read(min(1 << 20, n))
            if not c: break
            n -= len(c); yield c

    def _json(self):
        b = b''.join(self._body_iter())
        if hashlib.sha256(b).hexdigest() != self.body_sha: raise ValueError('body hash mismatch')
        return json.loads(b or b'{}')

    def do_POST(self):
        try: self._post()
        except Exception as e: self._send(400, {'error': str(e)[:200]})

    def do_PUT(self):
        try: self._put()
        except Exception as e: self._send(400, {'error': str(e)[:200]})

    def _post(self):
        if not self._auth(): return
        p = self.path.split('?')[0]
        if p.endswith('/api/has'):
            hs = [h for h in self._json().get('hashes', []) if HEX.match(h)]
            miss = [h for h in hs if not os.path.exists(os.path.join(ROOT, 'web/blobs', h))]
            return self._send(200, {'missing': miss})
        if p.endswith('/api/join'):
            # big installers arrive as content-addressed parts (uploaded like blobs, so they resume); glue them here
            j = self._json()
            rel, parts, want = j.get('rel', ''), j.get('parts', []), j.get('sha256', '')
            if not SAFE.match(rel) or not rel.startswith('installers/') or not HEX.match(want) or not parts or not all(HEX.match(x) for x in parts):
                return self._send(400, {'error': 'bad join'})
            srcs = [os.path.join(ROOT, 'web/blobs', x) for x in parts]
            miss = [x for x, s in zip(parts, srcs) if not os.path.exists(s)]
            if miss: return self._send(400, {'error': 'parts missing', 'missing': miss})
            def chunks():
                for s in srcs:
                    with open(s, 'rb') as f:
                        while True:
                            c = f.read(1 << 20)
                            if not c: break
                            yield c
            dst = os.path.join(ROOT, rel)
            tmp, got = atomic_write(dst, chunks())
            if got != want: os.unlink(tmp); return self._send(400, {'error': 'hash mismatch'})
            os.replace(tmp, dst)
            for s in set(srcs):
                try: os.unlink(s)
                except OSError: pass
            return self._send(200, {'ok': True, 'sha256': got})
        if p.endswith('/api/prune'):
            keep = set(self._json().get('keep', []))
            used, removed = set(), 0
            wdir = os.path.join(ROOT, 'web')
            for f in os.listdir(wdir) if os.path.isdir(wdir) else []:
                if not f.endswith('.json'): continue
                if f[:-5] in keep:
                    used.update(v[0] for v in json.load(open(os.path.join(wdir, f)))['files'].values())
                else:
                    os.unlink(os.path.join(wdir, f)); removed += 1
            bdir = os.path.join(wdir, 'blobs')
            for f in os.listdir(bdir) if os.path.isdir(bdir) else []:
                if f not in used: os.unlink(os.path.join(bdir, f)); removed += 1
            latest = json.load(open(os.path.join(ROOT, 'latest.json'))) if os.path.exists(os.path.join(ROOT, 'latest.json')) else {}
            want = {os.path.basename((latest.get(k) or {}).get('url', '')) for k in ('mac', 'android')}
            idir = os.path.join(ROOT, 'installers')
            for f in os.listdir(idir) if os.path.isdir(idir) else []:
                if f not in want: os.unlink(os.path.join(idir, f)); removed += 1
            return self._send(200, {'removed': removed})
        self._send(404, {'error': 'not found'})

    def _put(self):
        if not self._auth(): return
        p = self.path.split('?')[0]
        m = re.search(r'/api/blob/([0-9a-f]{64})$', p)
        if m:
            h = m.group(1); dst = os.path.join(ROOT, 'web/blobs', h)
            if h != self.body_sha: list(self._body_iter()); return self._send(400, {'error': 'hash mismatch'})
            if os.path.exists(dst): list(self._body_iter()); return self._send(200, {'ok': True, 'exists': True})
            tmp, got = atomic_write(dst, self._body_iter())
            if got != h: os.unlink(tmp); return self._send(400, {'error': 'hash mismatch'})
            os.replace(tmp, dst); return self._send(200, {'ok': True})
        m = re.search(r'/api/file/(.+)$', p)
        if m:
            rel = m.group(1)
            if not SAFE.match(rel): return self._send(400, {'error': 'bad path'})
            dst = os.path.join(ROOT, rel)
            tmp, got = atomic_write(dst, self._body_iter())
            if got != self.body_sha: os.unlink(tmp); return self._send(400, {'error': 'hash mismatch'})
            os.replace(tmp, dst); return self._send(200, {'ok': True, 'sha256': got})
        if p.endswith('/api/latest'):
            j = self._json()
            if j.get('app') != 'spell-island' or 'web' not in j: return self._send(400, {'error': 'bad latest'})
            if not os.path.exists(os.path.join(ROOT, 'web', j['web']['build'] + '.json')): return self._send(400, {'error': 'web manifest missing'})
            for k in ('mac', 'android'):
                if j.get(k) and not os.path.exists(os.path.join(ROOT, j[k]['url'])): return self._send(400, {'error': k + ' installer missing'})
            tmp, _ = atomic_write(os.path.join(ROOT, 'latest.json'), [json.dumps(j, ensure_ascii=False, indent=1).encode()])
            os.replace(tmp, os.path.join(ROOT, 'latest.json'))
            return self._send(200, {'ok': True})
        self._send(404, {'error': 'not found'})

    def log_message(self, fmt, *a):
        sys.stderr.write('%s %s\n' % (self.address_string(), fmt % a))

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'web/blobs'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'installers'), exist_ok=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
