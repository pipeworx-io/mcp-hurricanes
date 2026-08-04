# mcp-hurricanes

Hurricanes / tropical cyclones MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `active_storms` | List currently active tropical cyclones (tropical storms / hurricanes) from the US National Hurricane Center — name, classification, Saffir-Simpson category, position, max winds, pressure, movement, and links to official advisories/forecast cone. Filter by basin. Keyless. Returns an empty list in the off-season. |
| `storm_details` | Full details for one active storm by id (e.g. "al052026") or name (e.g. "Douglas"), including all advisory/forecast/cone/surge product links. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "hurricanes": {
      "url": "https://gateway.pipeworx.io/hurricanes/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Hurricanes data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
