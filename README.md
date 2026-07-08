# agent-ready

Make your web app readable by AI agents and crawlers — automatically.

AI agents, LLM crawlers, and coding assistants look for specific files to understand your site: `robots.txt` with Content-Signal directives, `llms.txt`, an MCP server card, an API catalog. Most sites don't have them. `agent-ready` generates and serves all of it from a single typed config, so your app passes [isitagentready.com](https://isitagentready.com) checks out of the box.

## What it generates

| File | Purpose |
|---|---|
| `robots.txt` | Crawler rules + Content-Signal directives (allow/block AI training, AI inference, search) |
| `llms.txt` | LLM context file ([llmstxt.org](https://llmstxt.org) spec) |
| `sitemap.xml` | Standard XML sitemap |
| `.well-known/mcp/server-card.json` | MCP server discovery card |
| `.well-known/agent-skills/index.json` | Agent skills discovery |
| `.well-known/api-catalog` | API catalog ([RFC 9727](https://www.rfc-editor.org/rfc/rfc9727)) |

## Packages

This is a monorepo with three packages — use only what you need:

| Package | Use it for |
|---|---|
| [`@is-agent-ready/core`](packages/core) | Pure functions: config in, files out. Framework-agnostic. |
| [`@is-agent-ready/next`](packages/next) | Next.js middleware — serves the files dynamically, no build step. |
| [`@is-agent-ready/cli`](packages/cli) | `agent-ready init` to scaffold, `agent-ready audit` to check any URL. |

## Quick start (Next.js)

```bash
npx @is-agent-ready/cli init
```

This creates `agent-ready.config.ts` and wires up `middleware.ts` for you. Edit the config to match your site:

```ts
export default defineConfig({
  site: {
    name: 'My Site',
    description: 'A brief description of what this site does',
    baseUrl: 'https://example.com',
  },
  bots: {
    aiTrain: false, // disallow AI training crawlers
    aiInput: false, // disallow AI inference crawlers
    search: true,   // allow search engines
  },
})
```

That's it — `/robots.txt`, `/llms.txt`, `/sitemap.xml`, and the `.well-known/*` routes are now served dynamically.

## Check any site

```bash
npx @is-agent-ready/cli audit --url https://example.com --live
```

Runs local format checks plus live HTTP checks against the real deployed endpoints, and prints a pass/fail score.

## Not using Next.js?

Use `@is-agent-ready/core` directly — it just returns `{ path, content }[]`, so you can write the files yourself in any framework or build step.

## Local development

```bash
pnpm install
pnpm build      # build all packages
pnpm test       # run all tests
```

## Publishing (maintainers)

```bash
pnpm changeset          # describe what changed
pnpm version-packages   # bump versions + update CHANGELOGs
pnpm release            # build + publish to npm
```

## License

MIT
