#!/usr/bin/env python3
"""Local static preview with the extensionless HTML URLs used by Vercel."""
import argparse
import io
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        resolved = super().translate_path(path)
        candidate = Path(resolved)
        if not candidate.exists() and not candidate.suffix and candidate.with_suffix('.html').is_file():
            return str(candidate.with_suffix('.html'))
        return resolved

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_head(self):
        """Answer byte-range requests with 206, as Vercel does, so videos can seek."""
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers.get('Range', '').strip())
        path = Path(self.translate_path(self.path))
        if not match or not path.is_file():
            return super().send_head()
        size = path.stat().st_size
        first, last = match.groups()
        start = int(first) if first else max(0, size - int(last or 0))
        end = min(int(last), size - 1) if first and last else size - 1
        if start >= size or start > end:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        with path.open('rb') as handle:
            handle.seek(start)
            body = handle.read(end - start + 1)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        return io.BytesIO(body)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT)))
    print(f'Paktum local preview: http://localhost:{args.port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
