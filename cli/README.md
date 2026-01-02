# CircuitForge Local Bridge

Connect your local LLM (Ollama, LM Studio, vLLM, etc.) to CircuitForge for AI-powered course generation.

## Prerequisites

1. **A local LLM server** running one of:
   - [Ollama](https://ollama.com) (recommended)
   - [LM Studio](https://lmstudio.ai)
   - [vLLM](https://github.com/vllm-project/vllm)
   - [LocalAI](https://localai.io)
   - Any OpenAI-compatible server

2. **cloudflared** (Cloudflare Tunnel CLI):
   ```bash
   # macOS
   brew install cloudflared

   # Windows
   winget install Cloudflare.cloudflared

   # Linux (Debian/Ubuntu)
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
   sudo dpkg -i cloudflared.deb
   ```

## Installation

```bash
pip install git+https://github.com/Algozenith/circuit-forge.git#subdirectory=cli
```

## Usage

1. **Start your local LLM server:**
   ```bash
   # Ollama
   ollama serve
   
   # Or start LM Studio's local server, etc.
   ```

2. **Run the bridge:**
   ```bash
   circuitforge-bridge
   ```

3. **Copy the URL and Token** displayed in the terminal

4. **Paste them into CircuitForge** when configuring "Local LLM" provider

## Options

```bash
# Auto-detect LLM server (default)
circuitforge-bridge

# Use specific port
circuitforge-bridge --port 8000

# Show version
circuitforge-bridge --version

# Show help
circuitforge-bridge --help
```

## Supported LLM Servers

| Server | Default Port | Auto-detected |
|--------|-------------|---------------|
| Ollama | 11434 | ✓ |
| LM Studio | 1234 | ✓ |
| vLLM | 8000 | ✓ |
| LocalAI | 8080 | ✓ |
| Jan | 1337 | ✓ |
| text-generation-webui | 5000 | ✓ |

For other servers, use `--port` to specify the port.

## How It Works

1. The bridge scans common ports for running LLM servers
2. Creates a secure token for authentication
3. Starts a proxy server that validates tokens
4. Opens a Cloudflare tunnel to the proxy
5. CircuitForge connects through the tunnel using your token

```
CircuitForge (Cloud) ──HTTPS──► Cloudflare Tunnel ──► Bridge Proxy ──► Your Local LLM
                                                      (validates token)
```

## Security

- **Token Authentication**: Every request must include a valid token
- **Session-based**: New token generated each time you run the bridge
- **No persistent exposure**: Tunnel closes when you stop the bridge
- **HTTPS encryption**: All traffic encrypted via Cloudflare

## Recommended Models for Course Generation

Models with tool/function calling support work best:

- **Ollama**: `llama3.2`, `qwen2.5`, `deepseek-r1`, `mistral`
- **General**: Any model supporting OpenAI-compatible tool calling

## Troubleshooting

### "cloudflared not installed"
Install cloudflared using the commands in Prerequisites above.

### "No LLM servers found"
Make sure your LLM server is running:
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags
```

### Connection timeout
- Ensure your firewall allows outbound connections
- Try restarting the bridge
- Check if cloudflared can reach Cloudflare's network

## License

MIT
