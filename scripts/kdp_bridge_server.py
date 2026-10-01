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
import tempfile
import shutil
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
BASE_DIR = Path(__file__).resolve().parent.parent
KDP_BOOK_DIR = BASE_DIR / "kdp-book"

# Estado de execuções ativas
RUNS = {}
PDF_RENDER_LOCK = threading.Lock()

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

        if path == "/api/render-pdf":
            origin = self.headers.get("Origin", "")
            origin_url = urlparse(origin)
            allowed_extension = origin_url.scheme == "chrome-extension" and bool(origin_url.netloc)
            allowed_dev_server = origin in {
                "http://localhost:3000",
                "http://127.0.0.1:3000"
            }
            if not (allowed_extension or allowed_dev_server):
                self.send_json(403, {"error": "Origem não autorizada para renderização."})
                return

            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0 or content_length > 12 * 1024 * 1024:
                self.send_json(413, {"error": "O HTML deve ter entre 1 byte e 12 MB."})
                return

            try:
                payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                self.send_json(400, {"error": "JSON inválido."})
                return

            html_document = payload.get("html")
            if not isinstance(html_document, str) or "<html" not in html_document.lower():
                self.send_json(400, {"error": "Documento HTML inválido."})
                return

            node_path = shutil.which("node")
            cli_entry = BASE_DIR / "node_modules" / "@vivliostyle" / "cli" / "dist" / "cli.js"
            if not node_path or not cli_entry.is_file():
                self.send_json(503, {"error": "Vivliostyle CLI não está instalada neste workspace."})
                return

            title = str(payload.get("title") or "Livro")[:200]
            author = str(payload.get("author") or "Autor")[:200]
            language = str(payload.get("language") or "pt-BR")[:32]

            if not PDF_RENDER_LOCK.acquire(blocking=False):
                self.send_json(429, {"error": "Já existe uma paginação em andamento. Tente novamente em instantes."})
                return

            try:
                try:
                    with tempfile.TemporaryDirectory(prefix="bookintel-vivliostyle-") as temp_dir:
                        temp_path = Path(temp_dir)
                        input_path = temp_path / "manuscript.html"
                        output_path = temp_path / "interior.pdf"
                        input_path.write_text(html_document, encoding="utf-8")

                        result = subprocess.run(
                            [
                                node_path,
                                str(cli_entry),
                                "build",
                                "--single-doc",
                                "--output", str(output_path),
                                "--title", title,
                                "--author", author,
                                "--language", language,
                                "--viewer-param", "allowScripts=false",
                                "--log-level", "silent",
                                str(input_path)
                            ],
                            cwd=BASE_DIR,
                            capture_output=True,
                            text=True,
                            timeout=240,
                            check=False
                        )
                        if result.returncode != 0 or not output_path.is_file():
                            details = (result.stderr or result.stdout or "Falha sem detalhes")[-4000:]
                            self.send_json(500, {"error": f"Vivliostyle não conseguiu gerar o PDF: {details}"})
                            return

                        pdf_bytes = output_path.read_bytes()
                        if not pdf_bytes.startswith(b"%PDF-"):
                            self.send_json(500, {"error": "A saída do Vivliostyle não é um PDF válido."})
                            return

                    self.send_response(200)
                    self.send_cors_headers()
                    self.send_header("Content-Type", "application/pdf")
                    self.send_header("Content-Length", str(len(pdf_bytes)))
                    self.send_header("Content-Disposition", 'attachment; filename="interior.pdf"')
                    self.end_headers()
                    self.wfile.write(pdf_bytes)
                except subprocess.TimeoutExpired:
                    self.send_json(504, {"error": "A diagramação excedeu o limite de 240 segundos."})
                except OSError as error:
                    self.send_json(500, {"error": f"Falha ao gravar ou ler arquivos temporários: {error}"})
            finally:
                PDF_RENDER_LOCK.release()
            return

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
    httpd = ThreadingHTTPServer(server_address, BridgeHandler)
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
