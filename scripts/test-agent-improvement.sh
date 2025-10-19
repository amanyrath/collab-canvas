#!/bin/bash
# Test Script for AI Agent Improvement
# Compares old vs new system prompt performance

set -e  # Exit on error

echo "🧪 AI Agent Improvement Test Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backup old prompt
echo "${YELLOW}Step 1: Backing up current prompt...${NC}"
if [ -f "src/agent/prompts/system.ts" ]; then
    cp src/agent/prompts/system.ts src/agent/prompts/system_old_backup.ts
    echo "${GREEN}✅ Backed up to system_old_backup.ts${NC}"
else
    echo "❌ system.ts not found!"
    exit 1
fi

# Step 2: Show comparison
echo ""
echo "${YELLOW}Step 2: Comparing prompts...${NC}"
OLD_LINES=$(wc -l < src/agent/prompts/system_old_backup.ts)
NEW_LINES=$(wc -l < src/agent/prompts/system_new.ts)
REDUCTION=$(( 100 - (NEW_LINES * 100 / OLD_LINES) ))

echo "Old prompt: $OLD_LINES lines"
echo "New prompt: $NEW_LINES lines"
echo "${GREEN}Reduction: $REDUCTION%${NC}"

# Step 3: Ask user to confirm
echo ""
echo "${YELLOW}Step 3: Ready to switch?${NC}"
read -p "Replace system.ts with new prompt? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cp src/agent/prompts/system_new.ts src/agent/prompts/system.ts
    echo "${GREEN}✅ Switched to new prompt!${NC}"
    
    # Step 4: Rebuild
    echo ""
    echo "${YELLOW}Step 4: Rebuilding...${NC}"
    npm run build
    
    echo ""
    echo "${GREEN}✅ All done!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run dev"
    echo "2. Test commands from AGENT_IMPROVEMENT_PLAN.md"
    echo "3. Compare performance"
    echo ""
    echo "To revert: cp src/agent/prompts/system_old_backup.ts src/agent/prompts/system.ts"
else
    echo "${YELLOW}Skipped. No changes made.${NC}"
fi

