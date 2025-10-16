# CollabCanvas — AI Agent Task Plan (LangChain Version)

> Each task below corresponds to a single Pull Request (PR).  
> Branch naming convention:  
> ```
> feature/ai-agent-[short-description]
> ```  
>  
> Each PR must include a summary, explanation, and local testing steps.  
> Cursor should operate cautiously and produce step-by-step documentation for the user.

---

## Task 1 — Project Setup (`feature/ai-agent-setup`)

### PR Title
**Setup LangChain environment and dependencies**

### Goal
Add the necessary packages, environment variables, and scaffolding so subsequent tasks can implement the LangChain-based AI agent.

### Instructions for Cursor
- The user has **never used LangChain, OpenAI SDK, or Tavily** before.  
- Generate a **step-by-step beginner walkthrough** of what the user must do to prepare their environment.  
- Write these instructions both in the **PR description** and in a new file: `SETUP.md`.

### Scope
- Add dependencies:
  - `langchain`
  - `openai` or `@langchain/openai`
  - `@langchain/core`
  - `@langchain/community`
  - `tavily`


- Create `/src/agent/` directory with placeholder `README.md`.
- Add a project-level `SETUP.md` containing:
1. How to create OpenAI and Tavily API keys.
2. How to copy `.env.example` → `.env` and fill in the keys.
3. How to install dependencies (`npm install` or `pnpm install`).
4. How to run the development server.
5. How to verify environment variables are loaded (`node -e` test).
6. Troubleshooting steps for missing env vars or build issues.

### Deliverables
- Updated `package.json` with new dependencies.
- `.env.example` file.
- `SETUP.md` file.
- `src/agent/.gitkeep` or equivalent.
- PR description containing a **walkthrough for the user** on local setup.

### Cursor Guardrails
- PR must include instructions in plain English suitable for a beginner.  
- No API keys printed in logs or committed.  
- Confirm `.env` handling uses `VITE_` prefix for Vite projects.  
- Mark PR as **Draft** and assign to **@alexismanyrath** for review.

---

## Task 2 — LLM Initialization (`feature/ai-agent-llm-init`)

### PR Title
**Initialize GPT-4o-mini LLM in LangChain**

### Goal
Create a reusable LangChain LLM initialization module and clearly explain the configuration for the user.

### Scope
- Add `src/agent/llm.ts` exporting a function to initialize `ChatOpenAI` with:
- Model: `gpt-4o-mini`
- Temperature: `0.3`
- Streaming enabled
- API key: `import.meta.env.VITE_OPENAI_API_KEY`
- Create a file `src/agent/LLM_README.md` explaining:
- What LangChain is and what `ChatOpenAI` does.
- Why `gpt-4o-mini` is used (speed, reasoning balance).
- What streaming means.
- How to adjust parameters safely.
- Create `scripts/test-llm.js` (or `.ts`) to verify environment readiness:
- Checks for OpenAI key.
- Optionally runs a short test prompt if user agrees.

### Deliverables
- `src/agent/llm.ts`
- `src/agent/LLM_README.md`
- Optional: `scripts/test-llm.js`
- Updated PR description with instructions on how to test locally.

### Cursor Guardrails
- Clearly explain all technical terms in the PR.  
- Include cost and safety note for test calls.  
- Avoid making API calls automatically unless explicitly approved by the user.  

---

## Task 3 — Tooling Layer Definition (`feature/ai-agent-tools`)

### PR Title
**Define Canvas and Tavily Tools**

### Goal
Implement modular, testable tools that LangChain can call during reasoning.

### Scope
- Add:
- `src/agent/tools/canvasTool.ts`
- `src/agent/tools/tavilyTool.ts`
- Define schemas:
- `CanvasAction`, `ToolResponse`, `TavilyResult`
- Implement a dry-run mode (`DRY_RUN=true` in `.env`) that prevents real actions in dev.
- Add tool documentation in `tools/README.md`.
- Create `/src/agent/` directory with placeholder `README.md`.
- Add a project-level `SETUP.md` containing:
1. How to create OpenAI and Tavily API keys.
2. How to copy `.env.example` → `.env` and fill in the keys.
3. How to install dependencies (`npm install` or `pnpm install`).
4. How to run the development server.
5. How to verify environment variables are loaded (`node -e` test).
6. Troubleshooting steps for missing env vars or build issues.

### Deliverables
- Updated `package.json` with new dependencies.
- `.env.example` file.
- `SETUP.md` file.
- `src/agent/.gitkeep` or equivalent.
- PR description containing a **walkthrough for the user** on local setup.

### Cursor Guardrails
- PR must include instructions in plain English suitable for a beginner.  
- No API keys printed in logs or committed.  
- Confirm `.env` handling uses `VITE_` prefix for Vite projects.  
- Mark PR as **Draft** and assign to **@alexismanyrath** for review.

---

## Task 2 — LLM Initialization (`feature/ai-agent-llm-init`)

### PR Title
**Initialize GPT-4o-mini LLM in LangChain**

### Goal
Create a reusable LangChain LLM initialization module and clearly explain the configuration for the user.

### Scope
- Add `src/agent/llm.ts` exporting a function to initialize `ChatOpenAI` with:
- Model: `gpt-4o-mini`
- Temperature: `0.3`
- Streaming enabled
- API key: `import.meta.env.VITE_OPENAI_API_KEY`
- Create a file `src/agent/LLM_README.md` explaining:
- What LangChain is and what `ChatOpenAI` does.
- Why `gpt-4o-mini` is used (speed, reasoning balance).
- What streaming means.
- How to adjust parameters safely.
- Create `scripts/test-llm.js` (or `.ts`) to verify environment readiness:
- Checks for OpenAI key.
- Optionally runs a short test prompt if user agrees.

### Deliverables
- `src/agent/llm.ts`
- `src/agent/LLM_README.md`
- Optional: `scripts/test-llm.js`
- Updated PR description with instructions on how to test locally.

### Cursor Guardrails
- Clearly explain all technical terms in the PR.  
- Include cost and safety note for test calls.  
- Avoid making API calls automatically unless explicitly approved by the user.  

---

## Task 3 — Tooling Layer Definition (`feature/ai-agent-tools`)

### PR Title
**Define Canvas and Tavily Tools**

### Goal
Implement modular, testable tools that LangChain can call during reasoning.

### Scope
- Add:
- `src/agent/tools/canvasTool.ts`
- `src/agent/tools/tavilyTool.ts`
- Define schemas:
- `CanvasAction`, `ToolResponse`, `TavilyResult`
- Implement a dry-run mode (`DRY_RUN=true` in `.env`) that prevents real actions in dev.
- Add tool documentation in `tools/README.md`.

### Testing Requirements
**Cursor must add automated or manual tests:**
1. **Canvas Tool Tests**
 - Valid `CREATE` input → OK response
 - Invalid input → proper error
2. **Tavily Tool Tests**
 - API key present → returns compact search results
 - No API key → returns graceful fallback
3. **Integration Smoke Test**
 - Both tools register successfully with LangChain
4. **Test Docs**
 - Add `tools/TESTING.md` showing how to run these tests manually.

### Acceptance Criteria
- All tool tests pass.
- Tools return structured JSON.
- Code is TypeScript-typed and documented.

---

## Task 4 — Prompt Schema and Review Gate (`feature/ai-agent-prompts`)

### PR Title
**Create AI System Prompts and Context Schema (Review Required)**

### Goal
Design the system prompt and JSON schema, then pause for manual review before merging.

### Scope
- Create `src/agent/prompts/systemPrompt.md` — final system prompt text.
- Create `src/agent/prompts/contextBuilder.ts` — summarizes canvas state.
- Create `src/agent/prompts/promptTemplates.md` — variant prompts and examples.

### Review Gating
This PR **must not merge** until reviewed and approved by **@alexismanyrath**.

Cursor must:
- Include JSON schema in PR description.
- Show 3+ example commands and full expected JSON responses.
- Add a checklist:
- [ ] Coordinates within 0–5000
- [ ] Colors in fixed palette
- [ ] Shapes limited to rectangle/circle
- [ ] Uses defined coordinate convention
- Include a “How to Review” section in the PR.

---

## Task 5 — LangChain Agent Executor (`feature/ai-agent-executor`)

### PR Title
**Implement ReAct Agent Executor with LangChain**

### Goal
Implement the agent reasoning framework and explain **why ReAct** is used.

### Cursor Instructions
Include in PR description:
- **Explain ReAct (Reason + Act)**: how the agent thinks step-by-step and calls tools.
- **Justify usage for CollabCanvas**: multi-step reasoning for complex layout commands.
- **Explain streaming relationship**: how streaming gives real-time reasoning feedback.

### Scope
- Create `src/agent/executor.ts` combining:
- LLM (from Task 2)
- Tools (from Task 3)
- Prompts (from Task 4)
- Implement ReAct loop (reasoning → tool → reasoning → final answer)
- Log intermediate reasoning traces (no secrets)
- Add `executor/README.md` explaining workflow and reasoning trace.

---

## Task 6 — Streaming Execution Layer (`feature/ai-agent-streaming`)

### PR Title
**Add Streaming Output Support for AI Responses**

### Goal
Implement token streaming for the chat UI.

### Cursor Instructions
- Add streaming interface that:
- Emits partial tokens as events.
- Includes event types: `thinking`, `tool_call`, `tool_result`, `final`, `error`.
- Executes actions **only after** final validated JSON is received.
- Add `src/agent/streaming/README.md` explaining the stream lifecycle.
- Provide manual test instructions simulating long responses.

### Guardrails
- Partial tokens = display only.  
- Final JSON = authoritative.  
- PR must clearly describe how the frontend should handle each stream event.

---

## Task 7 — React Integration (`feature/ai-agent-react-integration`)

### PR Title
**Integrate AI Agent Streaming into Chat Panel**

### Goal
Connect the LangChain agent to the React UI.

### Scope
- Update chat panel to:
- Show live streaming tokens.
- Display final actions as structured blocks.
- Provide “Apply” / “Reject” confirmation before executing.
- Allow optional “Auto-apply AI actions” toggle (default OFF).
- Add manual testing instructions for both single-user and multi-user use.

### Acceptance
- Chat streams smoothly.
- Final actions shown clearly.
- User can confirm or reject AI actions.

---

## Task 8 — Action Validation and Safe Execution (`feature/ai-agent-validation`)

### PR Title
**Add JSON Parsing, Validation, and Canvas Execution**

### Goal
Validate AI output before executing actions on the canvas.

### Scope
- Strict JSON schema validation.
- Clamp invalid coordinates to 0–5000.
- Limit colors to palette.
- Add `dry-run` and `preview` mode.
- Document validation logic in `validation/README.md`.

### Testing
- Invalid or extreme input → rejected safely.
- Malformed JSON → fallback error message shown.

---

## Task 9 — Multi-User Synchronization (`feature/ai-agent-multiuser`)

### PR Title
**Verify and Test AI Actions Across Multiple Users**

### Goal
Confirm real-time sync and lock behavior work correctly across users.

### Scope
- Multi-user testing scenarios:
- Simultaneous AI actions.
- Disconnect/reconnect.
- Verify Firestore transactions or locking logic.
- Document tests in `MULTIUSER_TESTING.md`.

---

## Task 10 — Error Handling and Recovery (`feature/ai-agent-resilience`)

### PR Title
**Improve AI Error Handling and Fallback Logic**

### Goal
Ensure the system recovers gracefully from API or reasoning errors.

### Scope
- Add retries/backoff.
- Handle Tavily downtime gracefully.
- Provide user-friendly error messages.
- Add local debug logging (no secrets).

---

## Task 11 — Testing and Validation (`feature/ai-agent-testing`)

### PR Title
**Validate End-to-End AI Command Types and Performance**

### Goal
Comprehensive validation of all major command types and performance metrics.

### Scope
- Test at least 8 command types:
- Create, batch create, move, resize, color change, delete, arrange, login form.
- Measure accuracy and latency.
- Create `TEST_REPORT.md` summarizing results.

---

## Task 12 — Documentation & Demo (`feature/ai-agent-docs-demo`)

### PR Title
**Document AI Agent and Record Demo Video**

### Goal
Complete project documentation and demo deliverables.

### Scope
- Add `ai-development-log.md`
- Update README with LangChain setup & usage.
- Include demo video script (3–5 minutes).
- Optional: record or plan demo walkthrough.

---

## Cursor Guardrails (Applies to All PRs)

- Always open PRs as **Draft** unless explicitly approved for merge.  
- Include in each PR:
- Summary of what changed.
- Why it was done.
- Manual test steps.
- Rollback instructions (`git revert` or branch delete).  
- Do not run paid API calls automatically.  
- Default all integrations to `DRY_RUN` mode.  
- Never expose or log API keys.  
- For prompt-related PRs, **require user review** before merge.  
- Tag all PRs with `ai-agent`.

---

## Example Cursor Command (Task 1)

> Paste the following prompt into Cursor to begin:

