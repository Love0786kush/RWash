# Project Agent Rules & Token-Saving Guidelines

## 1. Operating Mode
- Use **Fast mode** by default for all tasks.
- Use **Planning mode** strictly for large, architectural, or multi-file refactoring work.

## 2. File Reading & Code Navigation
- Read only the specific files directly needed for the task, never the whole repository.
- Use targeted search (`Select-String` / grep) first to locate relevant symbols, then read only specific line ranges.
- Do not dump directory trees or inspect irrelevant subfolders.

## 3. Communication & Code Output
- Keep answers concise with minimal explanation.
- Present targeted diffs or edited snippets only; never reprint whole, unmodified files.
- Focus strictly on the exact user requirement.

## 4. Error Handling & Circuit Breaker
- No retry loops: after 2 failed attempts on any command or operation, immediately stop and report the exact error.
- Do not repeat identical commands that fail.

## 5. Excluded Files & Directories
- Never index, search, or read:
  - `node_modules/`
  - `dist/`, `build/`, `.output/`
  - `logs/`, `*.log`
  - Package lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`)
  - Large binary data, media, and build caches

## 6. Context Management
- Strictly one task per chat session.
- Start a new conversation when the context window grows long to keep token usage low and latency fast.
