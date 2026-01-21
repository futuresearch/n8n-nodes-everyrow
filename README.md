# n8n-nodes-everyrow

This is an n8n community node for [Everyrow](https://everyrow.io) - AI-powered data operations for your workflows.

Everyrow enables you to perform intelligent data operations using AI, including ranking, deduplication, merging, screening, and research tasks.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

```bash
npm install n8n-nodes-everyrow
```

## Operations

### Data Operations

| Operation | Description |
|-----------|-------------|
| **Rank** | Score and rank rows based on AI-evaluated criteria. Useful for prioritizing leads, scoring content relevance, or ranking search results. |
| **Dedupe** | Remove duplicate rows using AI matching. Handles fuzzy matching, name variations, and semantic similarity. |
| **Screen** | Filter rows based on complex criteria that require AI understanding. Filter companies by funding stage, filter products by features, etc. |
| **Merge** | Join two tables using AI-powered matching. Merge customer lists, match products across databases, etc. |

### Agent Operations

| Operation | Description |
|-----------|-------------|
| **Agent Map** | Run an AI research agent on each row to enrich data with web research, analysis, or complex reasoning. |

## Credentials

To use this node, you need an Everyrow API key:

1. Sign up at [everyrow.io](https://everyrow.io)
2. Go to Settings > API Keys
3. Create a new API key
4. Add the credentials in n8n

## Example Workflows

### Rank Companies by AI Relevance

1. Add a data source node (Google Sheets, Airtable, etc.)
2. Add the Everyrow node with "Rank" operation
3. Set the task: "Score each company by their relevance to enterprise AI infrastructure"
4. Configure the field name and type for the score
5. Connect to your destination

### Deduplicate a Contact List

1. Import your contact list
2. Add the Everyrow node with "Dedupe" operation
3. Set the equivalence relation: "Two contacts are duplicates if they represent the same person, even if names are spelled differently or companies have changed"
4. Output the deduplicated list

### Research and Enrich Data

1. Add your data source
2. Add the Everyrow node with "Agent Map" operation
3. Set the task: "Research each company and find their latest funding round, founding year, and key products"
4. Define the response schema with the fields you want
5. Get enriched data with AI-researched information

## Configuration Options

### Common Options

- **Session Name**: Name for the Everyrow session (visible in dashboard)
- **Poll Interval**: How often to check task status (default: 2000ms)
- **Max Wait Time**: Maximum time to wait for completion (default: 600000ms / 10 min)

### Operation-Specific Options

Each operation has specific configuration options. See the node UI for details.

## Resources

- [Everyrow Documentation](https://docs.everyrow.io)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Report Issues](https://github.com/futuresearch/n8n-nodes-everyrow/issues)

## License

[MIT](LICENSE)
