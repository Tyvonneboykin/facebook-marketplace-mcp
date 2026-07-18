#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { FacebookMarketplace } from './marketplaces/facebook.js';
import { ListingDetails, SearchParams, SearchResult } from './types.js';

const facebook = new FacebookMarketplace();

const tools: Tool[] = [
  {
    name: 'search_marketplace',
    description:
      'Search Facebook Marketplace by query, location, and price. No Facebook login, browser automation, cookies, or profile access required. Use get_listing_details with a returned listing ID for description, seller, delivery type, and photos.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query, for example "go kart", "dirt bike", or "toolbox".',
        },
        location: {
          type: 'string',
          description:
            'City or area to search, for example "phoenix", "scottsdale", "los angeles", or "austin". US city matches are preferred when Facebook returns ambiguous cities.',
          default: 'phoenix',
        },
        maxPrice: {
          type: 'number',
          description: 'Maximum price filter.',
        },
        minPrice: {
          type: 'number',
          description: 'Minimum price filter.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return. Facebook currently caps a single request at 24.',
          default: 20,
        },
        showSold: {
          type: 'boolean',
          description: 'Include sold, pending, hidden, or unavailable listings.',
          default: false,
        },
        includeImages: {
          type: 'boolean',
          description: 'Include image URLs in search results. Details always include all photo URLs.',
          default: false,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_listing_details',
    description:
      'Get full Facebook Marketplace listing details using a listing ID returned from search_marketplace.',
    inputSchema: {
      type: 'object',
      properties: {
        listingId: {
          type: 'string',
          description: 'Facebook Marketplace listing ID.',
        },
      },
      required: ['listingId'],
    },
  },
  {
    name: 'list_marketplaces',
    description: 'List the enabled marketplace adapter and auth status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

const server = new Server(
  {
    name: 'facebook-marketplace-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'search_marketplace': {
      const params = args as {
        query: string;
        location?: string;
        maxPrice?: number;
        minPrice?: number;
        limit?: number;
        showSold?: boolean;
        includeImages?: boolean;
      };

      const searchParams: SearchParams = {
        query: params.query,
        location: params.location || 'phoenix',
        maxPrice: params.maxPrice,
        minPrice: params.minPrice,
        limit: params.limit || 20,
        showSold: params.showSold || false,
      };

      try {
        const result = await facebook.search(searchParams);
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResult(result, searchParams, params.includeImages || false),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching Facebook Marketplace: ${error}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'get_listing_details': {
      const { listingId } = args as { listingId: string };

      if (!listingId) {
        return {
          content: [{ type: 'text', text: 'Missing required parameter: listingId' }],
          isError: true,
        };
      }

      try {
        const details = await facebook.getListingDetails(listingId);
        return {
          content: [{ type: 'text', text: formatListingDetails(details) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error fetching listing details: ${error}` }],
          isError: true,
        };
      }
    }

    case 'list_marketplaces': {
      return {
        content: [
          {
            type: 'text',
            text: 'Available marketplaces:\n\n- Facebook Marketplace (facebook) - No auth required',
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

function formatSearchResult(result: SearchResult, params: SearchParams, includeImages: boolean): string {
  if (!result.success) {
    return `Facebook Marketplace error: ${result.error}`;
  }

  if (result.listings.length === 0) {
    return `No listings found for "${params.query}" in ${params.location}`;
  }

  const lines = [
    `Found ${result.listings.length} Facebook Marketplace listings for "${params.query}"`,
    `Location: ${params.location}`,
    '',
  ];

  const sorted = [...result.listings].sort(
    (a, b) => (a.priceNumeric || 0) - (b.priceNumeric || 0),
  );

  for (const listing of sorted) {
    lines.push(`${listing.price} - ${listing.title}`);
    if (listing.location) lines.push(`   Location: ${listing.location}`);
    if (listing.seller) lines.push(`   Seller: ${listing.seller}`);
    lines.push(`   ID: ${listing.id}`);
    lines.push(`   URL: ${listing.url}`);

    if (listing.images?.length) {
      lines.push(
        includeImages
          ? `   Images: ${listing.images.join(' , ')}`
          : `   Photos: ${listing.images.length}`,
      );
    }

    lines.push('');
  }

  return lines.join('\n');
}

function formatListingDetails(details: ListingDetails): string {
  const lines = ['Listing details', `URL: ${details.url}`, ''];

  if (details.description) {
    lines.push(`Description: ${details.description}`);
    lines.push('');
  }

  if (details.location) lines.push(`Location: ${details.location}`);
  if (details.seller) lines.push(`Seller: ${details.seller}`);
  if (details.deliveryTypes?.length) lines.push(`Delivery: ${details.deliveryTypes.join(', ')}`);
  if (details.isShippingOffered) lines.push('Shipping available');

  if (details.images.length > 0) {
    lines.push('');
    lines.push(`Photos (${details.images.length}):`);
    for (const img of details.images) {
      lines.push(`   ${img}`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Facebook Marketplace MCP server started');
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
