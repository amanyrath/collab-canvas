/**
 * Central export for all LangChain tools
 */

export { canvasTools, getCanvasState } from './canvas';
export { tavilyTool } from './tavily';

import { canvasTools } from './canvas';
import { tavilyTool } from './tavily';

/**
 * All tools available to the agent
 */
export const allTools = [
  ...canvasTools,
  tavilyTool,
];

/**
 * Get tool descriptions for system prompt
 */
export function getToolDescriptions(): string {
  return allTools
    .map(tool => `- ${tool.name}: ${tool.description}`)
    .join('\n');
}

/**
 * Tool categories for documentation
 */
export const toolCategories = {
  canvas: {
    create: 'create_shape',
    move: 'move_shape',
    resize: 'resize_shape',
    delete: 'delete_shape',
    arrange: 'arrange_shapes',
    query: 'get_canvas_state',
  },
  search: {
    design: 'search_design_knowledge',
  },
};

