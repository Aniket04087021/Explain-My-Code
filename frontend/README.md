# ExplainMyCode AI

This repository is a full-stack code analysis product. A user pastes source code into the frontend, and the backend returns a structured analysis that can include:

- Plain-English explanation
- Time and space complexity notes
- Mermaid flowchart output
- Interview questions
- Roast-style review mode
- Step-by-step execution visualization
- Shareable analysis links
- GitHub repository analysis

This README is written for a future agent or contributor who needs to understand what is happening in the project quickly.

## What The Product Does

The app is designed as an "understand my code" workspace.

Core user flow:

1. User signs up or logs in.
2. User opens the dashboard and pastes code into a Monaco editor.
3. User chooses one of the analysis actions:
   - `Explain Code`
   - `Roast My Code`
   - `Run Visualization`
4. The backend returns analysis data or simulated execution steps.
5. If MongoDB is connected, analysis results are stored in history and given a public `shareId`.

The landing page markets the app like a SaaS product, but the implemented behavior is primarily a developer learning and code-understanding tool.

## High-Level Architecture

There are two apps in this repo:

- `frontend/`: React + Vite single-page app
- `backend/`: Express API with MongoDB persistence and Ollama integration

Runtime relationship:

- Frontend sends API requests to `/api`
- Vite proxies `/api` to the backend during local development
- Backend talks to:
  - MongoDB for users and saved analyses
  - Ollama for code analysis text generation
  - GitHub API for repository metadata and file-tree inspection

## Tech Stack

### Frontend

- React 19
- Vite 7
- React Router 7
- Tailwind CSS 4 (via Vite plugin)
- Monaco Editor for code editing
- Axios for API calls
- Mermaid for flowchart rendering
- `html-to-image` for export/share helpers
- `lucide-react` for icons

Key frontend files:

- `src/App.jsx`: router setup and protected routes
- `src/pages/Landing.jsx`: marketing landing page
- `src/pages/Dashboard.jsx`: main analysis workspace
- `src/pages/History.jsx`: saved analysis history
- `src/pages/Share.jsx`: public shared-analysis page
- `src/context/AuthContext.jsx`: auth state in localStorage
- `src/services/api.js`: Axios wrapper and JWT header handling

### Backend

- Node.js
- Express 4
- MongoDB + Mongoose
- JWT authentication
- bcryptjs for password hashing
- express-rate-limit for abuse protection
- Axios for Ollama and GitHub requests
- `acorn` for the JavaScript execution simulator
- `uuid` for share IDs

Key backend files:

- `server.js`: app bootstrap, CORS, JSON parsing, rate limits, Mongo connection
- `controllers/authController.js`: signup/login
- `controllers/analysisController.js`: analyze code, history, share, GitHub analysis
- `controllers/visualizationController.js`: step debugger endpoint
- `services/ollamaService.js`: prompt construction, Ollama call, mock fallback
- `services/executionVisualizerService.js`: routes visualization to JS/Python simulators
- `services/jsExecutionSimulator.js`: sandboxed JavaScript/TypeScript subset interpreter
- `services/pythonExecutionSimulator.js`: sandboxed Python subset interpreter
- `services/githubService.js`: GitHub repo fetch + mock architecture summary

## Implemented Features

### 1. Auth

Users can sign up and log in with email/password.

- JWT is returned by the backend
- Token and user payload are stored in `localStorage`
- Protected frontend routes:
  - `/dashboard`
  - `/history`

### 2. Code Analysis

`POST /api/analyze`

Supported languages:

- `javascript`
- `python`
- `java`
- `cpp`
- `typescript`

Modes:

- `explain`
- `roast`

Expected response shape includes:

- `explanation`
- `timeComplexity`
- `spaceComplexity`
- `steps`
- `flowchart`
- `interviewQuestions`
- `codeQualityScore`
- `executionSteps`
- `shareId`

### 3. Roast Mode

Roast mode uses a different prompt in `backend/services/ollamaService.js`. It is intended to be humorous but still constructive.

### 4. Execution Visualization

`POST /api/visualize-execution`

Supported only for:

- `javascript`
- `typescript`
- `python`

Important behavior:

- This is a simulated debugger, not real program execution.
- It does not use `eval`, `new Function`, or Python subprocesses.
- JavaScript is interpreted through a restricted AST walker.
- Python is interpreted through a limited indentation-based parser/interpreter.

This makes the feature safer for untrusted code, but it also means language coverage is intentionally partial.

### 5. History And Sharing

If MongoDB is available:

- analyses are saved to the `Analysis` collection
- `/api/history` returns the current user's last 50 analyses
- `/api/share/:shareId` returns a public shared analysis

If MongoDB is not available:

- the backend still starts
- analysis still works
- persistence/history/share lookups will be limited or unavailable

### 6. GitHub Repository Analyzer

`POST /api/github-analyze`

Current implementation:

- fetches public repo metadata from GitHub API
- fetches language breakdown
- fetches a truncated file tree
- fetches README raw content when available
- generates a mostly heuristic/mock architecture summary

Important note:

- This feature currently does not send repo contents through Ollama
- the returned architecture analysis is generated from repo metadata and file structure, not full-code deep analysis

## AI Behavior

Primary AI integration lives in `backend/services/ollamaService.js`.

Defaults:

- `OLLAMA_URL=http://localhost:11434`
- `OLLAMA_MODEL=llama3`

The backend asks Ollama to return strict JSON so the UI can render structured tabs. If Ollama is unavailable or returns malformed output, the service falls back to generated mock analysis.

That fallback is important: the app is built to remain demo-friendly even when local AI is offline.

## Data Models

### User

Stored fields:

- `name`
- `email`
- `password` (hashed)
- `createdAt`

### Analysis

Stored fields include:

- `userId`
- `code`
- `language`
- `mode`
- `explanation`
- `timeComplexity`
- `spaceComplexity`
- `steps`
- `flowchart`
- `interviewQuestions`
- `roastFeedback`
- `codeQualityScore`
- `executionSteps`
- `shareId`
- `createdAt`

## API Surface

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`

### Analysis

- `POST /api/analyze`
- `GET /api/history`
- `GET /api/share/:shareId`
- `POST /api/github-analyze`

### Visualization

- `POST /api/visualize-execution`

### Health

- `GET /api/health`

## Environment Variables

### Backend

Expected by the backend:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `OLLAMA_URL`
- `OLLAMA_MODEL`

Notes:

- `PORT` defaults to `5000`
- if the preferred port is busy, the backend tries the next ports
- if MongoDB connection fails, the server still starts in limited mode
- `JWT_SECRET` is required for auth and token verification

### Frontend

Expected by Vite:

- `VITE_API_TARGET`

Default:

- `http://localhost:5000`

This is used by the Vite dev proxy for `/api`.

Production backend example:

- `https://explain-my-code-egl1.onrender.com`

If you deploy the frontend separately, set `VITE_API_TARGET` to your Render backend URL before building the frontend.
For local development against the Render backend, put the same value in `frontend/.env.local` or `frontend/.env` and restart Vite.

Production frontend example:

- `https://explain-my-code-three.vercel.app`

Add that URL to `ALLOWED_ORIGINS` on the backend so browser requests from Vercel are accepted.

## Local Development

### Start The Backend

From `backend/`:

```powershell
npm install
npm run dev
```

### Start The Frontend

From `frontend/`:

```powershell
npm install
npm run dev
```

Frontend dev server:

- usually `http://localhost:5173`

Backend API:

- usually `http://localhost:5000`

## Frontend Structure Notes

The dashboard is the main product surface.

Left side:

- Monaco code editor
- language switching
- explain / roast / visualize actions
- GitHub analyzer widget

Right side:

- `AI Insights` mode for explanation results
- `Step Debugger` mode for execution visualization

Analysis results are shown in tabbed sections:

- Explanation
- Complexity
- Flowchart
- Interview Q
- Simulator

## Current Constraints And Reality Check

These are important for any future agent working on the codebase:

- The frontend marketing copy describes pricing and scale, but billing is not implemented.
- GitHub analysis is currently heuristic/mock, not a full repository AI audit.
- Execution visualization supports only a safe subset of JavaScript/TypeScript/Python.
- Analysis persistence depends on MongoDB being available.
- Core analysis quality depends on Ollama being available and the chosen local model behaving well.
- There is no test suite wired into the main app flow yet.

## Good First Places To Edit

If you need to work on the product:

- update dashboard behavior in `frontend/src/pages/Dashboard.jsx`
- update API wiring in `frontend/src/services/api.js`
- change prompts/fallback behavior in `backend/services/ollamaService.js`
- improve sandbox execution in:
  - `backend/services/jsExecutionSimulator.js`
  - `backend/services/pythonExecutionSimulator.js`
- change persistence model in:
  - `backend/models/Analysis.js`
  - `backend/controllers/analysisController.js`

## Recommended Next Improvements

- Add a root-level README so the repo is understandable before opening `frontend/`
- Add `.env.example` files for frontend and backend
- Add automated tests for auth, analysis routes, and simulators
- Replace mock GitHub analysis with real LLM-assisted architecture summaries
- Clean up text encoding issues showing up in some UI strings
- Add quota/billing logic if the SaaS messaging is meant to be real

## Summary

This project is a full-stack AI-assisted code-understanding tool with:

- React/Vite frontend
- Express/MongoDB backend
- Ollama-powered code analysis
- sandboxed execution visualization
- JWT auth
- analysis history and sharing
- GitHub repo inspection

If you are an agent entering this repo cold, start with the dashboard, the analysis controller, and the Ollama service. That combination explains most of the real product behavior.
