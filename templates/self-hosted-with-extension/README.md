# Everyrow Node Templates

**For self-hosted n8n with the Everyrow extension installed.**

These templates use the custom Everyrow node, which handles all the API complexity for you.

## Setup

1. Install the `n8n-nodes-everyrow` extension (see main README)
2. Create an **Everyrow API** credential in n8n
3. Import any template and select your credential

## Templates

| File | Description |
|------|-------------|
| `everyrow-rank-node-workflow.json` | Score and rank rows based on criteria |
| `everyrow-dedupe-node-workflow.json` | Remove duplicate rows using AI matching |
| `everyrow-screen-node-workflow.json` | Filter rows that match criteria |
| `everyrow-merge-node-workflow.json` | Join two tables using AI matching |
| `everyrow-agent-map-node-workflow.json` | Run AI research on each row |

## Credential Setup

1. Go to **Credentials** → **Add Credential**
2. Search for **Everyrow API**
3. Enter:
   - **API Key**: Your Everyrow API key
   - **API URL**: `https://engine.futuresearch.ai/api/v0`
4. Click **Test credential** and **Save**
