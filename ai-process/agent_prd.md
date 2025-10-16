# CollabCanvas AI Canvas Agent (LangChain Integration)

## Project Overview

**Goal:**  
Build an AI agent for CollabCanvas that interprets natural language commands and manipulates the collaborative canvas accordingly.  
The agent will use **LangChain**, **OpenAI GPT-4o-mini**, and **Tavily Search** for reasoning and environmental context.

---

## 1. Objectives

1. Initialize a LangChain agent using **GPT-4o-mini** with streaming responses.
2. Define a **tooling layer** that exposes canvas actions (create, move, resize, delete, arrange) to the LLM.
3. Add **Tavily Search** as an auxiliary reasoning tool for design or contextual lookups.
4. Design **system prompts** and context templates that enforce structured JSON outputs.
5. Build a **LangChain ReAct-style agent executor** that can reason and act using defined tools.
6. Integrate agent output streaming into the existing React chat interface.
7. Ensure the AI’s actions execute in real time and sync through Firebase.
8. Implement validation, error handling, and safe guards (canvas bounds, color limits).
9. Test with multiple users for concurrency and reliability.

---

## 2. Key Features

| Category | Description |
|-----------|-------------|
| **Natural Language Understanding** | Users issue free-form commands such as “create a red circle at 200, 300” |
| **Action Generation** | Agent outputs structured JSON actions (CREATE, MOVE, DELETE, ARRANGE) |
| **Canvas Tool Integration** | Direct interaction with existing Firebase + Zustand canvas logic |
| **Streaming Responses** | Tokens streamed to React UI for real-time conversational feedback |
| **Reasoning Enhancement** | Optional Tavily search for contextual knowledge (design references, layout norms) |
| **Collaboration** | All AI actions propagate to other connected users via Firebase sync |
| **Extensibility** | Easily add new tools or models without breaking architecture |

---

## 3. Technical Overview

### Architecture Components

1. **LangChain Agent Initialization**
   - Uses `ChatOpenAI` (GPT-4o-mini)
   - Temperature: 0.3 for deterministic responses
   - Supports streaming mode for real-time updates

2. **Tooling Layer**
   - Canvas actions: create, update, delete, arrange
   - Tavily search: contextual reasoning
   - Tools follow LangChain’s `Tool` interface

3. **Prompt Schema**
   - System message defines role and constraints
   - Enforces structured JSON:
     ```json
     {
       "actions": [...],
       "summary": "string"
     }
     ```
   - Includes current canvas state and user context

4. **ReAct Agent Loop**
   - Agent reasons step-by-step
   - Chooses and executes tools as needed
   - Returns final response for UI display

5. **Streaming Integration**
   - Tokens streamed from model to frontend
   - Chat panel updates progressively
   - Display “Thinking…” or similar during reasoning

6. **Canvas Execution**
   - Parsed JSON actions trigger Firebase mutations
   - Updates propagate via Zustand and Firestore
   - Multi-user sync confirmed via presence layer

---

## 4. Functional Requirements

| Area | Requirement |
|------|--------------|
| **LLM** | Use OpenAI GPT-4o-mini via LangChain `ChatOpenAI` |
| **Prompting** | Enforce deterministic, JSON-formatted outputs |
| **Tooling** | Register both Canvas Toolkit and Tavily Search |
| **Reasoning Framework** | Use LangChain’s ReAct loop |
| **Streaming** | Real-time token streaming into chat UI |
| **Error Handling** | Validate and sanitize all AI outputs before execution |
| **Multi-User Support** | Firebase sync for all AI actions |
| **Security** | API keys loaded from `.env`, never exposed client-side |
| **Extensibility** | Modular tool layer for future feature additions |

---

## 5. Non-Functional Requirements

- **Performance:** Response time under 3 seconds typical  
- **Accuracy:** 80%+ correctness across commands  
- **Reliability:** Handles malformed input gracefully  
- **Compatibility:** Works with React + Vite + TypeScript + Firebase + Konva + Zustand  
- **Maintainability:** All logic modular and testable  

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| Command coverage | ≥ 8 distinct types |
| Accuracy | ≥ 80% |
| Streaming latency | < 500ms visible delay |
| Collaboration | Full multi-user sync of AI actions |
| Stability | No uncaught exceptions or render freezes |

---

## 7. Deliverables

1. LangChain agent module (LLM + tools + prompt)
2. Tooling layer with Canvas and Tavily integrations
3. Streaming executor with React integration
4. Updated chat interface with AI streaming
5. Validation layer for safe action parsing
6. Multi-user tested agent behavior
7. Documentation + AI development log
8. Demo video showing reasoning and canvas manipulation

---

## 8. Risks & Mitigation

| Risk | Mitigation |
|------|-------------|
| API rate limits | Debounce and cache calls |
| Invalid JSON responses | Schema validation and fallback prompts |
| Network latency | Use streaming for perceived speed |
| Tavily downtime | Fallback to LLM-only reasoning |
| Overlapping edits | Use existing Firebase lock system |

---

## 9. Dependencies

- `langchain`
- `@langchain/openai`
- `@langchain/community`
- `@langchain/core`
- `tavily`
- Firebase SDK
- Zustand
- Konva.js
- React + Vite + TypeScript

---

## 10. Acceptance Criteria

- [ ] LLM initialized with GPT-4o-mini via LangChain  
- [ ] Canvas and Tavily tools functional  
- [ ] Agent can reason and act using tools  
- [ ] Chat UI streams model responses  
- [ ] Actions reflect correctly on shared canvas  
- [ ] System handles malformed or incomplete outputs  
- [ ] Multi-user sync confirmed  
- [ ] Demo video produced and documented  

