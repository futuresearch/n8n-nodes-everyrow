# Everyrow n8n Templates

This folder contains workflow templates for using Everyrow with n8n.

## Choose Your Templates

### 📦 [`self-hosted-with-extension/`](./self-hosted-with-extension/) - Recommended
**Use these if you have the Everyrow extension installed on self-hosted n8n.**

- **Simpler** - Just 3 nodes instead of 9
- **Easier to configure** - Fill in fields in the node UI
- **Better error handling** - Built into the node

### 🌐 [`n8n-cloud-or-no-extension/`](./n8n-cloud-or-no-extension/)
**Use these on n8n Cloud or if you don't want to install custom nodes.**

- **No installation required** - Uses standard HTTP Request nodes
- **Works everywhere** - n8n Cloud, self-hosted, any n8n instance
- **More complex** - Manual polling and result parsing

## Available Operations

Both folders contain templates for:
- **Rank** - Score and sort rows based on criteria
- **Dedupe** - Remove duplicate rows using AI matching
- **Screen** - Filter rows that match criteria
- **Merge** - Join two tables using AI matching
- **Agent Map** - Run AI research on each row

---

## Prerequisites

1. **Everyrow API Key** - Get one at [everyrow.io](https://everyrow.io)

---

## Setup: Node Templates

### Step 1: Install the Extension

See the main [README](../README.md) for installation instructions.

### Step 2: Create Everyrow API Credential

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **Everyrow API**
3. Configure:
   - **API Key**: Your Everyrow API key
   - **API URL**: `https://engine.futuresearch.ai/api/v0`
4. Click **Test credential** to verify
5. Save

### Step 3: Import the Workflow

1. Click **Add workflow** → **Import from file**
2. Select a `*-node-workflow.json` file
3. Click on the Everyrow node and select your credential
4. Run the workflow!

---

## Setup: HTTP Templates

### Step 1: Create HTTP Header Auth Credential

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **Header Auth**
3. Configure:
   - **Name**: `Everyrow API`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_API_KEY_HERE`
4. Save

### Step 2: Import the Workflow

1. Click **Add workflow** → **Import from file**
2. Select a `*-http-workflow.json` file
3. Each HTTP Request node needs your credential selected

---

## Operations Overview

### Rank
Score and sort rows based on criteria.
- Input: List of items
- Output: Items with scores, sorted

### Dedupe
Remove duplicate rows using AI matching.
- Input: List with potential duplicates
- Output: Deduplicated list with metadata

### Screen
Filter rows that match criteria.
- Input: List of items
- Output: Filtered list (only matching items)

### Merge
Join two tables using AI matching.
- Input: Two tables (left and right)
- Output: Merged table with matched data

### Agent Map
Run AI research on each row.
- Input: List of items to research
- Output: Items enriched with research results

---

## Troubleshooting

### "Unauthorized" errors
- Check your API key is correct
- For HTTP templates: Ensure format is `Bearer YOUR_KEY` (with space)

### "Not Found" (404) errors
- Check the API URL is exactly: `https://engine.futuresearch.ai/api/v0`
- No trailing slash!

### Task taking too long
- AI operations can take 30-120 seconds
- Agent Map with high effort can take longer
- Check the Everyrow dashboard for task status

---

## API Reference

Base URL: `https://engine.futuresearch.ai/api/v0`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sessions` | POST | Create a session |
| `/operations/rank` | POST | Submit rank operation |
| `/operations/dedupe` | POST | Submit dedupe operation |
| `/operations/screen` | POST | Submit screen operation |
| `/operations/merge` | POST | Submit merge operation |
| `/operations/agent-map` | POST | Submit agent map operation |
| `/tasks/{id}/status` | GET | Check task status |
| `/tasks/{id}/result` | GET | Get task results |
