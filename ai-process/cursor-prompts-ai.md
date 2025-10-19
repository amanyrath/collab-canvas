# Cursor Prompts for AI System Prompt Update
## Sequential Implementation Guide

---

## Context Summary

We're updating the AI system prompt to be Christmas-focused and aligned with the existing implementation in `actionExecutor.ts`. The executor already has:
- `executeCreateChristmasTree` - Creates pre-textured tree using `createClassicTree()`
- `executeDecorateTree` - Adds 8 ornaments (12px circles) + 3 gifts (30-50px rectangles)
- `executeApplySantaMagic` - Applies textures via `applySantaMagic()` utility

---

## PROMPT 1: Replace System Prompt with Christmas-Focused Version

**Copy this into Cursor:**

```
Replace the STATIC_SYSTEM_PROMPT in src/ai/system.ts with the new Christmas-focused version.

Requirements:
1. Move Christmas commands (CREATE_CHRISTMAS_TREE, DECORATE_TREE, APPLY_SANTA_MAGIC) to TOP priority section
2. Update examples to be Christmas-focused with detailed multi-step scenes
3. Add texture mapping explanation (triangles→trees, circles→ornaments, rectangles→trunks/gifts)
4. Streamline content to ~450 lines total
5. Keep all existing action types (CREATE, MOVE, RESIZE, DELETE, ARRANGE, ALIGN, BULK_CREATE, DELETE_ALL)

Key specifications from actionExecutor.ts:
- DECORATE_TREE: Creates 8 ornaments (12px circles) + 3 gifts (30-50px rectangles)
- Ornaments: Randomly placed on tree triangles using xOffset and yOffset
- Gifts: Positioned at tree base (baseY = targetTree.y + targetTree.height) with 40px horizontal spacing
- CREATE_CHRISTMAS_TREE: Uses createClassicTree() with size parameter (small/medium/large)
- APPLY_SANTA_MAGIC: Calls applySantaMagic(shapes, userId) to texture all shapes

Examples should show:
1. Single tree scene (CREATE_CHRISTMAS_TREE + DECORATE_TREE)
2. Forest scene (3 trees at different positions)
3. Complete winter scene (sky, ground, trees, snowflakes, decorations)
4. Santa's workshop scene (building + trees + gifts)
5. Texture application (APPLY_SANTA_MAGIC)
6. Manual ornament addition (5 circles 12-16px)
7. Manual gift arrangement (5 rectangles 40-60px at tree base)
8. Star on top (circle with ⭐ emoji)
9. Multi-step Christmas card scene

Format: Use ═══ dividers for sections, keep it scannable and clear.

Verify:
- JSON output format matches actionExecutor.ts expectations
- All action types have correct parameter names
- Examples show realistic coordinates (canvas is 5000x5000)
- Texture explanation emphasizes shapes are solid colors until SANTA_MAGIC applied
```

**Expected Outcome:** New system prompt in place, focused on Christmas functionality

---

## PROMPT 2: Update Color Name Mapping for Christmas Colors

**Copy this into Cursor:**

```
Update the getColorName() function in src/ai/system.ts to include Christmas-specific colors that users might reference.

Add these to the colorMap:
- '#C41E3A': 'christmas red'
- '#165B33': 'dark green' (already exists, verify)
- '#FFD700': 'gold'
- '#78350f': 'brown'
- '#92400e': 'dark brown'
- '#F8F9FA': 'white' (already exists, verify)
- '#0ea5e9': 'sky blue'

This enables the AI to understand queries like:
- "Delete the dark green shapes" (trees)
- "Move the gold circle" (star)
- "Change the brown rectangle to red" (trunk)

Test cases:
- getColorName('#C41E3A') should return 'christmas red' or 'red'
- getColorName('#FFD700') should return 'gold'
- getColorName('#78350f') should return 'brown'

Keep the existing RGB analysis fallback for colors not in the map.
```

**Expected Outcome:** AI can understand Christmas color references in natural language

---

## PROMPT 3: Add Christmas Context to Dynamic Context

**Copy this into Cursor:**

```
Update createDynamicContext() in src/ai/system.ts to provide better context for Christmas operations.

Add a section after listing shapes that identifies:
1. Trees on canvas (count triangles)
2. Potential decorations (count small circles 10-20px)
3. Potential gifts (count rectangles near tree bases)

Example output:
```
Total shapes: 15

• triangle "shape-abc" at (2500,2200) 400×300 #22c55e (green)
• triangle "shape-def" at (2500,1900) 350×250 #22c55e (green)
... (continue listing)

Christmas elements detected:
- 5 triangles (potential trees)
- 8 small circles (potential ornaments)
- 3 rectangles near tree bases (potential gifts)

Use exact shape IDs above when performing operations.
```

This helps the AI understand scene composition for commands like:
- "Decorate all the trees" → AI knows there are 5 triangles
- "Add more ornaments" → AI sees there are already 8
- "Arrange the gifts" → AI can identify the 3 gift rectangles

Implementation:
1. After listing shapes, count by type and size
2. Identify "small circles" as width/height 10-20px
3. Identify "potential gifts" as rectangles within 100px below triangles
4. Add "Christmas elements detected:" section

Keep the total context output concise (<20 lines for 15 shapes).
```

**Expected Outcome:** AI gets better scene understanding for contextual Christmas commands

---

## PROMPT 4: Optimize User Prompt for Christmas Commands

**Copy this into Cursor:**

```
Update createUserPrompt() in src/ai/system.ts to be even more concise for Christmas-specific commands.

For Christmas commands, send minimal context:
- "create a tree" → Just send canvas center and shape count
- "decorate the tree" → Send only triangle shapes with IDs
- "make it festive" → Just send shape count by type

Optimization logic:
```typescript
function createUserPrompt(userInput: string, canvasState: CanvasState): string {
  const shapeCount = canvasState.shapes?.length || 0;
  
  if (shapeCount === 0) {
    return `CANVAS: empty\nUSER: "${userInput}"\nJSON:`;
  }
  
  // Christmas tree creation - minimal context needed
  if (/create.*tree|make.*tree|add.*tree/i.test(userInput)) {
    return `CANVAS: ${shapeCount} shapes, center available\nUSER: "${userInput}"\nJSON:`;
  }
  
  // Decorate tree - send only triangles
  if (/decorate|ornament|gift/i.test(userInput)) {
    const triangles = canvasState.shapes?.filter(s => s.type === 'triangle') || [];
    if (triangles.length > 0) {
      const treeInfo = triangles.slice(-1).map(t => 
        `"${t.id}":triangle ${t.x},${t.y} ${t.width}×${t.height}`
      ).join('; ');
      return `CANVAS: ${shapeCount} shapes, trees: ${treeInfo}\nUSER: "${userInput}"\nJSON:`;
    }
  }
  
  // Santa magic - just type counts
  if (/festive|christmas|magic|texture/i.test(userInput)) {
    const types = {
      triangles: canvasState.shapes?.filter(s => s.type === 'triangle').length || 0,
      circles: canvasState.shapes?.filter(s => s.type === 'circle').length || 0,
      rectangles: canvasState.shapes?.filter(s => s.type === 'rectangle').length || 0,
    };
    return `CANVAS: ${types.triangles}△ ${types.circles}○ ${types.rectangles}▢\nUSER: "${userInput}"\nJSON:`;
  }
  
  // Continue with existing logic for other commands...
}
```

This reduces token usage by 50-70% for common Christmas commands while maintaining accuracy.

Test:
- "create a Christmas tree" → Should send minimal context
- "decorate the tree" → Should send only triangle IDs
- "make it festive" → Should send shape type counts
- "move the red circle" → Should use existing color-based filtering
```

**Expected Outcome:** Faster AI responses with lower token costs for Christmas commands

---

## PROMPT 5: Add Validation for Christmas Actions

**Copy this into Cursor:**

```
Update validateActions() in src/ai/actionExecutor.ts to add validation for Christmas-specific actions.

Add validation cases:
```typescript
case 'CREATE_CHRISTMAS_TREE':
  // Optional validation
  if (action.size && !['small', 'medium', 'large'].includes(action.size)) {
    errors.push(`Action ${i}: size must be 'small', 'medium', or 'large'`);
  }
  if (action.x !== undefined && (action.x < 0 || action.x > 5000)) {
    errors.push(`Action ${i}: x position out of bounds (0-5000)`);
  }
  if (action.y !== undefined && (action.y < 0 || action.y > 5000)) {
    errors.push(`Action ${i}: y position out of bounds (0-5000)`);
  }
  break;

case 'DECORATE_TREE':
  // Validate tree exists if treeId provided
  if (action.treeId) {
    const treeExists = canvasState.shapes.some(s => s.id === action.treeId);
    if (!treeExists) {
      errors.push(`Action ${i}: treeId "${action.treeId}" not found on canvas`);
    }
  } else {
    // Check if any triangles exist
    const hasTriangles = canvasState.shapes.some(s => s.type === 'triangle');
    if (!hasTriangles) {
      errors.push(`Action ${i}: No trees found on canvas to decorate`);
    }
  }
  break;

case 'APPLY_SANTA_MAGIC':
  // Check if canvas has shapes
  if (canvasState.shapes.length === 0) {
    // Warning, not error - still valid action
    console.warn(`Action ${i}: Canvas is empty, Santa Magic will have no effect`);
  }
  break;
```

Note: validateActions needs access to canvasState, update signature if needed:
```typescript
export async function validateActions(
  actions: CanvasAction[],
  userContext: UserContext,
  canvasState?: CanvasState // Add optional canvas state
): Promise<{ valid: boolean; errors: string[] }> {
```

This provides better error messages before execution, saving API calls and improving UX.
```

**Expected Outcome:** Better validation with helpful error messages for Christmas actions

---

## PROMPT 6: Test Christmas Commands End-to-End

**Copy this into Cursor:**

```
Create a test file src/ai/__tests__/christmasCommands.test.ts to verify the updated system prompt works correctly.

Test cases:

1. **Single Tree Creation**
   Input: "Create a Christmas tree"
   Expected: Actions include CREATE_CHRISTMAS_TREE with reasonable defaults
   Verify: No x/y means it should default to center or find space

2. **Tree with Decorations**
   Input: "Create a tree and decorate it"
   Expected: Two actions - CREATE_CHRISTMAS_TREE, then DECORATE_TREE
   Verify: Actions are in correct order

3. **Forest Scene**
   Input: "Make a forest of 3 trees"
   Expected: 3 CREATE_CHRISTMAS_TREE actions with different x positions
   Verify: Trees are spaced apart (at least 400px between centers)

4. **Texture Application**
   Input: "Make it festive" or "It's Christmas"
   Expected: Single APPLY_SANTA_MAGIC action
   Verify: No other parameters needed

5. **Manual Ornaments**
   Input: "Add 5 ornaments to the tree"
   Expected: 5 CREATE actions with type: 'circle', size 10-18px
   Verify: Positions are near existing triangles

6. **Manual Gifts**
   Input: "Add presents under the tree"
   Expected: 3-5 CREATE actions with type: 'rectangle', size 40-60px
   Verify: Y positions are at/below tree base

7. **Complex Scene**
   Input: "Create a winter wonderland"
   Expected: Multiple actions including trees, snow, decorations
   Verify: Includes background rectangles, trees, snowflakes
   Verify: Ends with APPLY_SANTA_MAGIC or textures applied

8. **Error Handling**
   Input: "Decorate the tree" (when no tree exists)
   Expected: Empty actions array OR error in summary
   Verify: Summary explains no tree found

Mock setup:
```typescript
import { STATIC_SYSTEM_PROMPT, createDynamicContext, createUserPrompt } from '../system';
import { executeAgentActions } from '../actionExecutor';

// Mock OpenAI/AI client
const mockAI = {
  async chat(prompt: string) {
    // Return mock JSON based on prompt analysis
  }
};

describe('Christmas Commands', () => {
  test('creates tree with default parameters', async () => {
    const canvasState = { shapes: [] };
    const userContext = { userId: 'test-user', displayName: 'Test' };
    
    const response = await mockAI.chat(
      STATIC_SYSTEM_PROMPT + '\n' + 
      createDynamicContext(canvasState, userContext) + '\n' +
      createUserPrompt('Create a Christmas tree', canvasState)
    );
    
    expect(response.actions).toHaveLength(1);
    expect(response.actions[0].type).toBe('CREATE_CHRISTMAS_TREE');
  });
  
  // ... more tests
});
```

Run tests and verify all pass before marking this task complete.
```

**Expected Outcome:** Comprehensive test coverage proving Christmas commands work correctly

---

## PROMPT 7: Update AI Development Log Template

**Copy this into Cursor:**

```


## 6. Christmas-Specific AI Insights

### System Prompt Development:
[How AI helped design the Christmas-focused system prompt]

### Texture System:
[AI's role in implementing texture application logic]

### Example Generation:
[How AI helped create realistic Christmas scene examples]

---

**Total Development Time:** ___ hours/days
**AI Time Saved (estimate):** ___ hours
**Overall Assessment:** [1-2 paragraphs reflecting on AI's impact]
```

Save this template so you can fill it out during development and submit with your final project.
```

**Expected Outcome:** Ready-to-use template for documenting AI development process

---

## Verification Checklist

After completing all prompts, verify:

- [ ] System prompt is Christmas-focused with clear examples
- [ ] All Christmas actions (CREATE_CHRISTMAS_TREE, DECORATE_TREE, APPLY_SANTA_MAGIC) are documented
- [ ] Texture mapping explanation is clear and accurate
- [ ] Examples show realistic Christmas scenes (trees, ornaments, gifts)
- [ ] Color name mapping includes Christmas colors
- [ ] Dynamic context provides helpful Christmas scene info
- [ ] User prompt is optimized for token efficiency
- [ ] Validation catches Christmas-specific errors
- [ ] Tests cover all major Christmas commands
- [ ] AI development log template is ready for use

---

## Expected Timeline

- **Prompt 1**: 15-20 minutes (main system prompt replacement)
- **Prompt 2**: 5 minutes (color mapping update)
- **Prompt 3**: 10 minutes (dynamic context enhancement)
- **Prompt 4**: 15 minutes (user prompt optimization)
- **Prompt 5**: 10 minutes (validation update)
- **Prompt 6**: 20-30 minutes (test creation)
- **Prompt 7**: 5 minutes (template creation)

**Total: ~90 minutes of focused Cursor work**

---

## Testing After Implementation

Run these manual tests:

1. Open AI chat, type: "Create a Christmas tree"
   - Should generate 1 action: CREATE_CHRISTMAS_TREE
   
2. Type: "Decorate it"
   - Should generate 1 action: DECORATE_TREE
   
3. Type: "Make it festive"
   - Should generate 1 action: APPLY_SANTA_MAGIC
   
4. Type: "Create a forest of 5 trees"
   - Should generate 5 actions: CREATE_CHRISTMAS_TREE with different positions
   
5. Type: "Create a winter wonderland scene"
   - Should generate 10-20 actions with sky, ground, trees, snow, decorations

If all tests pass, your AI system prompt update is complete! ✅