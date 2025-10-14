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

// Initialize Raindrop API client
const raindrop = new RaindropClient(TOKEN);

// Create MCP server
const server = new Server(
  {
    name: 'raindrop-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ========== Tool Definitions ==========

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ========== Raindrop (Bookmark) Tools ==========
      {
        name: 'get_raindrop',
        description: 'Get a single bookmark by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The raindrop (bookmark) ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_raindrops',
        description: 'Get bookmarks from a collection with optional search and filtering. Use collectionId 0 for all bookmarks, -1 for unsorted, -99 for trash.',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: {
              type: 'number',
              description: 'Collection ID (0=all, -1=unsorted, -99=trash)',
              default: 0,
            },
            search: {
              type: 'string',
              description: 'Search query text',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed)',
              default: 0,
            },
            perpage: {
              type: 'number',
              description: 'Results per page (max 50)',
              default: 25,
            },
            sort: {
              type: 'string',
              description: 'Sort order: -created (default), created, score, -sort, title, -title, domain, -domain',
              default: '-created',
            },
            nested: {
              type: 'boolean',
              description: 'Include bookmarks from nested collections',
              default: false,
            },
          },
        },
      },
      {
        name: 'search_raindrops',
        description: 'Search for bookmarks across all collections using text query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text',
            },
            page: {
              type: 'number',
              description: 'Page number (0-indexed)',
              default: 0,
            },
            perpage: {
              type: 'number',
              description: 'Results per page (max 50)',
              default: 25,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_raindrop',
        description: 'Create a new bookmark. At minimum, provide a link URL. Optionally include title, tags, collection, notes, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            link: {
              type: 'string',
              description: 'URL to bookmark (required)',
            },
            title: {
              type: 'string',
              description: 'Bookmark title (max 1000 chars)',
            },
            excerpt: {
              type: 'string',
              description: 'Description or excerpt (max 10000 chars)',
            },
            note: {
              type: 'string',
              description: 'Personal notes (max 10000 chars)',
            },
            collection: {
              type: 'number',
              description: 'Collection ID (default: -1 for Unsorted)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tags',
            },
            important: {
              type: 'boolean',
              description: 'Mark as favorite',
              default: false,
            },
            pleaseParse: {
              type: 'object',
              description: 'Auto-parse metadata from URL',
            },
          },
          required: ['link'],
        },
      },
      {
        name: 'update_raindrop',
        description: 'Update an existing bookmark by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The raindrop (bookmark) ID to update',
            },
            link: {
              type: 'string',
              description: 'Updated URL',
            },
            title: {
              type: 'string',
              description: 'Updated title',
            },
            excerpt: {
              type: 'string',
              description: 'Updated description',
            },
            note: {
              type: 'string',
              description: 'Updated notes',
            },
            collection: {
              type: 'number',
              description: 'Move to collection ID',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated tags array',
            },
            important: {
              type: 'boolean',
              description: 'Favorite status',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_raindrop',
        description: 'Delete a bookmark by ID (moves to trash, or permanently deletes if already in trash)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The raindrop (bookmark) ID to delete',
            },
          },
          required: ['id'],
        },
      },

      // ========== Collection Tools ==========
      {
        name: 'get_collections',
        description: 'Get all root-level collections',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_child_collections',
        description: 'Get all child (nested) collections',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_collection',
        description: 'Get a specific collection by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The collection ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_collection',
        description: 'Create a new collection',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Collection name/title',
            },
            view: {
              type: 'string',
              description: 'Display view: list, grid, or masonry',
              default: 'list',
            },
            sort: {
              type: 'number',
              description: 'Sort order number',
            },
            public: {
              type: 'boolean',
              description: 'Make collection publicly accessible',
              default: false,
            },
            parentId: {
              type: 'number',
              description: 'Parent collection ID for nesting',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_collection',
        description: 'Update an existing collection',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The collection ID to update',
            },
            title: {
              type: 'string',
              description: 'Updated collection name',
            },
            view: {
              type: 'string',
              description: 'Display view: list, grid, or masonry',
            },
            sort: {
              type: 'number',
              description: 'Sort order number',
            },
            public: {
              type: 'boolean',
              description: 'Public accessibility',
            },
            parentId: {
              type: 'number',
              description: 'Parent collection ID',
            },
            expanded: {
              type: 'boolean',
              description: 'Expand/collapse state',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete a collection by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The collection ID to delete',
            },
          },
          required: ['id'],
        },
      },

      // ========== Tag Tools ==========
      {
        name: 'get_tags',
        description: 'Get all tags, optionally filtered by collection',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: {
              type: 'number',
              description: 'Optional collection ID to filter tags',
            },
          },
        },
      },
      {
        name: 'rename_tag',
        description: 'Rename a tag across all or specific collection',
        inputSchema: {
          type: 'object',
          properties: {
            oldTag: {
              type: 'string',
              description: 'Current tag name',
            },
            newTag: {
              type: 'string',
              description: 'New tag name',
            },
            collectionId: {
              type: 'number',
              description: 'Optional collection ID to limit scope',
            },
          },
          required: ['oldTag', 'newTag'],
        },
      },
      {
        name: 'merge_tags',
        description: 'Merge multiple tags into one',
        inputSchema: {
          type: 'object',
          properties: {
            oldTags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tag names to merge',
            },
            newTag: {
              type: 'string',
              description: 'Target tag name',
            },
            collectionId: {
              type: 'number',
              description: 'Optional collection ID to limit scope',
            },
          },
          required: ['oldTags', 'newTag'],
        },
      },
      {
        name: 'delete_tags',
        description: 'Delete one or more tags',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tag names to delete',
            },
            collectionId: {
              type: 'number',
              description: 'Optional collection ID to limit scope',
            },
          },
          required: ['tags'],
        },
      },

      // ========== User Tools ==========
      {
        name: 'get_user',
        description: 'Get current user information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// ========== Tool Handlers ==========

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      // ========== Raindrop Tools ==========
      case 'get_raindrop': {
        const result = await raindrop.getRaindrop(args.id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_raindrops': {
        const { collectionId = 0, search, page, perpage, sort, nested } = args;
        const result = await raindrop.getRaindrops(collectionId, {
          search,
          page,
          perpage,
          sort,
          nested,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'search_raindrops': {
        const { query, page, perpage } = args;
        const result = await raindrop.searchRaindrops(query, { page, perpage });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'create_raindrop': {
        const data = { ...args };
        if (args.pleaseParse !== undefined) {
          data.pleaseParse = args.pleaseParse;
        }
        const result = await raindrop.createRaindrop(data);
        return {
          content: [
            {
              type: 'text',
              text: `Bookmark created successfully!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'update_raindrop': {
        const { id, ...data } = args;
        const result = await raindrop.updateRaindrop(id, data);
        return {
          content: [
            {
              type: 'text',
              text: `Bookmark updated successfully!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'delete_raindrop': {
        const result = await raindrop.deleteRaindrop(args.id);
        return {
          content: [
            {
              type: 'text',
              text: `Bookmark deleted successfully!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      // ========== Collection Tools ==========
      case 'get_collections': {
        const result = await raindrop.getCollections();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_child_collections': {
        const result = await raindrop.getChildCollections();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_collection': {
        const result = await raindrop.getCollection(args.id);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'create_collection': {
        const data = { ...args };
        if (args.parentId !== undefined) {
          data.parent = { $id: args.parentId };
          delete data.parentId;
        }
        const result = await raindrop.createCollection(data);
        return {
          content: [
            {
              type: 'text',
              text: `Collection created successfully!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'update_collection': {
        const { id, parentId, ...data } = args;
        if (parentId !== undefined) {
          data.parent = { $id: parentId };
        }
        const result = await raindrop.updateCollection(id, data);
        return {
          content: [
            {
              type: 'text',
              text: `Collection updated successfully!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'delete_collection': {
        const result = await raindrop.deleteCollection(args.id);
        return {
          content: [
            {
              type: 'text',
              text: `Collection deleted successfully!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      // ========== Tag Tools ==========
      case 'get_tags': {
        const result = await raindrop.getTags(args.collectionId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'rename_tag': {
        const result = await raindrop.renameTag(
          args.oldTag,
          args.newTag,
          args.collectionId
        );
        return {
          content: [
            {
              type: 'text',
              text: `Tag renamed successfully from "${args.oldTag}" to "${args.newTag}"!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'merge_tags': {
        const result = await raindrop.mergeTags(
          args.oldTags,
          args.newTag,
          args.collectionId
        );
        return {
          content: [
            {
              type: 'text',
              text: `Tags merged successfully into "${args.newTag}"!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'delete_tags': {
        const result = await raindrop.deleteTags(args.tags, args.collectionId);
        return {
          content: [
            {
              type: 'text',
              text: `Tags deleted successfully!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      // ========== User Tools ==========
      case 'get_user': {
        const result = await raindrop.getCurrentUser();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Raindrop MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
