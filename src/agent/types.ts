/**
 * Type definitions for AI Canvas Agent
 */

export interface AgentConfig {
  openaiApiKey: string;
  tavilyApiKey: string;
  model?: string;
  temperature?: number;
  streaming?: boolean;
}

export interface CanvasAction {
  type: 'CREATE' | 'MOVE' | 'RESIZE' | 'DELETE' | 'ARRANGE' | 'UPDATE' | 'ALIGN' | 'BULK_CREATE' | 'DELETE_ALL';
  shape?: 'rectangle' | 'circle' | 'triangle';
  shapeId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  text?: string;
  // For batch operations
  shapeIds?: string[];
  positions?: Array<{ x: number; y: number }>;
  layout?: 'horizontal' | 'vertical' | 'grid';
  alignment?: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y'; // For ALIGN action
  spacing?: number;
  // For BULK_CREATE:
  count?: number;           // Number of shapes to create (10-1000)
  pattern?: 'random' | 'grid' | 'horizontal' | 'vertical' | 'circular';
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'mixed';
  centerX?: number;         // Optional center point for patterns
  centerY?: number;
}

export interface AgentResponse {
  actions: CanvasAction[];
  summary: string;
  reasoning?: string;
}

export interface CanvasState {
  shapes: Array<{
    id: string;
    type: 'rectangle' | 'circle' | 'triangle';
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    text?: string;
    rotation?: number;
    isLocked?: boolean;
    lockedBy?: string;
  }>;
  canvasWidth: number;
  canvasHeight: number;
}

export interface UserContext {
  userId: string;
  displayName: string;
  cursorColor: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

