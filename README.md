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

Once this node is verified, it will be available directly in n8n Cloud. Until then, you can use our **HTTP Request workflow templates** - see [`templates/n8n-cloud-or-no-extension/`](templates/n8n-cloud-or-no-extension/) for ready-to-import workflows that work on any n8n instance without installing custom nodes.

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

Import a template from [`templates/self-hosted-with-extension/`](templates/self-hosted-with-extension/) or build manually:

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
   - Field Name: `score`
5. Add a **Wait** node (5 seconds)
6. Add another **Everyrow** node:
   - Select **Task** → **Get Status**
   - Task ID: `{{ $('Everyrow').item.json.task_id }}`
7. Add an **If** node to check `{{ $json.status }} equals "completed"`
8. On true branch, add **Everyrow** → **Task** → **Get Result**
9. On false branch, loop back to the Wait node
10. Connect the nodes and click **Test Workflow**

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

### Task Operations

| Operation | Description |
|-----------|-------------|
| **Get Status** | Check the status of a submitted task (pending, running, completed, failed). |
| **Get Result** | Retrieve the results of a completed task. |

> **Note:** All operations return a `task_id` immediately. Use the Task operations with a polling loop to wait for completion and retrieve results. See the [workflow templates](templates/) for examples.

## Credentials

To use this node, you need an Everyrow API key:

1. Sign up at [everyrow.io](https://everyrow.io)
2. Go to Settings > API Keys
3. Create a new API key
4. Add the credentials in n8n

## Example Workflows

Ready-to-import workflow templates are available in the [`templates/`](templates/) directory.

### Rank Companies by AI Relevance

```
[Data Source] → [Everyrow: Rank] → [Wait 5s] → [Everyrow: Get Status] → [If Completed?]
                                                                              ↓ Yes
                                                                    [Everyrow: Get Result]
                                                                              ↓ No
                                                                    [Loop back to Wait]
```

1. Add a data source node (Google Sheets, Airtable, etc.)
2. Add the Everyrow node with **Data Operations → Rank**
3. Set the task: "Score each company by their relevance to enterprise AI infrastructure"
4. Add a Wait node, then poll with **Task → Get Status**
5. Use an If node to check if `status == "completed"`
6. Get results with **Task → Get Result**

### Deduplicate a Contact List

1. Import your contact list
2. Add the Everyrow node with **Data Operations → Dedupe**
3. Set the equivalence relation: "Two contacts are duplicates if they represent the same person, even if names are spelled differently or companies have changed"
4. Add the polling loop (Wait → Get Status → If → Get Result)
5. Output the deduplicated list

### Research and Enrich Data

1. Add your data source
2. Add the Everyrow node with **Agent Operations → Agent Map**
3. Set the task: "Research each company and find their latest funding round, founding year, and key products"
4. Define the response schema with the fields you want
5. Add the polling loop to wait for completion
6. Get enriched data with AI-researched information

## Workflow Pattern

Everyrow operations are asynchronous. The recommended workflow pattern is:

1. **Submit Operation** - Returns a `task_id` immediately
2. **Wait** - Use n8n's Wait node (e.g., 5-10 seconds)
3. **Check Status** - Use Task → Get Status to poll
4. **Loop or Continue** - If not completed, loop back to Wait; if completed, continue
5. **Get Results** - Use Task → Get Result to retrieve data

See [`templates/self-hosted-with-extension/`](templates/self-hosted-with-extension/) for complete workflow examples.

### Configuration Options

- **Session Name**: Name for the Everyrow session (visible in dashboard)
- **Task ID**: Reference to a previously submitted task (for Get Status / Get Result)

Each operation has specific configuration options - see the node UI for details.

## Resources

- [Everyrow Documentation](https://docs.everyrow.io)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Report Issues](https://github.com/futuresearch/n8n-nodes-everyrow/issues)

## License

[MIT](LICENSE)
