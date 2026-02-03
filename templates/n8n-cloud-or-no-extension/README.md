# Everyrow HTTP Templates

**For n8n Cloud or any n8n instance without installing custom nodes.**

These templates use standard HTTP Request nodes to call the Everyrow API directly.

## Setup

1. Create a **Header Auth** credential in n8n
2. Import any template
3. Select your credential on each HTTP Request node

## Templates

| File | Description |
|------|-------------|
| `everyrow-rank-http-workflow.json` | Score and rank rows based on criteria |
| `everyrow-dedupe-http-workflow.json` | Remove duplicate rows using AI matching |
| `everyrow-screen-http-workflow.json` | Filter rows that match criteria |
| `everyrow-merge-http-workflow.json` | Join two tables using AI matching |
| `everyrow-agent-map-http-workflow.json` | Run AI research on each row |

## Credential Setup

1. Go to **Credentials** → **Add Credential**
2. Search for **Header Auth**
3. Configure:
   - **Name**: `Everyrow API`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_API_KEY_HERE` (replace with your actual key)
4. Save

After importing a workflow, select this credential on each HTTP Request node.
