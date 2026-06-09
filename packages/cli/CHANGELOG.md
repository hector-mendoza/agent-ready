# @is-agent-ready/cli

## 0.2.0

### Minor Changes

- Initial release of the agent-ready monorepo.

  - `@is-agent-ready/core`: generate `robots.txt`, `llms.txt`, `sitemap.xml`, `mcp-server-card.json`, `agent-skills.json`, and `api-catalog.json` from a single typed config
  - `@is-agent-ready/next`: Next.js middleware that serves all agent-ready routes; `withAgentReady()` helper for composing with existing middleware
  - `@is-agent-ready/cli`: `agent-ready init` scaffolds config and middleware; `agent-ready audit` scores a URL against 9 local checks plus 10 live HTTP checks (`--live` flag)

### Patch Changes

- Updated dependencies
  - @is-agent-ready/core@0.2.0
