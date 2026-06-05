#!/usr/bin/env python3
"""Minimal blog server with static files and post API. Zero dependencies."""

import argparse
import base64
import json
import os
import sys
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

BLOG_DIR = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(BLOG_DIR, 'posts')


def read_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_manifest():
    path = os.path.join(POSTS_DIR, 'manifest.json')
    if os.path.exists(path):
        return read_json(path)
    return []


def save_manifest(manifest):
    manifest.sort(key=lambda p: p.get('date', ''), reverse=True)
    write_json(os.path.join(POSTS_DIR, 'manifest.json'), manifest)


def get_config():
    path = os.path.join(BLOG_DIR, 'config.json')
    if os.path.exists(path):
        return read_json(path)
    return {}


def generate_rss():
    manifest = get_manifest()
    cfg = get_config()
    title = cfg.get('title', 'Blog')
    items = ''
    for p in manifest[:20]:
        items += f'''    <item>
      <title>{p["title"]}</title>
      <link>post.html?id={p["id"]}</link>
      <description>{p.get("summary", "")}</description>
      <pubDate>{p["date"]}</pubDate>
    </item>
'''
    rss = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{title}</title>
    <link>index.html</link>
    <description>{title} RSS Feed</description>
{items}  </channel>
</rss>'''
    with open(os.path.join(BLOG_DIR, 'rss.xml'), 'w', encoding='utf-8') as f:
        f.write(rss)


class BlogHandler(SimpleHTTPRequestHandler):
    password = None  # Set by main

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BLOG_DIR, **kwargs)

    def check_auth(self):
        if not self.password:
            return True
        auth = self.headers.get('Authorization', '')
        return auth == f'Bearer {self.password}'

    def do_GET(self):
        # /api/user is unprotected for detection
        if self.path == '/api/config':
            path = os.path.join(BLOG_DIR, 'config.json')
            if os.path.exists(path):
                return self._json_response(read_json(path))
            return self._json_response({})
        if self.path == '/api/user':
            data = {'login': 'local'}
            if self.password:
                data['auth'] = True
            return self._json_response(data)
        if self.path == '/api/manifest':
            if not self.check_auth():
                return self._error(401, 'Unauthorized')
            return self._json_response(get_manifest())
        if self.path.startswith('/api/posts/'):
            if not self.check_auth():
                return self._error(401, 'Unauthorized')
            post_id = self.path[len('/api/posts/'):]
            path = os.path.join(POSTS_DIR, f'{post_id}.json')
            if os.path.exists(path):
                return self._json_response(read_json(path))
            return self._error(404, 'Post not found')
        # Fallback to static file serving
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/config':
            if not self.check_auth():
                return self._error(401, 'Unauthorized')
            body = self._read_body()
            path = os.path.join(BLOG_DIR, 'config.json')
            existing = read_json(path) if os.path.exists(path) else {}
            existing.update(body)
            write_json(path, existing)
            return self._json_response(existing)
        if self.path == '/api/upload':
            if not self.check_auth():
                return self._error(401, 'Unauthorized')
            body = self._read_body()
            data = body.get('data', '')
            filename = body.get('filename', 'image.png')
            # Strip data URL prefix if present
            if ',' in data:
                data = data.split(',', 1)[1]
            ext = os.path.splitext(filename)[1].lower() or '.png'
            if ext not in ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'):
                return self._error(400, 'Unsupported image format')
            img_dir = os.path.join(POSTS_DIR, 'images')
            os.makedirs(img_dir, exist_ok=True)
            name = f'{int(time.time()*1000)}{ext}'
            path = os.path.join(img_dir, name)
            with open(path, 'wb') as f:
                f.write(base64.b64decode(data))
            return self._json_response({'url': f'posts/images/{name}'})
        if self.path.startswith('/api/posts/'):
            if not self.check_auth():
                return self._error(401, 'Unauthorized')
            post_id = self.path[len('/api/posts/'):]
            body = self._read_body()

            # Save post file
            post_data = {
                'id': body.get('id', post_id),
                'title': body['title'],
                'date': body['date'],
                'tags': body['tags'],
                'summary': body['summary'],
                'content': body['content'],
                'draft': body.get('draft', False),
            }
            write_json(os.path.join(POSTS_DIR, f'{post_id}.json'), post_data)

            # Update manifest
            manifest = get_manifest()
            meta = {
                'id': post_data['id'],
                'title': post_data['title'],
                'date': post_data['date'],
                'tags': post_data['tags'],
                'summary': post_data['summary'],
                'draft': post_data['draft'],
            }
            idx = next((i for i, p in enumerate(manifest) if p['id'] == post_id), -1)
            if idx >= 0:
                manifest[idx] = meta
            else:
                manifest.append(meta)
            save_manifest(manifest)
            generate_rss()

            return self._json_response({'id': post_id})
        self._error(404, 'Not found')

    def do_DELETE(self):
        if self.path.startswith('/api/posts/'):
            if not self.check_auth():
                return self._error(401, 'Unauthorized')
            post_id = self.path[len('/api/posts/'):]
            path = os.path.join(POSTS_DIR, f'{post_id}.json')
            if os.path.exists(path):
                os.remove(path)

            manifest = get_manifest()
            manifest = [p for p in manifest if p['id'] != post_id]
            save_manifest(manifest)
            generate_rss()

            return self._json_response({'deleted': post_id})
        self._error(404, 'Not found')

    def _json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, status, message):
        self._json_response({'error': message}, status)

    def _read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def log_message(self, format, *args):
        # Quieter logging
        if '/api/' in (args[0] if args else ''):
            sys.stderr.write(f'[API] {args[0]}\n')
        else:
            super().log_message(format, *args)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Blog server')
    parser.add_argument('port', nargs='?', type=int, default=8080, help='Port (default: 8080)')
    parser.add_argument('--password', '-p', default='', help='API password (empty = no auth)')
    args = parser.parse_args()

    BlogHandler.password = args.password or None
    os.makedirs(POSTS_DIR, exist_ok=True)
    server = HTTPServer(('0.0.0.0', args.port), BlogHandler)
    print(f'Blog server running at http://localhost:{args.port}')
    print(f'Serving from: {BLOG_DIR}')
    if BlogHandler.password:
        print(f'Auth: enabled (password required)')
    else:
        print(f'Auth: disabled (no password set)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.server_close()
