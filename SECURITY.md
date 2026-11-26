# Security

## Reporting a vulnerability

Open a private security advisory at
<https://github.com/Thebluedragon7/codesign-go-bridge/security/advisories/new>,
or contact the maintainer directly. Please do not open a public issue for a
vulnerability.

## Threat model

`codesign-go-bridge` is a local, single-user HTTP proxy. It relays requests
from Open CoDesign to OpenCode Go and does not persist request or response
data.

- It listens on `127.0.0.1` by default.
- It forwards the incoming `Authorization` header untouched and never logs it.
  Request and response bodies are streamed and not stored.
- It ships without an API key. You supply your own through Open CoDesign.

Do not expose the bridge on a public interface or share one instance between
users. OpenCode's terms permit only your own internal use and prohibit making
an account, API key, or credits available to third parties.
