
# Contributing to LiWebJS

  

Thanks for your interest in contributing. LiWebJS is a real open-source project — not just an academic exercise — and we welcome contributors of all experience levels.

  

## Before You Start

  

- Read the [README](README.md) to understand what LiWebJS is

- Read [DOCUMENTATION.md](DOCUMENTATION.md) for the full API reference

- Check [open issues](https://github.com/sumeet57/liwebjs/issues) before starting new work

  

## Project Structure

#### ***packages/core/*** - Server-side framework (liwebjs)

#### ***packages/client/*** - Browser client SDK (liwebjs-client)

#### ***examples/chat/*** - Full-stack example app

  
  

## Setup

  

```bash

git clone https://github.com/sumeet57/liwebjs.git

cd liwebjs

npm install # installs all workspace dependencies

```

  

## Running Tests

  

```bash

# Core package

cd packages/core

npm test # run once

npm run test:watch # watch mode

npm run test:coverage

  

# Client package

cd packages/client

npm test

```

  

All PRs must have passing tests. New features must include tests.

  

## Commit Convention

  

LiWebJS follows [Conventional Commits](https://www.conventionalcommits.org/):\

- feat: add new feature

- fix: fix a bug

- test: add or update tests

- docs: documentation only

- refactor: no feature or bug change

- chore: build, config, tooling

  

Examples:

- feat: add Redis state adapter

- fix: clear pong timer on disconnect

- test: add room.emitTo edge case coverage

- docs: add auth layer usage examples

  

## Contribution Workflow

  

1. Fork the repository

2. Create a branch: `git checkout -b feat/your-feature`

3. Make your changes

4. Add tests for new behaviour

5. Run the full test suite: `npm test` in both packages

6. Commit using conventional commits

7. Push and open a Pull Request

  

## What to Work On

  

Good first issues are labelled [`good first issue`](https://github.com/sumeet57/liwebjs/issues?q=label%3A%22good+first+issue%22) on GitHub.

  

### High priority contributions

  

- **Protocol adapters** — uWebSockets, HTTP polling

- **Redis state adapter** — distributed state for horizontal scaling

- **Presence engine** — online/offline user tracking

- **Additional state operations** — batch operations, TTL support

  

### Always welcome

  

- Bug fixes with regression tests

- Documentation improvements

- Example applications showing new use cases

- Performance benchmarks

  

## Writing Tests

  

Use the mock adapter pattern — never write tests that require a real WebSocket server:

  

```typescript

import { createMockAdapter } from  "./helpers/mock-adapter";

import { createMockConnection } from  "./helpers/mock-connection";

  

const { adapter, simulateConnection, simulateMessage, sentBy } = createMockAdapter();

const liweb = createLiWebServer({}, { adapter });

  

const conn = createMockConnection(adapter);

simulateConnection(conn);

simulateMessage(conn, "ping", {});

  

expect(sentBy(conn)).toEqual([{ event: "pong", payload: {} }]);

```

  

## Code Style

  

- TypeScript strict mode — no `any` in public APIs

- Explicit return types on all exported functions

- No side effects in module scope

- Pure functions for validation logic (see `auth.ts` as reference)

- Immutable updates for state changes (spread, not mutation)

  

## Questions

  

Open a [GitHub Discussion](https://github.com/sumeet57/liwebjs/issues) or file an issue.

We respond to all questions.