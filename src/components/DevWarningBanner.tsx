/**
 * Development Warning Banner
 * 
 * Shows a warning when running in development mode with exposed API keys
 */

import { useState } from 'react';
import { shouldShowDevWarning } from '../utils/keyManager';

export function DevWarningBanner() {
  const [dismissed, setDismissed] = useState(false);
  
  if (!shouldShowDevWarning() || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <p className="font-semibold">Development Mode - API Keys Exposed</p>
          <p className="text-sm">
            Running with client-side API keys. Do NOT deploy this build to production.
            See <code className="bg-yellow-600 px-1 rounded">SECURITY.md</code> for details.
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 px-3 py-1 bg-black text-yellow-500 rounded hover:bg-gray-900 transition-colors"
        aria-label="Dismiss warning"
      >
        Dismiss
      </button>
    </div>
  );
}

