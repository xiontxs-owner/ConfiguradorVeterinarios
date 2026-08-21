#!/usr/bin/env python3
"""
Servidor local del configurador (archivos estáticos + API).

Uso, desde esta carpeta:
    python3 server.py

Luego abre en Chrome:
    http://127.0.0.1:8765/

No abras index.html con doble clic (file://). El micrófono y la cámara
necesitan http://localhost o https://.
"""

from __future__ import annotations

import json
import socket
import sqlite3
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "transfers.db"
HOST = "127.0.0.1"
PREFERRED_PORT = 8765


def db_connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folio TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            payload TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


def next_folio(conn: sqlite3.Connection, when: datetime) -> str:
    prefix = when.strftime("TR-%Y%m%d-")
    row = conn.execute(
        "SELECT folio FROM transfers WHERE folio LIKE ? ORDER BY folio DESC LIMIT 1",
        (prefix + "%",),
    ).fetchone()
    last = 0
    if row:
        try:
            last = int(str(row["folio"]).split("-")[-1])
        except ValueError:
            last = 0
    return f"{prefix}{last + 1:03d}"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        if len(args) >= 1 and str(args[0]).startswith("GET /api/"):
            super().log_message(format, *args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, status: int, payload: dict | list):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        if not raw:
            return {}
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("JSON inválido")
        return data

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/transfers":
            conn = db_connect()
            try:
                rows = conn.execute(
                    "SELECT folio, created_at, payload FROM transfers ORDER BY id DESC"
                ).fetchall()
                items = []
                for row in rows:
                    try:
                        payload = json.loads(row["payload"])
                    except json.JSONDecodeError:
                        payload = {}
                    payload["folio"] = row["folio"]
                    payload["createdAt"] = row["created_at"]
                    items.append(payload)
                self._json(200, {"transfers": items})
            finally:
                conn.close()
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/transfers":
            self.send_error(404, "Not Found")
            return
        try:
            payload = self._read_json()
        except (ValueError, json.JSONDecodeError):
            self._json(400, {"error": "JSON inválido"})
            return

        now = datetime.now()
        conn = db_connect()
        try:
            folio = str(payload.get("folio") or "").strip() or next_folio(conn, now)
            created_at = str(payload.get("createdAt") or now.isoformat())
            payload["folio"] = folio
            payload["createdAt"] = created_at
            conn.execute(
                "INSERT INTO transfers (folio, created_at, payload) VALUES (?, ?, ?)",
                (folio, created_at, json.dumps(payload, ensure_ascii=False)),
            )
            conn.commit()
            self._json(201, payload)
        except sqlite3.IntegrityError:
            self._json(409, {"error": "El folio ya existe"})
        finally:
            conn.close()


def find_free_port(host: str, preferred: int) -> int:
    for port in range(preferred, preferred + 15):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
                return port
            except OSError:
                continue
    print("No hay un puerto libre cerca de", preferred, file=sys.stderr)
    sys.exit(1)


class ReuseHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def main():
    db_connect().close()
    port = find_free_port(HOST, PREFERRED_PORT)
    server = ReuseHTTPServer((HOST, port), Handler)
    url = f"http://{HOST}:{port}/"
    print()
    print("=" * 62)
    print("  Configurador KANTEK listo")
    print()
    print("  Abre ESTA dirección en Chrome:")
    print(f"    {url}")
    print()
    print("  No abras index.html con doble clic (file://).")
    print("  El micrófono y la cámara solo funcionan por http://")
    print("  Para detener el servidor: Ctrl+C")
    print("=" * 62)
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.server_close()


if __name__ == "__main__":
    main()
