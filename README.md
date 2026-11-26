# codesign-go-bridge

A small HTTP proxy that lets [Open CoDesign](https://github.com/OpenCoworkAI/open-codesign) use the OpenCode Go inference endpoint. OpenCode Go asks third-party clients to identify themselves with a user agent and to send a stable session ID. Open CoDesign's provider form does not currently expose custom request headers, so the bridge injects both for you:

- `user-agent: codesign-go-bridge/0.1.0` — identifies this bridge (override with `USER_AGENT`)
- `x-opencode-session: ses_...` — stable session ID for routing and prompt caching

Built with TypeScript Effect (v3): `effect`, `@effect/platform`, `@effect/platform-node`.

> **Unofficial.** This project is not affiliated with, endorsed by, or sponsored by Anomaly (OpenCode) or OpenCoworkAI (Open CoDesign). OpenCode and the OpenCode logo are trademarks of Anomaly.

## Run

```sh
pnpm install
pnpm start          # http://127.0.0.1:8787
pnpm dev            # watch mode
pnpm typecheck
```

Or with Docker:

```sh
docker compose up -d --build
```

Then point Open CoDesign's model provider base URL at `http://127.0.0.1:8787/v1`.

## Configuration

Copy `.env.example` to `.env` and adjust, or set the variables in `compose.yaml`. `.env` is gitignored.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Listen address |
| `PORT` | `8787` | Listen port |
| `UPSTREAM_BASE_URL` | `https://opencode.ai/inference/go/openai/v1` | Upstream endpoint |
| `USER_AGENT` | `codesign-go-bridge/0.1.0` | Injected client identity |
| `SESSION_MODE` | `global` | `global` or `project` |
| `CODESIGN_SESSION_ID` | generated `ses_<uuid>` | Session override, stable across restarts |
| `LOG_LEVEL` | `info` | `info`, `warn`, `error` |

## Session modes

- **`global`** (default): one stable session per proxy process. Correct by default; works for a single user. All projects share one prompt-cache namespace, but the shared system-prompt prefix still caches well.
- **`project`**: derives `ses_<sha256>` from the first user message in the chat body. Gives each design project its own cache namespace without any Open CoDesign changes. The first message survives normal multi-turn history; if context pruning removes it, the ID changes — a cache miss, not an error. Non-chat requests (e.g. `/models`) fall back to the global session.

Incoming `x-opencode-session` headers are always preserved, so a future Open CoDesign that can set headers takes precedence.

## Security

The bridge is designed for **one user on one machine**. It forwards your `Authorization` header untouched and never logs or stores API keys.

- It binds to `127.0.0.1` by default. Do not expose it on a public interface.
- Do not share one instance between people or run it on behalf of third parties. OpenCode's terms allow only your own internal use and prohibit making an account, API key, or credits available to third parties.
- Use a dedicated OpenCode API key so you can revoke it independently.

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Behavior notes

- A leading `/v1` on the incoming path is stripped before appending to the upstream base URL, so both `http://localhost:8787/v1` and `http://localhost:8787/` work as a base URL.
- Request bodies are buffered before forwarding (needed by `project` mode for hashing). Response bodies are streamed, including SSE. The default maximum request body size is 10 MiB (Effect platform default).
- Hop-by-hop headers are removed in both directions. `content-length` from upstream is dropped so the server can reframe the streamed response.
- Upstream failures return `502 Bad Gateway`.
- Open CoDesign's provider form currently defers custom headers. Its internal provider contract already accepts `httpHeaders`, so a future UI release may make this bridge unnecessary.

## License

MIT — see [LICENSE](LICENSE).
