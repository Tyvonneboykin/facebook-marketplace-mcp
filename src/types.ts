/**
 * Shared types for the Facebook Marketplace MCP server
 */

export interface Listing {
  id: string;
  title: string;
  price: string;
  priceNumeric?: number;
  currency?: string;
  location?: string;
  description?: string;
  url: string;
  images?: string[];
  seller?: string;
  marketplace: string;
  scrapedAt: string;
}

export interface SearchParams {
  query: string;
  location?: string;
  maxPrice?: number;
  minPrice?: number;
  limit?: number;
  showSold?: boolean;
}

export interface SearchResult {
  marketplace: string;
  success: boolean;
  listings: Listing[];
  error?: string;
  totalFound?: number;
  note?: string;
}

export interface ListingDetails {
  id: string;
  description?: string;
  images: string[];
  location?: string;
  locationCoords?: { latitude: number; longitude: number };
  seller?: string;
  deliveryTypes?: string[];
  isShippingOffered?: boolean;
  url: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name: string;
}
