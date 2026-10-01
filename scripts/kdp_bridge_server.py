#!/usr/bin/env python3
"""
BookIntel - Servidor Ponte Local para kdp-book
Permite que a extensão Chrome dispare e monitore o pipeline de agentes do kdp-book localmente.

Uso:
    python scripts/kdp_bridge_server.py [porta]
Padrão da porta: 8765
"""

import sys
import os
import json
import subprocess
import threading
import time
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
BASE_DIR = Path(__file__).resolve().parent.parent
KDP_BOOK_DIR = BASE_DIR / "kdp-book"

# Estado de execuções ativas
RUNS = {}

def get_python_cmd():
    return sys.executable

def find_kdp_runner():
    # Verifica se uv está instalado
    try:
        res = subprocess.run(["uv", "--version"], capture_output=True, text=True)
        if res.returncode == 0:
            return ["uv", "run", "kdp-book"]
    except Exception:
        pass
    
    # Fallback para execução direta via python module
    if KDP_BOOK_DIR.exists():
        return [get_python_cmd(), "-m", "kdp_book.cli"]
    return None

class BridgeHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/health":
            runner = find_kdp_runner()
            has_env = (KDP_BOOK_DIR / ".env").exists() if KDP_BOOK_DIR.exists() else False
            self.send_json(200, {
                "status": "online",
                "message": "Ponte kdp-book conectada e pronta",
                "python": sys.version.split()[0],
                "kdp_repo_present": KDP_BOOK_DIR.exists(),
                "kdp_runner": " ".join(runner) if runner else "Não configurado",
                "has_env": has_env,
                "timestamp": int(time.time() * 1000)
            })
            return

        if path == "/doctor":
            runner = find_kdp_runner()
            if not runner:
                self.send_json(400, {
                    "ok": False,
                    "error": "Repositório kdp-book não encontrado ou uv/python ausente"
                })
                return
            
            try:
                cmd = runner + ["doctor"]
                cwd = KDP_BOOK_DIR if KDP_BOOK_DIR.exists() else BASE_DIR
                res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=15)
                self.send_json(200, {
                    "ok": res.returncode == 0,
                    "output": res.stdout or res.stderr
                })
            except Exception as e:
                self.send_json(500, { "ok": False, "error": str(e) })
            return

        if path.startswith("/api/status/"):
            run_id = path.split("/")[-1]
            run = RUNS.get(run_id)
            if not run:
                self.send_json(404, { "error": "Execução não encontrada" })
                return
            self.send_json(200, run)
            return

        if path == "/api/books":
            books_dir = KDP_BOOK_DIR / "books" if KDP_BOOK_DIR.exists() else BASE_DIR / "books"
            books = []
            if books_dir.exists():
                for d in books_dir.iterdir():
                    if d.is_dir():
                        meta_file = d / "output" / "kdp.json"
                        meta = {}
                        if meta_file.exists():
                            try:
                                meta = json.loads(meta_file.read_text(encoding="utf-8"))
                            except Exception:
                                pass
                        books.append({
                            "slug": d.name,
                            "path": str(d),
                            "has_output": (d / "output").exists(),
                            "metadata": meta,
                            "modified": os.path.getmtime(d)
                        })
            books.sort(key=lambda b: b["modified"], reverse=True)
            self.send_json(200, { "books": books })
            return

        if path.startswith("/api/books/"):
            slug = path.split("/")[-1]
            books_dir = KDP_BOOK_DIR / "books" if KDP_BOOK_DIR.exists() else BASE_DIR / "books"
            book_path = books_dir / slug
            if not book_path.exists():
                self.send_json(404, { "error": "Livro não encontrado" })
                return

            meta_file = book_path / "output" / "kdp.json"
            meta = {}
            if meta_file.exists():
                try:
                    meta = json.loads(meta_file.read_text(encoding="utf-8"))
                except Exception:
                    pass

            # Lê capítulos se existirem
            chapters = []
            chap_dir = book_path / "chapters"
            if chap_dir.exists():
                for f in sorted(chap_dir.glob("chapter-*.md")):
                    chapters.append({
                        "filename": f.name,
                        "content": f.read_text(encoding="utf-8")
                    })

            self.send_json(200, {
                "slug": slug,
                "path": str(book_path),
                "metadata": meta,
                "chapters": chapters
            })
            return

        self.send_json(404, { "error": "Rota não encontrada" })

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/generate":
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)
            try:
                payload = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                self.send_json(400, { "error": "JSON inválido" })
                return

            topic = payload.get("topic")
            book_type = payload.get("book_type", "non-fiction")
            author = payload.get("author")
            language = payload.get("language", "portuguese")
            no_images = payload.get("no_images", False)
            quality = payload.get("quality", "low")

            if not topic:
                self.send_json(400, { "error": "Campo 'topic' é obrigatório" })
                return

            runner = find_kdp_runner()
            if not runner:
                self.send_json(500, { "error": "Runner kdp-book não disponível. Instale uv ou configure o ambiente." })
                return

            run_id = f"run_{int(time.time())}_{os.urandom(3).hex()}"
            RUNS[run_id] = {
                "id": run_id,
                "status": "iniciando",
                "progress": 5,
                "logs": [f"Iniciando geração de '{topic}' ({book_type})..."],
                "startTime": int(time.time() * 1000),
                "completed": False,
                "error": None
            }

            def worker():
                run_data = RUNS[run_id]
                cmd = list(runner) + [
                    "generate",
                    "--topic", topic,
                    "--type", book_type,
                    "--language", language
                ]
                if author:
                    cmd += ["--author", author]
                if no_images:
                    cmd.append("--no-images")
                if quality:
                    cmd += ["--quality", quality]

                run_data["command"] = " ".join(cmd)
                run_data["logs"].append(f"$ {' '.join(cmd)}")
                run_data["status"] = "executando"
                run_data["progress"] = 15

                cwd = KDP_BOOK_DIR if KDP_BOOK_DIR.exists() else BASE_DIR

                try:
                    process = subprocess.Popen(
                        cmd,
                        cwd=cwd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=1
                    )

                    for line in iter(process.stdout.readline, ''):
                        if line:
                            cleaned = line.strip()
                            run_data["logs"].append(cleaned)
                            if len(run_data["logs"]) > 200:
                                run_data["logs"].pop(0)

                            # Atualiza progresso heurístico baseado no log
                            if "concept" in cleaned.lower():
                                run_data["progress"] = 25
                            elif "outline" in cleaned.lower():
                                run_data["progress"] = 40
                            elif "bible" in cleaned.lower():
                                run_data["progress"] = 55
                            elif "writing chapter" in cleaned.lower():
                                run_data["progress"] = 70
                            elif "cover" in cleaned.lower():
                                run_data["progress"] = 85
                            elif "metadata" in cleaned.lower():
                                run_data["progress"] = 92

                    process.wait()
                    if process.returncode == 0:
                        run_data["status"] = "concluido"
                        run_data["progress"] = 100
                        run_data["completed"] = True
                        run_data["logs"].append("✓ Processo finalizado com sucesso!")
                    else:
                        run_data["status"] = "erro"
                        run_data["completed"] = True
                        run_data["error"] = f"Código de saída: {process.returncode}"
                except Exception as e:
                    run_data["status"] = "erro"
                    run_data["completed"] = True
                    run_data["error"] = str(e)
                    run_data["logs"].append(f"ERRO: {str(e)}")

            t = threading.Thread(target=worker, daemon=True)
            t.start()

            self.send_json(200, {
                "ok": True,
                "runId": run_id,
                "message": "Geração iniciada com sucesso em segundo plano"
            })
            return

        self.send_json(404, { "error": "Rota não encontrada" })

    def log_message(self, format, *args):
        # Desativa log padrão verboso do console para manter limpo
        pass

def run_server():
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, BridgeHandler)
    print("=" * 60)
    print(f"  🚀 BookIntel - Servidor Ponte kdp-book Ativo")
    print(f"  URL Local: http://127.0.0.1:{PORT}")
    print(f"  Repositório kdp-book: {'OK (detectado)' if KDP_BOOK_DIR.exists() else 'Ausente'}")
    print("=" * 60)
    print("Aguardando requisições da extensão Chrome... (Ctrl+C para encerrar)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor ponte encerrado.")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
