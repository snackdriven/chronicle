# Running the MCP server on a remote host

The MCP server (`dist/mcp-server.mjs`) runs on a remote server and connects to Claude via SSH. The React UI and Express backend stay local. Only the MCP server lives remotely.

## Why this setup

MCP servers need to be persistent. If the server isn't running when Claude tries to call a tool mid-conversation, the tool call fails. Running it locally means it's only available when you have a dev server up. A remote server stays on, costs a few dollars a month, and is reachable over SSH from anywhere.

The downside is deployment complexity: you can't just `npm install` on a low-memory host and call it done.

## Build locally, rsync the result

`better-sqlite3` is a native module that has to be compiled for the target architecture. On a low-memory server, `npm install` will OOM during the build. The fix is to compile on your local machine and rsync the already-built artifacts.

```bash
pnpm build:mcp          # compiles mcp-server.mjs → dist/
rsync -av dist/ user@host:~/chronicle/dist/
rsync -av node_modules/ user@host:~/chronicle/node_modules/
```

rsync only transfers changed files, so subsequent deploys are fast.

## SSH ControlMaster: one connection, many calls

The MCP client (Claude Code) spawns the server by running `ssh host node script.mjs`. Without ControlMaster, every tool call opens a new TCP connection — that's 300–500ms of handshake overhead per call, and some hosts rate-limit repeated connections.

ControlMaster keeps one SSH connection alive and multiplexes all subsequent calls over it. The first call opens the socket; everything after reuses it with near-zero overhead.

```
# ~/.ssh/config
Host chronicle-remote
  HostName your-host
  User your-user
  ControlMaster auto
  ControlPath ~/.ssh/chronicle-cm
  ControlPersist yes
  ServerAliveInterval 60
```

The socket will drop if there's no activity. A cron job keeps it warm:

```
*/5 * * * * ssh -O check chronicle-remote 2>/dev/null || ssh -fNM chronicle-remote
```

## Claude config placement

MCP servers go in `~/.claude.json` at the top-level `mcpServers` key, not `settings.json`. Settings files are per-project scoped; a memory server needs to be available globally, across all projects.

```json
{
  "mcpServers": {
    "chronicle": {
      "command": "ssh",
      "args": [
        "chronicle-remote",
        "env",
        "DB_PATH=/home/user/chronicle/data/chronicle.db",
        "node",
        "/home/user/chronicle/dist/mcp-server.mjs"
      ]
    }
  }
}
```

Two things in that config that aren't obvious:

Use `env VAR=val node script.mjs`, not `bash -c 'VAR=val node ...'`. When Claude spawns the SSH subprocess, `bash -c` doesn't forward stdin — the node process exits immediately with no output and no error message to debug.

Use `node` directly on the compiled `.mjs`, not `./node_modules/.bin/tsx`. tsx is a shell script; running it with `node` fails.

## Verifying it works

On successful connection, the server prints to stderr:

```
Chronicle - Your personal memory augmentation system
```

Claude's tool list should show 20 chronicle tools. If the tools appear but queries return nothing, `DB_PATH` is probably pointing at the wrong file.

## Database location

```
~/chronicle/data/chronicle.db
```

The path is hardcoded in the Claude config. If you move the database, update it there too.
