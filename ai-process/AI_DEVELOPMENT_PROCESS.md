# AI Development Process: CollabCanvas

**Project**: CollabCanvas - Real-Time Collaborative Design Tool  
**AI Tools**: Claude (Anthropic), ChatGPT, Cursor  
**Timeline**: October 2025  
**Code**: ~95% AI-Generated, ~5% Human-Written  

---

## Technical Stack

**Frontend**: React 18, TypeScript, Vite, Konva.js, Zustand, TailwindCSS  
**Backend**: Firebase Auth, Firestore, Realtime Database  
**Deployment**: Vercel (production), Firebase Emulator Suite (local)  
**Development**: Cursor IDE, Claude, ChatGPT, Git/GitHub

---

## Tools & Workflow

**Claude**: Strategic planning, architecture, complex problem solving (browser-based)  
**ChatGPT**: Prompt refinement and pre-processing before Cursor  
**Cursor**: Day-to-day coding, implementation, debugging (IDE-integrated)

**Integration Flow**: Claude (planning) → ChatGPT (prompt refinement) → Cursor (implementation) → Claude (validation)

**Typical Task**: Read task → Ask Cursor "start on task [X]" → Test → Debug if needed → Push → Deploy → Next task

I used Ash's prompts to generate PRD, Task list, and Arch diagram. Then Asked claude to critique, find limitations, and focus on core features. Finally, I went to Cursor, had it review the context, and then went task by task. I would debug each task, testing in dev, until it was ready to build and push to prod. I would test there, and repeat if needed before continuing.

---

## Top 5 Effective Prompts

### 1. Task-Based Sequential
> "Walk through the documentation here. Ask any questions you have that need clarifying."
> 
> "start at the first task - verify my deployment is setup"

**Why**: Gave AI full context, clear starting point, enabled systematic development

---

### 2. Specific Problem with Scale
> "what optimizations need to happen to work well with 500 shapes. Select all with 500 shapes is not working"

**Result**: 8-12x performance improvement  
**Why**: Specific, measurable problem statement triggered focused analysis

---

### 3. Pre-Processed via ChatGPT
**To ChatGPT:**
> "handle drag release in konva. how to make sure it's working how it works in figma. super smooth. what should i ask cursor to do to do this for me"

**ChatGPT's Output for Cursor:**
> "Refactor my Konva drag interaction to feel like Figma. 
> - Use caching during drag for performance
> - Animate snapping on release
> - Keep 60fps smoothness
> - Add cursor feedback ('grab', 'grabbing')
> - Move shape to top when dragging"

**Why**: Transformed vague idea into specific, actionable requirements

---

### 4. Safety Validation
> "make sure none of these updates are breaking anything"

**Why**: Simple directive triggered comprehensive linter/type/logic checks

---

### 5. Constraint-Based Refinement
> "Make the updates based on your recommendations in the PRD and Task list. Simplify the documents to what is necessary. Also consider that I'm on Firebase free tier and need to limit hits. Remove code examples from the PRD document and checklist so that I can use the base document as context for Cursor. Remove time estimates. Simplify the architecture, optimize for speed. Consolidate cursor + presence. Revise lock strategy. Update layer strategy to work for 500 objects. Skip the visual feedback for boundaries for now. Update the timeline. Skip the implementation Details, performance monitoring, automated acceptance test CODE, but include them in the PRD as requirements and add them to the task list to build. Update to use Firebase Emulator Suite for development. Add Risk: Vercel Cold Starts Affecting Demo
> * Mitigation: Keep app "warm" before submission
> * Setup: Add a simple uptime monitor (UptimeRobot free tier)
> * Benefit: Instant demo load for reviewers 
> 
> as a last step in the task list."

**Why**: Multiple specific constraints let AI balance trade-offs effectively

---

## Additional Key Prompts Used

### Environment Debugging
> "https://github.com/amanyrath/collab-canvas/commit/5f4579fee300f38c65acde2770fa3bab6a866d5d this is my last working git commit. It works online in Vercel but on my local machine, the behavior I'm seeing is that we can run npm run dev and it builds, but the page doesn't load. npm run build hangs. I'm thinking it might be an issue with firebase. How can I get cursor to troubleshoot the root cause?"

**Outcome**: Didn't solve issue (port conflicts). Solved by turning system off/on.

---

## Prompting Principles

1. **Be Specific**: "500 shapes" > "lots of shapes"
2. **State Problem, Not Solution**: Let AI suggest approaches
3. **Add Measurable Criteria**: "60fps", "sub-100ms"
4. **Use Industry References**: "like Figma"
5. **Pre-process Complex Ideas**: One AI refines prompts for another
6. **Request Standards**: "industry standard" prevents over-engineering
7. **Validate Often**: "make sure..." catches issues early

---



**Human Role**: Product vision, UX decisions, testing, prompt engineering, deployment config

---

## AI Strengths ✅

- **Rapid Prototyping**: MVP in days vs weeks
- **Best Practices**: React patterns, TypeScript, error handling
- **Documentation**: Comprehensive, automatic
- **Problem Solving**: Bottleneck identification, optimization strategies
- **Context Management**: Understood 1000+ line files quickly

---

## AI Limitations ⚠️

- **Environment Issues**: Port conflicts, local debugging required manual work
- **UX Validation**: Couldn't test "feel" of interactions
- **Ambiguous Requirements**: Vague prompts → over-engineering
- **Cross-Tool Context**: Manual transfer between Claude/ChatGPT/Cursor
- **Testing**: Generated test structures but not meaningful scenarios
- **Design Decisions**: Needed human judgment on trade-offs

---

## Key Learnings

1. **AI as Code Director**: Human defines "what", AI implements "how"
2. **Pre-Processing Multiplies Results**: 5 min refinement saves hours of rework
3. **Specific Constraints > General Goals**: "500 shapes" > "make it faster"
4. **Validate Early**: Catch issues before they compound
5. **Request Industry Standards**: AI naturally over-engineers; ask for standard solutions
6. **Context Switching Cost**: Worth it for specialized capabilities
7. **Human Testing Essential**: AI can't validate UX or catch subtle bugs
8. **Documentation Quality = Code Quality**: Better specs → better AI code

---

## Performance Optimization Example

**Problem**: Select all with 500 shapes froze UI for 5-10 seconds

**Prompts Used**:
- "what optimizations need to happen to work well with 500 shapes. Select all with 500 shapes is not working"
- "make sure none of these updates are breaking anything"
- "what are some potential pitfalls with these updates"

**Solutions Implemented**:
1. Batch lock operations (500 transactions → 1 batch write)
2. Batch store updates (500 re-renders → 1 re-render)
3. Enhanced React.memo (custom comparison)
4. Optimized transformer (only updates on selection changes)

**Results**:
- Select All: 25s → 2-3s (8-12x faster)
- UI Freeze: 5-10s → 50ms (100-200x improvement)
- React Re-renders: 500 → 1 (500x reduction)

**Rubric Impact**: "Satisfactory" (6-8 pts) → "Excellent" (11-12 pts) in Performance & Scalability

---

## Final Metrics

- **Lines of Code**: ~9,900 (after optimization)
- **Components**: 25+ reusable
- **Performance**: <300ms load, 60fps interactions, <3s select all (500 shapes)
- **Scalability**: 500+ shapes, 5+ concurrent users
- **Documentation**: 10 comprehensive docs

---

## Workflow Pattern Discovery

**Key Insight**: Cursor naturally built custom solutions. Asking for "industry standard, simple, built-in, easily maintainable functionality" significantly improved code quality and maintainability.

---

## Conclusion

I learned a lot from this project. Actually very much shifted my way of thinking. Beginning with the planning steps inspired by Ash, I was thinking about the big picture before just diving in. I'm usually a hands-dirty type person, and I felt like this birds eye view stuff is usually too boring to do. But actually, it made a huge difference in work I had to do later. Lesson learned, preparation >>>>>> just starting.

Another pattern-shift I had was understanding my role as a dev. I was watching Cursor write, making decisions as we went along. It was somewhat like pair-programming, except I was the one watching the whole time. With my job only to understand and find issues, I... understood and found issues.

I also found this pattern to be a new way of learning. I've always been a 'learn by doing' but in this way, I was 'learning by understanding'. The complexity and speed were super engaging, and I felt the desire to help 'enable' Cursor to do its work. Setting up environments, learning about potential tools, adding the docs for Konva in, those were all ways I could help give Cursor the tools it needed to succeed. I've always seen that as my role personally, but now that's my role as an AI Orchestrator.

Overall I actually had so much fun doing this!!! I actually kinda hate coding and I love telling ppl what to do so 10/10 thank you.
