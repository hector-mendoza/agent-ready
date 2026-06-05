# agent-ready

Make your Next.js app pass [isitagentready.com](https://isitagentready.com) checks — automatically.

`agent-ready` generates and serves all the files AI agents and crawlers look for: `robots.txt` with Content-Signal directives, `llms.txt`, `sitemap.xml`, `/.well-known/mcp/server-card.json`, `/.well-known/agent-skills/index.json`, and `/.well-known/api-catalog`.

## Packages

| Package | Description |
|---|---|
| [`@agent-ready/core`](packages/core) | Pure generator functions — config → files |
| [`@agent-ready/next`](packages/next) | Next.js App Router middleware |
| [`@agent-ready/cli`](packages/cli) | `agent-ready init` and `agent-ready audit` CLI |

## Quick Start (Next.js)

```bash
npx @agent-ready/cli init
```

Then edit `agent-ready.config.ts` and you're done. Your site will serve all agent-readiness files dynamically — no static files, no build step.

## Local Development

```bash
pnpm install
pnpm build      # build all packages
pnpm test       # run all tests
```

## Publishing

```bash
pnpm changeset          # describe what changed
pnpm version-packages   # bump versions
pnpm release            # build + publish to npm
```

## License

MIT
