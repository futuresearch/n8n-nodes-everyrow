# n8n-nodes-everyrow

This is an n8n community node for [Everyrow](https://everyrow.io) - AI-powered data operations for your workflows.

Everyrow enables you to perform intelligent data operations using AI, including ranking, deduplication, merging, screening, and research tasks.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

### For n8n Users (Community Node)

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

```bash
npm install n8n-nodes-everyrow
```

### For n8n Cloud Users

n8n Cloud doesn't support custom community nodes. Use our **HTTP Request workflow templates** instead - see [`templates/n8n-cloud-or-no-extension/`](templates/n8n-cloud-or-no-extension/) for ready-to-import workflows that work on any n8n instance without installing custom nodes.

## Local Development Setup

To test this node locally during development:

### Prerequisites

1. **Node.js 18+** - Install via [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org)
2. **pnpm** - Install with `npm install -g pnpm`
3. **n8n** - Install globally with `npm install -g n8n`
4. **Everyrow API Key** - Get one at [everyrow.io/settings/api-keys](https://everyrow.io/settings/api-keys)

### Step 1: Clone and Build

```bash
git clone https://github.com/futuresearch/n8n-nodes-everyrow.git
cd n8n-nodes-everyrow

# Install dependencies
pnpm install

# Build the node
pnpm build
```

### Step 2: Install in n8n

```bash
# Create n8n custom nodes directory
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes

# Install the local package
npm init -y
npm install /path/to/n8n-nodes-everyrow
```

### Step 3: Start n8n

```bash
n8n start
```

Open http://localhost:5678 in your browser.

### Step 4: First-Time n8n Setup

1. **Create an account** - n8n will prompt you to create a local account (email + password)
2. **Skip or complete onboarding** - You can skip the onboarding wizard

### Step 5: Configure Everyrow Credentials

1. Go to **Credentials** (left sidebar) → **Add Credential**
2. Search for **"Everyrow"**
3. Enter your API key from [everyrow.io/settings/api-keys](https://everyrow.io/settings/api-keys)
4. Click **Save**

### Step 6: Create a Test Workflow

1. Click **Add Workflow**
2. Add a **Manual Trigger** node
3. Add a **Code** node with sample data:
   ```javascript
   const companies = [
     { name: "OpenAI", description: "AI research company" },
     { name: "Stripe", description: "Payment processing" },
     { name: "Anthropic", description: "AI safety company" }
   ];
   return companies.map(c => ({ json: c }));
   ```
4. Add the **Everyrow** node:
   - Select **Data Operations** → **Rank**
   - Task: "Score by AI relevance, 0-100"
   - Response Schema: `{"score": {"type": "float"}, "reason": {"type": "str"}}`
   - Sort Field: `score`
5. Connect the nodes and click **Test Workflow**

### Running Tests

Tests require a valid API key. Create a `.env` file (gitignored):

```bash
cp .env.example .env
# Edit .env and add your API key
```

Then run:

```bash
pnpm test         # Run tests once
pnpm test:watch   # Run tests in watch mode
```

### Development Commands

```bash
pnpm build        # Build the node
pnpm dev          # Watch mode for development
pnpm lint         # Run linter
pnpm test         # Run tests (requires .env with API key)
```

### Troubleshooting

**Node not appearing in n8n?**
- Ensure the package is built (`pnpm build`)
- Check n8n logs for loading errors: `N8N_LOG_LEVEL=debug n8n start`
- Verify the symlink exists: `ls -la ~/.n8n/nodes/node_modules/`

**"Everyrow" credential type not found?**
- Restart n8n after installing the package
- Check that `dist/credentials/EveryrowApi.credentials.js` exists

**API errors?**
- Verify your API key is correct
- Check the API URL (should be: `https://engine.futuresearch.ai/api/v0`)

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
