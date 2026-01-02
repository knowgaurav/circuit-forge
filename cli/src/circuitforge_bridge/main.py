#!/usr/bin/env python3
"""CircuitForge Local Bridge - Connect local LLMs to CircuitForge.

Supports: Ollama, LM Studio, vLLM, LocalAI, and any OpenAI-compatible server.
"""

import argparse
import json
import re
import secrets
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
from urllib.error import URLError
from urllib.request import Request, urlopen

__version__ = "1.0.0"

# Common local LLM servers and their configurations
LLM_SERVERS = [
    {"name": "Ollama", "port": 11434, "models_path": "/api/tags", "key": "models", "name_field": "name"},
    {"name": "LM Studio", "port": 1234, "models_path": "/v1/models", "key": "data", "name_field": "id"},
    {"name": "vLLM", "port": 8000, "models_path": "/v1/models", "key": "data", "name_field": "id"},
    {"name": "LocalAI", "port": 8080, "models_path": "/v1/models", "key": "data", "name_field": "id"},
    {"name": "Jan", "port": 1337, "models_path": "/v1/models", "key": "data", "name_field": "id"},
    {"name": "text-gen-webui", "port": 5000, "models_path": "/v1/models", "key": "data", "name_field": "id"},
]

# Global state
BRIDGE_TOKEN: str = ""
TARGET_PORT: int = 0


class TokenProxyHandler(BaseHTTPRequestHandler):
    """HTTP handler that validates token and proxies requests to local LLM."""

    def do_POST(self) -> None:
        if not self._validate_token():
            return
        self._proxy_request()

    def do_GET(self) -> None:
        if not self._validate_token():
            return
        self._proxy_request()

    def do_OPTIONS(self) -> None:
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def _validate_token(self) -> bool:
        token = self.headers.get("X-Bridge-Token", "")
        if token != BRIDGE_TOKEN:
            self.send_error(401, "Invalid or missing bridge token")
            return False
        return True

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token")

    def _proxy_request(self) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else None

        target_url = f"http://localhost:{TARGET_PORT}{self.path}"
        headers = {"Content-Type": self.headers.get("Content-Type", "application/json")}

        req = Request(target_url, data=body, headers=headers, method=self.command)

        try:
            with urlopen(req, timeout=120) as resp:
                response_data = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(response_data)
        except URLError as e:
            self.send_error(502, f"Failed to reach local LLM: {e.reason}")
        except Exception as e:
            self.send_error(500, str(e))

    def log_message(self, format: str, *args) -> None:
        pass  # Suppress default logging


def check_server(port: int, models_path: str, key: str, name_field: str) -> list[str] | None:
    """Check if an LLM server is running and return available models."""
    try:
        url = f"http://localhost:{port}{models_path}"
        with urlopen(url, timeout=2) as resp:
            data = json.loads(resp.read().decode())
            models = data.get(key, [])
            if models and isinstance(models[0], dict):
                return [m.get(name_field, "unknown") for m in models]
            return list(models) if models else []
    except Exception:
        return None


def scan_servers() -> list[dict]:
    """Scan for running LLM servers on common ports."""
    found = []
    for server in LLM_SERVERS:
        models = check_server(
            server["port"],
            server["models_path"],
            server["key"],
            server["name_field"],
        )
        if models is not None:
            found.append({**server, "models": models})
    return found


def check_cloudflared() -> bool:
    """Check if cloudflared is installed."""
    try:
        result = subprocess.run(
            ["cloudflared", "--version"],
            capture_output=True,
            check=True,
        )
        return result.returncode == 0
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def print_install_instructions() -> None:
    """Print cloudflared installation instructions."""
    print("✗ cloudflared not installed\n")
    print("Install cloudflared:")
    print("  macOS:   brew install cloudflared")
    print("  Windows: winget install Cloudflare.cloudflared")
    print("  Linux:   See https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/")
    print()


def print_no_servers_found() -> None:
    """Print message when no LLM servers are found."""
    print("✗ No LLM servers found on common ports\n")
    print("Make sure one of these is running:")
    print("  - Ollama:    ollama serve")
    print("  - LM Studio: Start the local server in the app")
    print("  - vLLM:      python -m vllm.entrypoints.openai.api_server ...")
    print("  - LocalAI:   local-ai run ...")
    print()
    print("Or specify a custom port:")
    print("  circuitforge-bridge --port 8000")
    print()


def start_proxy_server() -> tuple[HTTPServer, int]:
    """Start the token-validating proxy server."""
    server = HTTPServer(("127.0.0.1", 0), TokenProxyHandler)
    port = server.server_address[1]
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


def start_tunnel(proxy_port: int) -> subprocess.Popen:
    """Start Cloudflare tunnel pointing to the proxy."""
    return subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{proxy_port}"],
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
    )


def wait_for_tunnel_url(proc: subprocess.Popen) -> str | None:
    """Wait for and extract the tunnel URL from cloudflared output."""
    if proc.stderr is None:
        return None

    for line in proc.stderr:
        match = re.search(r"https://[^\s]+\.trycloudflare\.com", line)
        if match:
            return match.group(0)
    return None


def main() -> None:
    global BRIDGE_TOKEN, TARGET_PORT

    parser = argparse.ArgumentParser(
        description="CircuitForge Local Bridge - Connect local LLMs to CircuitForge",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  circuitforge-bridge                    # Auto-detect LLM server
  circuitforge-bridge --port 8000        # Use specific port
  circuitforge-bridge --port 11434       # Explicitly use Ollama port

Supported LLM servers:
  - Ollama (port 11434)
  - LM Studio (port 1234)
  - vLLM (port 8000)
  - LocalAI (port 8080)
  - Any OpenAI-compatible server
        """,
    )
    parser.add_argument(
        "--port",
        type=int,
        help="LLM server port (auto-detected if not specified)",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}",
    )
    args = parser.parse_args()

    print(f"\n🔗 CircuitForge Local Bridge v{__version__}\n")

    # Check cloudflared is installed
    if not check_cloudflared():
        print_install_instructions()
        sys.exit(1)

    # Determine target LLM port
    if args.port:
        TARGET_PORT = args.port
        print(f"Using specified port: {TARGET_PORT}\n")
    else:
        print("Scanning for local LLM servers...\n")
        servers = scan_servers()

        if not servers:
            print_no_servers_found()
            sys.exit(1)

        # Display found servers
        for server in servers:
            print(f"✓ Found: {server['name']} at localhost:{server['port']}")
            models_display = server["models"][:3]
            models_str = ", ".join(models_display)
            extra = len(server["models"]) - 3
            if extra > 0:
                models_str += f" (+{extra} more)"
            print(f"  Models: {models_str}\n")

        # Select server
        if len(servers) == 1:
            TARGET_PORT = servers[0]["port"]
        else:
            print(f"Multiple servers found. Select one [1-{len(servers)}]:")
            for i, s in enumerate(servers, 1):
                print(f"  {i}. {s['name']} (localhost:{s['port']})")
            try:
                choice = input(f"\nChoice [1]: ").strip() or "1"
                idx = int(choice) - 1
                if 0 <= idx < len(servers):
                    TARGET_PORT = servers[idx]["port"]
                else:
                    TARGET_PORT = servers[0]["port"]
            except (ValueError, EOFError):
                TARGET_PORT = servers[0]["port"]

    # Generate secure token for this session
    BRIDGE_TOKEN = secrets.token_urlsafe(32)

    # Start proxy server
    proxy_server, proxy_port = start_proxy_server()

    # Start Cloudflare tunnel
    print("Starting Cloudflare tunnel...")
    tunnel_proc = start_tunnel(proxy_port)

    try:
        tunnel_url = wait_for_tunnel_url(tunnel_proc)

        if tunnel_url:
            print("✓ Tunnel ready!\n")
            print("━" * 60)
            print("  Paste these values in CircuitForge:")
            print(f"  URL:   {tunnel_url}")
            print(f"  Token: {BRIDGE_TOKEN}")
            print("━" * 60)
            print("\n⚠️  Keep this terminal open while using CircuitForge")
            print("Press Ctrl+C to stop the tunnel\n")

            # Wait for tunnel process
            tunnel_proc.wait()
        else:
            print("✗ Failed to create tunnel")
            print("Check your internet connection and try again")
            tunnel_proc.terminate()
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n\nShutting down...")
        tunnel_proc.terminate()
        proxy_server.shutdown()
        print("Tunnel stopped. Goodbye!")


if __name__ == "__main__":
    main()
