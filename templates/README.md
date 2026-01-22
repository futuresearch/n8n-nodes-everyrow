# Everyrow n8n Cloud Templates

These workflow templates work on **n8n Cloud** (and self-hosted n8n) without installing any custom nodes. They use standard HTTP Request nodes to call the Everyrow API.

## Prerequisites

1. **Everyrow API Key** - Get one at [everyrow.io/settings/api-keys](https://everyrow.io/settings/api-keys)

## Setup Instructions

### Step 1: Create HTTP Header Auth Credential

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **Header Auth**
3. Configure:
   - **Name**: `Everyrow API`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_API_KEY_HERE`
4. Save the credential

### Step 2: Import the Workflow

1. In n8n, click **Add workflow** → **Import from file**
2. Select `everyrow-rank-workflow.json`
3. The workflow will be imported

### Step 3: Update API URL

The workflow uses `{{ $credentials.apiUrl }}` but Header Auth doesn't support custom fields. You need to:

1. Open each HTTP Request node
2. Replace `{{ $credentials.apiUrl }}` with `https://engine.futuresearch.ai`

Or use the simplified version below.

---

## Quick Start: Manual Setup

If the JSON import has issues, create the workflow manually:

### Workflow: Rank Companies by AI Relevance

This workflow ranks a list of companies by their relevance to AI infrastructure.

#### Node 1: Manual Trigger
- Type: **Manual Trigger**
- Just click to start

#### Node 2: Sample Data (Code node)
```javascript
// Sample data: Companies to rank by AI relevance
const companies = [
  { name: "OpenAI", description: "AI research company, creators of GPT models and ChatGPT" },
  { name: "Stripe", description: "Payment processing platform for internet businesses" },
  { name: "Anthropic", description: "AI safety company, creators of Claude" },
  { name: "Snowflake", description: "Cloud data warehousing and analytics platform" },
  { name: "Databricks", description: "Unified analytics platform for big data and AI" },
  { name: "Figma", description: "Collaborative design tool for UI/UX" },
  { name: "Scale AI", description: "Data labeling and AI infrastructure company" },
  { name: "Notion", description: "All-in-one workspace for notes and collaboration" }
];

return companies.map(c => ({ json: c }));
```

#### Node 3: Create Session (HTTP Request)
- **Method**: POST
- **URL**: `https://engine.futuresearch.ai/sessions/create`
- **Authentication**: Header Auth (your Everyrow credential)
- **Body (JSON)**:
```json
{
  "name": "n8n-rank-test"
}
```

#### Node 4: Create Input Artifact (HTTP Request)
- **Method**: POST
- **URL**: `https://engine.futuresearch.ai/tasks`
- **Authentication**: Header Auth
- **Body (JSON)** - use expression mode:
```javascript
{
  "session_id": "{{ $('Create Session').item.json.session_id }}",
  "payload": {
    "task_type": "create_group",
    "query": {
      "data_to_create": {{ JSON.stringify($('Sample Data').all().map(i => i.json)) }}
    }
  }
}
```

#### Node 5: Poll Artifact Status (HTTP Request)
- **Method**: GET
- **URL**: `https://engine.futuresearch.ai/tasks/{{ $json.task_id }}/status`
- **Authentication**: Header Auth

#### Node 6: Artifact Ready? (IF node)
- **Condition**: `{{ $json.status }}` equals `COMPLETED`
- **True**: Continue to Submit Rank Task
- **False**: Go to Wait node

#### Node 7: Wait 2s (Wait node)
- **Wait**: 2 seconds
- **Then**: Loop back to Poll Artifact Status

#### Node 8: Submit Rank Task (HTTP Request)
- **Method**: POST
- **URL**: `https://engine.futuresearch.ai/tasks`
- **Authentication**: Header Auth
- **Body (JSON)**:
```javascript
{
  "session_id": "{{ $('Create Session').item.json.session_id }}",
  "payload": {
    "task_type": "deep_rank",
    "query": {
      "task": "Score each company by their relevance to AI infrastructure and foundational AI technology. Companies building core AI models, training infrastructure, or essential AI tooling should score highest.",
      "response_schema": {
        "_model_name": "RankResponse",
        "score": { "type": "float", "optional": false, "description": "Relevance score from 0-100" },
        "reasoning": { "type": "str", "optional": false, "description": "Brief explanation of the score" }
      },
      "field_to_sort_by": "score",
      "ascending_order": false,
      "preview": false
    },
    "input_artifacts": ["{{ $('Poll Artifact Status').item.json.artifact_id }}"],
    "context_artifacts": []
  }
}
```

#### Node 9: Poll Rank Status (HTTP Request)
- **Method**: GET
- **URL**: `https://engine.futuresearch.ai/tasks/{{ $json.task_id }}/status`
- **Authentication**: Header Auth

#### Node 10: Rank Done? (IF node)
- **Condition**: `{{ $json.status }}` equals `COMPLETED`
- **True**: Continue to Fetch Results
- **False**: Go to Wait node

#### Node 11: Wait 5s (Wait node)
- **Wait**: 5 seconds
- **Then**: Loop back to Poll Rank Status

#### Node 12: Fetch Results (HTTP Request)
- **Method**: GET
- **URL**: `https://engine.futuresearch.ai/artifacts?artifact_ids={{ $json.artifact_id }}`
- **Authentication**: Header Auth

#### Node 13: Parse Results (Code node)
```javascript
// Extract the ranked results from the artifact response
const artifacts = $input.first().json;

if (Array.isArray(artifacts) && artifacts[0]?.artifacts) {
  return artifacts[0].artifacts.map(a => ({ json: a.data }));
}

return [{ json: { error: "Unexpected response format", raw: artifacts } }];
```

---

## Expected Output

After running the workflow, you should see results like:

| name | description | score | reasoning |
|------|-------------|-------|-----------|
| OpenAI | AI research company... | 95 | Core AI model developer... |
| Anthropic | AI safety company... | 93 | Foundational AI research... |
| Scale AI | Data labeling... | 85 | Essential AI infrastructure... |
| Databricks | Unified analytics... | 75 | AI/ML platform... |
| ... | ... | ... | ... |

---

## Troubleshooting

### "Unauthorized" errors
- Check your API key is correct
- Ensure the Authorization header format is `Bearer YOUR_KEY` (with space after Bearer)

### Task stuck in PENDING/RUNNING
- The AI operations can take 30-120 seconds depending on complexity
- Increase the wait time in the Wait nodes if needed

### "artifact_id is undefined"
- Make sure the polling loop is working correctly
- Check that the Create Input Artifact step completed successfully

---

## Other Operations

You can modify the workflow to use other Everyrow operations:

### Dedupe
Replace the deep_rank payload with:
```json
{
  "task_type": "dedupe",
  "query": {
    "equivalence_relation": "Two entries are duplicates if they represent the same entity..."
  },
  "input_artifacts": ["<artifact_id>"],
  "processing_mode": "MAP"
}
```

### Screen
```json
{
  "task_type": "deep_screen",
  "query": {
    "task": "Filter to only include companies that...",
    "batch_size": 10,
    "preview": false
  },
  "input_artifacts": ["<artifact_id>"]
}
```

### Merge
```json
{
  "task_type": "deep_merge",
  "query": {
    "task": "Match companies from the left table with...",
    "preview": false
  },
  "input_artifacts": ["<left_artifact_id>"],
  "context_artifacts": ["<right_artifact_id>"]
}
```

### Agent Map
```json
{
  "task_type": "agent",
  "query": {
    "task": "Research each company and find...",
    "effort_level": "low",
    "response_schema": {
      "_model_name": "AgentResponse",
      "answer": { "type": "str", "description": "The research findings" }
    },
    "response_schema_type": "CUSTOM",
    "is_expand": false,
    "include_provenance_and_notes": false
  },
  "input_artifacts": ["<artifact_id>"],
  "context_artifacts": [],
  "join_with_input": true
}
```
