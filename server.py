import http.server
import socketserver
import webbrowser
import os
import sys

# Ensure UTF-8 output on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)

    # Try standard HTTP port 80 first so URLs look like http://scriptcraft.com
    candidate_ports = [80, 5173, 5174, 5175, 8080, 3000]

    for port in candidate_ports:
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                if port == 80:
                    domain_url = "http://scriptcraft.com"
                    local_url = "http://localhost"
                else:
                    domain_url = f"http://scriptcraft.com:{port}"
                    local_url = f"http://localhost:{port}"

                print("=" * 65)
                print("  🎬 ScriptCraft Screenwriting Studio is running!")
                print(f"  Domain Link : {domain_url}")
                print(f"  Local Link  : {local_url}")
                print("=" * 65)
                print("  Tip: If scriptcraft.com doesn't resolve yet, run setup-domain.bat once!")
                print("  Press Ctrl+C in this terminal to stop.")
                print("=" * 65)

                # Open the custom domain URL in browser
                webbrowser.open(domain_url)
                httpd.serve_forever()
                break
        except (OSError, PermissionError):
            continue

if __name__ == "__main__":
    try:
        run_server()
    except KeyboardInterrupt:
        print("\nScriptCraft server stopped.")
        sys.exit(0)
