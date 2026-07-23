# Facebook Marketplace MCP

A focused Model Context Protocol server for searching Facebook Marketplace from AI agents.

This repo is a hardened, Facebook-only variant inspired by `jlsookiki/secondhand-mcp`. It keeps the useful Facebook Marketplace search and details flow, removes the eBay/Depop/Poshmark paths, and avoids browser automation entirely.

## What It Does

- Search Facebook Marketplace listings by query, city, and price range
- Get full listing details from a returned listing ID
- Return listing title, price, location, seller name when available, URL, description, delivery type, and photo URLs
- Prefer exact US city matches when Facebook returns ambiguous locations

## Safety Defaults

- No Facebook login
- No Facebook cookies
- No Chrome or headless browser automation
- No browser profile access
- No eBay API keys
- No paid APIs

The server only calls Facebook public/internal Marketplace GraphQL endpoints. These endpoints can change, so the tool may need maintenance if Facebook updates its frontend operation IDs.

## Install

Requires Node.js 20.18.1+.

```bash
npm install
npm run build
```

## MCP Config

### Git-pinned portable install

The repository tracks a self-contained compiled `dist/` entrypoint and has no
runtime package dependencies. Development dependencies are exact-pinned and used
only to type-check and rebuild the bundle. Agents can therefore use an exact
reviewed commit without a machine-specific checkout path:

```bash
npx -y git+https://github.com/Tyvonneboykin/facebook-marketplace-mcp.git#<pinned-commit>
```

Keep the full commit SHA in managed MCP configuration. Do not use a branch name
or an unpinned Git URL.

### Claude Desktop

Add this to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "facebook-marketplace": {
      "command": "node",
      "args": ["/absolute/path/to/facebook-marketplace-mcp/dist/index.js"]
    }
  }
}
```

### OpenClaw

```bash
openclaw mcp add facebook-marketplace \
  --command node \
  --arg dist/index.js \
  --cwd /absolute/path/to/facebook-marketplace-mcp \
  --include search_marketplace,get_listing_details,list_marketplaces
```

## Tools

### `search_marketplace`

Search Facebook Marketplace.

Parameters:

- `query` required: search terms, for example `go kart`
- `location` optional: city or area, default `phoenix`
- `maxPrice` optional: maximum price
- `minPrice` optional: minimum price
- `limit` optional: maximum results, default `20`, Facebook caps one request at `24`
- `showSold` optional: include sold/pending/unavailable listings
- `includeImages` optional: include image URLs in search results

Example:

```json
{
  "query": "go kart",
  "location": "phoenix",
  "maxPrice": 1500,
  "limit": 5
}
```

### `get_listing_details`

Get full details for one listing.

Parameters:

- `listingId` required: ID from `search_marketplace`

Example:

```json
{
  "listingId": "999433246010406"
}
```

### `list_marketplaces`

Returns the enabled adapter and auth status.

## Development

```bash
npm install
npm run build
npm audit --omit=dev
```

Quick smoke test:

```bash
node dist/index.js
```

Use an MCP client to call `search_marketplace` with a small `limit` before increasing scan volume.

## Limitations

- Facebook can change its internal GraphQL `doc_id` values without notice.
- Location matching depends on Facebook's location search results.
- Search radius is currently fixed to the same local radius used by the upstream implementation.
- Respect Facebook's terms and rate limits. Do not hammer the endpoint.

## Attribution

Derived from the Facebook Marketplace implementation in:

https://github.com/jlsookiki/secondhand-mcp

Original project copyright belongs to its author. This repo keeps the MIT license.

## License

MIT
