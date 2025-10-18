/**
 * Tavily Search Tool for LangChain Agent
 * 
 * Provides contextual search capabilities for design knowledge,
 * layout best practices, and general information.
 */

import { Tool } from '@langchain/core/tools';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { getTavilyKey, isAgentEnvironmentSecure } from '../../utils/keyManager';

/**
 * Initialize Tavily search tool
 */
export function createTavilyTool(): Tool {
  // Check if we're in a secure environment
  if (!isAgentEnvironmentSecure()) {
    console.warn('Tavily search requires backend API in production.');
    return new MockTavilyTool();
  }

  const apiKey = getTavilyKey();

  if (!apiKey) {
    console.warn('Tavily API key not found. Search functionality will be limited.');
    // Return a mock tool that explains the limitation
    return new MockTavilyTool();
  }

  if (apiKey === 'your_tavily_api_key_here') {
    console.warn('Please replace the Tavily API key placeholder with your actual key.');
    return new MockTavilyTool();
  }

  try {
    return new TavilySearchResults({
      apiKey,
      maxResults: 3, // Limit results to reduce cost and processing time
    });
  } catch (error) {
    console.error('Failed to initialize Tavily tool:', error);
    return new MockTavilyTool();
  }
}

/**
 * Mock Tavily tool for when API key is not available
 * Returns helpful messages instead of actual search results
 */
class MockTavilyTool extends Tool {
  name = 'tavily_search';
  description = `Search for design and layout information. Note: Tavily API key not configured, so search functionality is limited.`;

  async _call(query: string): Promise<string> {
    // Provide some basic design knowledge without external API
    const designKnowledge: Record<string, string> = {
      'login form': JSON.stringify([
        {
          title: 'Login Form Best Practices',
          content: 'A standard login form includes: username/email field at top, password field below, submit button at bottom. Spacing: 20-40px between fields. Size: 300-400px width.',
          url: 'design-system/forms'
        }
      ]),
      'grid layout': JSON.stringify([
        {
          title: 'Grid Layout Principles',
          content: 'Use consistent spacing (e.g., 120px). Common grids: 2x2, 3x3, 4x4. Center alignment often works best. Leave margins around edges.',
          url: 'design-system/layouts'
        }
      ]),
      'color palette': JSON.stringify([
        {
          title: 'Color Palette Basics',
          content: 'Primary colors: red (#ef4444), blue (#3b82f6), green (#22c55e). Use grey (#CCCCCC) for neutral elements. Limit to 2-3 colors per design.',
          url: 'design-system/colors'
        }
      ]),
      'navigation bar': JSON.stringify([
        {
          title: 'Navigation Bar Design',
          content: 'Typical nav bar: horizontal layout, 4-6 items, spacing 80-100px, height 60-80px. Place logo at left, menu items in center or right.',
          url: 'design-system/navigation'
        }
      ]),
    };

    // Simple keyword matching
    const lowerQuery = query.toLowerCase();
    for (const [keyword, response] of Object.entries(designKnowledge)) {
      if (lowerQuery.includes(keyword)) {
        return response;
      }
    }

    // Default response
    return JSON.stringify([
      {
        title: 'Design Information',
        content: 'Consider: spacing (100-120px), alignment (centered or left-aligned), color consistency, and visual hierarchy. Tavily API not configured for detailed search.',
        url: 'design-basics'
      }
    ]);
  }
}

/**
 * Tavily-aware wrapper that adds context
 */
export class EnhancedTavilyTool extends Tool {
  private tavilyTool: Tool;

  constructor() {
    super();
    this.tavilyTool = createTavilyTool();
  }

  name = 'search_design_knowledge';
  description = `Search for design and layout information, best practices, or general knowledge about UI/UX.
    Use this when you need context about:
    - Design patterns (e.g., "login form layout")
    - Layout best practices (e.g., "grid spacing recommendations")
    - Color theory or palette suggestions
    - UI component standards
    Input should be a clear search query as a string.
    Returns: JSON array of search results with title, content, and url.`;

  async _call(query: string): Promise<string> {
    try {
      // Add context to make search more relevant for canvas design
      const enhancedQuery = `UI design ${query} best practices`;
      const results = await this.tavilyTool.call(enhancedQuery);
      return results;
    } catch (error) {
      return JSON.stringify({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Continuing without external search results'
      });
    }
  }
}

/**
 * Export the tool
 */
export const tavilyTool = new EnhancedTavilyTool();

