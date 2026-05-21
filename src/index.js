#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RaindropClient } from './raindrop-client.js';

const TOKEN = process.env.RAINDROP_TOKEN;

if (!TOKEN) {
  console.error('Error: RAINDROP_TOKEN environment variable is required');
  console.error('Get your test token from: https://app.raindrop.io/settings/integrations');
  process.exit(1);
}

const raindrop = new RaindropClient(TOKEN);

const server = new Server(
  { name: 'raindrop-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ========== Response Shapers ==========
// Strip internal Raindrop API fields — only return what the LLM needs.

function shapeRaindrop(r) {
  const item = r?.item || r;
  if (!item?._id) return r;
  return {
    id: item._id,
    title: item.title,
    link: item.link,
    excerpt: item.excerpt,
    note: item.note,
    tags: item.tags,
    collectionId: item.collection?.$id ?? null,
    important: item.important,
    type: item.type,
    created: item.created,
    lastUpdate: item.lastUpdate,
  };
}

function shapeRaindrops(r) {
  if (!r?.items) return r;
  return {
    count: r.count,
    items: r.items.map(item => ({
      id: item._id,
      title: item.title,
      link: item.link,
      excerpt: item.excerpt,
      tags: item.tags,
      collectionId: item.collection?.$id ?? null,
      important: item.important,
      type: item.type,
      created: item.created,
    })),
  };
}

function shapeCollection(item) {
  if (!item) return item;
  const c = item.item || item;
  return {
    id: c._id,
    title: c.title,
    count: c.count,
    parentId: c.parent?.$id ?? null,
    public: c.public,
    view: c.view,
    sort: c.sort,
  };
}

function shapeTags(r) {
  if (!r?.items) return r;
  return r.items.map(t => ({ tag: t._id, count: t.count }));
}

function shapeUser(r) {
  const u = r?.user || r;
  return {
    id: u._id,
    name: u.fullName,
    email: u.email,
    pro: u.pro,
  };
}

// ========== Tool Definitions ==========

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_raindrop',
        description: 'Get a single bookmark by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Bookmark ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_raindrops',
        description: 'Get bookmarks from a collection with optional search and filtering. collectionId: 0=all, -1=unsorted, -99=trash.',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'number', description: 'Collection ID (0=all, -1=unsorted, -99=trash)', default: 0 },
            search: { type: 'string', description: 'Search query' },
            page: { type: 'number', description: 'Page number (0-indexed)', default: 0 },
            perpage: { type: 'number', description: 'Results per page (max 50)', default: 25 },
            sort: { type: 'string', description: 'Sort: -created (default), created, score, -sort, title, -title, domain, -domain', default: '-created' },
            nested: { type: 'boolean', description: 'Include bookmarks from nested collections', default: false },
          },
        },
      },
      {
        name: 'create_raindrop',
        description: 'Create a new bookmark.',
        inputSchema: {
          type: 'object',
          properties: {
            link: { type: 'string', description: 'URL to bookmark (required)' },
            title: { type: 'string', description: 'Bookmark title (max 1000 chars)' },
            excerpt: { type: 'string', description: 'Description or excerpt (max 10000 chars)' },
            note: { type: 'string', description: 'Personal notes (max 10000 chars)' },
            collection: { type: 'number', description: 'Collection ID (default: -1 for Unsorted)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Array of tags' },
            important: { type: 'boolean', description: 'Mark as favorite', default: false },
            pleaseParse: { type: 'boolean', description: 'If true, Raindrop auto-fetches the page title and excerpt from the URL' },
          },
          required: ['link'],
        },
      },
      {
        name: 'update_raindrop',
        description: 'Update an existing bookmark by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Bookmark ID to update' },
            link: { type: 'string', description: 'Updated URL' },
            title: { type: 'string', description: 'Updated title' },
            excerpt: { type: 'string', description: 'Updated description' },
            note: { type: 'string', description: 'Updated notes' },
            collection: { type: 'number', description: 'Move to collection ID' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Updated tags array' },
            important: { type: 'boolean', description: 'Favorite status' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_raindrop',
        description: 'Delete a bookmark by ID. Moves to trash, or permanently deletes if already in trash.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Bookmark ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_collections',
        description: 'Get root-level collections. Set include_children=true to also return nested collections.',
        inputSchema: {
          type: 'object',
          properties: {
            include_children: { type: 'boolean', description: 'Also return nested/child collections', default: false },
          },
        },
      },
      {
        name: 'get_collection',
        description: 'Get a specific collection by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Collection ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_collection',
        description: 'Create a new collection.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Collection name' },
            view: { type: 'string', description: 'Display view: list, grid, or masonry', default: 'list' },
            sort: { type: 'number', description: 'Sort order number' },
            public: { type: 'boolean', description: 'Make collection publicly accessible', default: false },
            parentId: { type: 'number', description: 'Parent collection ID for nesting' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_collection',
        description: 'Update an existing collection.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Collection ID to update' },
            title: { type: 'string', description: 'Updated collection name' },
            view: { type: 'string', description: 'Display view: list, grid, or masonry' },
            sort: { type: 'number', description: 'Sort order number' },
            public: { type: 'boolean', description: 'Public accessibility' },
            parentId: { type: 'number', description: 'Parent collection ID' },
            expanded: { type: 'boolean', description: 'Expand/collapse state' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete a collection by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Collection ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_tags',
        description: 'Get all tags, optionally filtered by collection.',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'number', description: 'Optional collection ID to filter tags' },
          },
        },
      },
      {
        name: 'rename_tag',
        description: 'Rename a tag across all or a specific collection.',
        inputSchema: {
          type: 'object',
          properties: {
            oldTag: { type: 'string', description: 'Current tag name' },
            newTag: { type: 'string', description: 'New tag name' },
            collectionId: { type: 'number', description: 'Optional collection ID to limit scope' },
          },
          required: ['oldTag', 'newTag'],
        },
      },
      {
        name: 'merge_tags',
        description: 'Merge multiple tags into one.',
        inputSchema: {
          type: 'object',
          properties: {
            oldTags: { type: 'array', items: { type: 'string' }, description: 'Tags to merge' },
            newTag: { type: 'string', description: 'Target tag name' },
            collectionId: { type: 'number', description: 'Optional collection ID to limit scope' },
          },
          required: ['oldTags', 'newTag'],
        },
      },
      {
        name: 'delete_tags',
        description: 'Delete one or more tags.',
        inputSchema: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' }, description: 'Tag names to delete' },
            collectionId: { type: 'number', description: 'Optional collection ID to limit scope' },
          },
          required: ['tags'],
        },
      },
      {
        name: 'get_user',
        description: 'Get current user information.',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  };
});

// ========== Tool Handlers ==========

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'get_raindrop': {
        const result = await raindrop.getRaindrop(args.id);
        return { content: [{ type: 'text', text: JSON.stringify(shapeRaindrop(result)) }] };
      }

      case 'get_raindrops': {
        const { collectionId = 0, search, page, perpage, sort, nested } = args;
        const result = await raindrop.getRaindrops(collectionId, { search, page, perpage, sort, nested });
        return { content: [{ type: 'text', text: JSON.stringify(shapeRaindrops(result)) }] };
      }

      case 'create_raindrop': {
        const data = { ...args };
        if (args.pleaseParse) {
          data.pleaseParse = {};
        }
        const result = await raindrop.createRaindrop(data);
        return { content: [{ type: 'text', text: `Bookmark created: ${JSON.stringify(shapeRaindrop(result))}` }] };
      }

      case 'update_raindrop': {
        const { id, ...data } = args;
        const result = await raindrop.updateRaindrop(id, data);
        return { content: [{ type: 'text', text: `Bookmark updated: ${JSON.stringify(shapeRaindrop(result))}` }] };
      }

      case 'delete_raindrop': {
        await raindrop.deleteRaindrop(args.id);
        return { content: [{ type: 'text', text: `Bookmark ${args.id} deleted` }] };
      }

      case 'get_collections': {
        const rootResult = await raindrop.getCollections();
        const root = (rootResult.items || []).map(shapeCollection);
        if (args.include_children) {
          const childResult = await raindrop.getChildCollections();
          const children = (childResult.items || []).map(shapeCollection);
          return { content: [{ type: 'text', text: JSON.stringify({ root, children }) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(root) }] };
      }

      case 'get_collection': {
        const result = await raindrop.getCollection(args.id);
        return { content: [{ type: 'text', text: JSON.stringify(shapeCollection(result)) }] };
      }

      case 'create_collection': {
        const data = { ...args };
        if (args.parentId !== undefined) {
          data.parent = { $id: args.parentId };
          delete data.parentId;
        }
        const result = await raindrop.createCollection(data);
        return { content: [{ type: 'text', text: `Collection created: ${JSON.stringify(shapeCollection(result))}` }] };
      }

      case 'update_collection': {
        const { id, parentId, ...data } = args;
        if (parentId !== undefined) {
          data.parent = { $id: parentId };
        }
        const result = await raindrop.updateCollection(id, data);
        return { content: [{ type: 'text', text: `Collection updated: ${JSON.stringify(shapeCollection(result))}` }] };
      }

      case 'delete_collection': {
        await raindrop.deleteCollection(args.id);
        return { content: [{ type: 'text', text: `Collection ${args.id} deleted` }] };
      }

      case 'get_tags': {
        const result = await raindrop.getTags(args.collectionId);
        return { content: [{ type: 'text', text: JSON.stringify(shapeTags(result)) }] };
      }

      case 'rename_tag': {
        await raindrop.renameTag(args.oldTag, args.newTag, args.collectionId);
        return { content: [{ type: 'text', text: `Tag renamed: "${args.oldTag}" → "${args.newTag}"` }] };
      }

      case 'merge_tags': {
        await raindrop.mergeTags(args.oldTags, args.newTag, args.collectionId);
        return { content: [{ type: 'text', text: `Tags merged into "${args.newTag}"` }] };
      }

      case 'delete_tags': {
        await raindrop.deleteTags(args.tags, args.collectionId);
        return { content: [{ type: 'text', text: `Tags deleted: ${args.tags.join(', ')}` }] };
      }

      case 'get_user': {
        const result = await raindrop.getCurrentUser();
        return { content: [{ type: 'text', text: JSON.stringify(shapeUser(result)) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Raindrop MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
