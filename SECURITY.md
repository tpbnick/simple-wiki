# Security Policy

Simple-Wiki is self-hosted. It does not collect analytics or send data off the server. Deployment guidance is in the [README](README.md#access-control).

## Reporting

Do not open public issues for security bugs. Report privately via [GitHub security advisories](https://github.com/tpbnick/simple-wiki/security/advisories/new). Include steps to reproduce and the version or commit if known.

Reports are handled for the latest `main` branch and `ghcr.io/tpbnick/simple-wiki:latest`.

## Scope

**In scope:** auth bypass, XSS, SQL injection, path traversal, unauthorized file access, privilege escalation beyond the documented trust model, and similar defects in core or bundled extensions.

**Out of scope:** misconfiguration (HTTP on the public internet, weak passwords, etc.), behavior that requires a trusted editor or admin account, third-party extensions, and generic denial-of-service.

## License

MIT — see [README](README.md#license).
