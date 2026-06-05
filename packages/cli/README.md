# @agent-ready/cli

CLI for scaffolding and auditing AI agent readiness in Next.js projects.

## Install

```bash
npm install -g @agent-ready/cli
# or use without installing:
npx @agent-ready/cli
```

## Commands

### `init`

Scaffold `agent-ready.config.ts` and `middleware.ts` in the current directory:

```bash
agent-ready init
```

Skips files that already exist. Use `--force` to overwrite:

```bash
agent-ready init --force
```

### `audit`

Validate the format of generated agent-readiness files locally (no network):

```bash
agent-ready audit --url https://example.com
agent-ready audit --url https://example.com --name "My App" --description "A great app"
```

Runs 10 checks across `robots.txt`, `llms.txt`, and `sitemap.xml`. Exits 0 if all pass, 1 if any fail.

### `audit --live`

Also fetch the real endpoints from your deployed site and check what's actually being served:

```bash
agent-ready audit --url https://example.com --live
```

Runs 10 local format checks + 10 live HTTP checks = 20 total. Uses Node.js built-in `fetch` (Node >= 18). Network errors on individual endpoints are reported as failed checks — the command never crashes.

## All flags

```
init
  --force              Overwrite existing files

audit
  --url <url>          Required. Base URL of the site to audit.
  --name <name>        Site name for generated config (default: "My Site")
  --description <desc> Site description (default: "A site")
  --live               Also fetch real endpoints and check HTTP responses

--help, -h             Show help
--version, -v          Show version
```

## Requirements

- Node.js >= 18

## License

MIT
