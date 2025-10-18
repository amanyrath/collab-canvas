/**
 * Agent API Client
 * 
 * Handles communication with the Vercel serverless backend
 * for agent/LLM operations
 */

interface CanvasContext {
  shapes: any[];
  selectedShapes: string[];
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface AgentChatRequest {
  message: string;
  canvasContext: CanvasContext;
  userId: string;
}

export interface CanvasAction {
  type: 'create_shape' | 'move_shape' | 'update_shape' | 'delete_shape' | 'arrange_shapes';
  properties?: any;
}

export interface AgentChatResponse {
  success: boolean;
  action?: CanvasAction;
  actions?: CanvasAction[];
  message: string;
  error?: string;
}

/**
 * Get the API base URL based on environment
 */
function getApiBaseUrl(): string {
  // In development, use local dev server or Vercel dev
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }
  
  // In production, use Vercel deployment URL
  // The API routes are on the same domain
  return '';
}

/**
 * Send a chat message to the agent and get a response
 */
export async function sendAgentMessage(
  request: AgentChatRequest
): Promise<AgentChatResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/agent/chat`;

  try {
    console.log('Sending agent request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API request failed with status ${response.status}`
      );
    }

    const data: AgentChatResponse = await response.json();
    return data;

  } catch (error) {
    console.error('Agent API error:', error);
    
    return {
      success: false,
      message: 'Failed to communicate with agent service',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Health check for the API
 */
export async function checkApiHealth(): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/health`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

/**
 * Check if backend API is available and configured
 */
export async function isBackendAvailable(): Promise<{
  available: boolean;
  message: string;
}> {
  const healthy = await checkApiHealth();
  
  if (healthy) {
    return {
      available: true,
      message: 'Backend API is available',
    };
  }

  // Check if we're in dev mode and suggest local setup
  if (import.meta.env.DEV) {
    return {
      available: false,
      message: 'Backend API not running. Run "vercel dev" to start the local API server.',
    };
  }

  return {
    available: false,
    message: 'Backend API is not available. Please check your deployment.',
  };
}

