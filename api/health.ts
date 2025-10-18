/**
 * Health Check Endpoint
 * 
 * Simple endpoint to verify the API is running
 * 
 * GET /api/health
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CollabCanvas Agent API',
    version: '1.0.0'
  });
}

