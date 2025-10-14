# Raindrop.io MCP Server

A Model Context Protocol (MCP) server for interacting with the Raindrop.io API. This server enables Claude Code and other MCP clients to manage bookmarks, collections, and tags in your Raindrop.io account.

## Features

### Raindrop (Bookmark) Management
- Get single or multiple bookmarks
- Search bookmarks across collections
- Create new bookmarks with metadata
- Update existing bookmarks
- Delete bookmarks

### Collection Management
- List all collections (root and nested)
- Get specific collection details
- Create new collections
- Update collection properties
- Delete collections

### Tag Management
- Get all tags (optionally filtered by collection)
- Rename tags
- Merge multiple tags into one
- Delete tags

### User Information
- Get current user profile and settings

## Installation

```bash
cd raindrop-mcp-server
npm install
```

## Configuration

### 1. Get Your Raindrop.io API Token

1. Visit https://app.raindrop.io/settings/integrations
2. Create a new app or open an existing one
3. Copy the **Test token** from your app settings

### 2. Configure MCP Settings

Add the server to your Claude Code MCP settings file (`~/.config/claude-code/mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "raindrop": {
      "command": "node",
      "args": ["/home/user/raindrop-mcp-server/src/index.js"],
      "env": {
        "RAINDROP_TOKEN": "your-token-here"
      }
    }
  }
}
```

Replace `your-token-here` with your actual Raindrop.io test token.

**Alternative:** You can also set the token as an environment variable:

```bash
export RAINDROP_TOKEN="your-token-here"
```

## Available Tools

### Bookmark Tools

#### `get_raindrop`
Get a single bookmark by ID.

**Parameters:**
- `id` (string, required): The raindrop ID

#### `get_raindrops`
Get bookmarks from a collection with filtering and pagination.

**Parameters:**
- `collectionId` (number, optional): Collection ID (0=all, -1=unsorted, -99=trash, default: 0)
- `search` (string, optional): Search query
- `page` (number, optional): Page number (0-indexed, default: 0)
- `perpage` (number, optional): Results per page (max 50, default: 25)
- `sort` (string, optional): Sort order (-created, created, score, title, etc.)
- `nested` (boolean, optional): Include bookmarks from nested collections

#### `search_raindrops`
Search for bookmarks across all collections.

**Parameters:**
- `query` (string, required): Search query text
- `page` (number, optional): Page number
- `perpage` (number, optional): Results per page

#### `create_raindrop`
Create a new bookmark.

**Parameters:**
- `link` (string, required): URL to bookmark
- `title` (string, optional): Bookmark title
- `excerpt` (string, optional): Description
- `note` (string, optional): Personal notes
- `collection` (number, optional): Collection ID (-1 for Unsorted)
- `tags` (array, optional): Array of tag strings
- `important` (boolean, optional): Mark as favorite
- `pleaseParse` (object, optional): Auto-parse metadata from URL

#### `update_raindrop`
Update an existing bookmark.

**Parameters:**
- `id` (string, required): The raindrop ID to update
- `link`, `title`, `excerpt`, `note`, `collection`, `tags`, `important` (optional): Fields to update

#### `delete_raindrop`
Delete a bookmark (moves to trash, or permanently deletes if already in trash).

**Parameters:**
- `id` (string, required): The raindrop ID to delete

### Collection Tools

#### `get_collections`
Get all root-level collections.

#### `get_child_collections`
Get all nested (child) collections.

#### `get_collection`
Get a specific collection by ID.

**Parameters:**
- `id` (string, required): The collection ID

#### `create_collection`
Create a new collection.

**Parameters:**
- `title` (string, required): Collection name
- `view` (string, optional): Display view (list, grid, masonry)
- `sort` (number, optional): Sort order
- `public` (boolean, optional): Public accessibility
- `parentId` (number, optional): Parent collection ID for nesting

#### `update_collection`
Update an existing collection.

**Parameters:**
- `id` (string, required): The collection ID
- `title`, `view`, `sort`, `public`, `parentId`, `expanded` (optional): Fields to update

#### `delete_collection`
Delete a collection by ID.

**Parameters:**
- `id` (string, required): The collection ID

### Tag Tools

#### `get_tags`
Get all tags, optionally filtered by collection.

**Parameters:**
- `collectionId` (number, optional): Filter tags by collection

#### `rename_tag`
Rename a tag across all or specific collection.

**Parameters:**
- `oldTag` (string, required): Current tag name
- `newTag` (string, required): New tag name
- `collectionId` (number, optional): Limit scope to collection

#### `merge_tags`
Merge multiple tags into one.

**Parameters:**
- `oldTags` (array, required): Array of tag names to merge
- `newTag` (string, required): Target tag name
- `collectionId` (number, optional): Limit scope to collection

#### `delete_tags`
Delete one or more tags.

**Parameters:**
- `tags` (array, required): Array of tag names to delete
- `collectionId` (number, optional): Limit scope to collection

### User Tools

#### `get_user`
Get current user information and profile.

## Usage Examples

Once configured in Claude Code, you can interact with your Raindrop.io bookmarks naturally:

```
"Show me my recent bookmarks"
"Create a bookmark for https://example.com with tags 'programming' and 'tutorial'"
"Search for bookmarks about 'machine learning'"
"Create a new collection called 'Research Papers'"
"Move bookmark ID 12345 to collection ID 67890"
"Get all my tags"
"Rename tag 'js' to 'javascript'"
```

## API Rate Limits

The Raindrop.io API allows up to **120 requests per minute** per authenticated user. The rate limit headers will be included in responses:
- `X-RateLimit-Limit`
- `RateLimit-Remaining`
- `X-RateLimit-Reset`

## Documentation

- [Raindrop.io API Documentation](https://developer.raindrop.io/)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)

## License

MIT
