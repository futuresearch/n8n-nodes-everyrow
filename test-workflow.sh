#!/bin/bash
# Test script to debug the Everyrow workflow API calls
# Usage: EVERYROW_API_KEY=your_key ./test-workflow.sh

set -e

API_URL="https://engine.futuresearch.ai"

if [ -z "$EVERYROW_API_KEY" ]; then
    echo "Error: EVERYROW_API_KEY environment variable is required"
    echo "Usage: EVERYROW_API_KEY=your_key ./test-workflow.sh"
    exit 1
fi

AUTH_HEADER="Authorization: Bearer $EVERYROW_API_KEY"

echo "=== Step 1: Create Session ==="
SESSION_RESPONSE=$(curl -s -X POST "$API_URL/sessions/create" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d '{"name": "test-session-'$(date +%s)'"}')

echo "Response: $SESSION_RESPONSE"
SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.session_id')
echo "Session ID: $SESSION_ID"

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
    echo "Error: Failed to create session"
    exit 1
fi

echo ""
echo "=== Step 2: Create Input Artifact ==="
ARTIFACT_PAYLOAD=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "payload": {
    "task_type": "create_group",
    "query": {
      "data_to_create": [
        {"name": "OpenAI", "description": "AI research company"},
        {"name": "Stripe", "description": "Payment processing platform"},
        {"name": "Anthropic", "description": "AI safety company"}
      ]
    }
  }
}
EOF
)

echo "Payload: $ARTIFACT_PAYLOAD"
TASK_RESPONSE=$(curl -s -X POST "$API_URL/tasks" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$ARTIFACT_PAYLOAD")

echo "Response: $TASK_RESPONSE"
TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.task_id')
echo "Task ID: $TASK_ID"

if [ "$TASK_ID" = "null" ] || [ -z "$TASK_ID" ]; then
    echo "Error: Failed to create task"
    exit 1
fi

echo ""
echo "=== Step 3: Poll Task Status ==="
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "Poll attempt $ATTEMPT..."

    STATUS_RESPONSE=$(curl -s -X GET "$API_URL/tasks/$TASK_ID/status" \
        -H "$AUTH_HEADER")

    echo "Status Response: $STATUS_RESPONSE"

    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
    ARTIFACT_ID=$(echo "$STATUS_RESPONSE" | jq -r '.artifact_id')
    ERROR=$(echo "$STATUS_RESPONSE" | jq -r '.error')

    echo "Status: $STATUS, Artifact ID: $ARTIFACT_ID, Error: $ERROR"

    if [ "$STATUS" = "COMPLETED" ]; then
        echo "Task completed!"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "Task failed with error: $ERROR"
        exit 1
    elif [ "$STATUS" = "REVOKED" ]; then
        echo "Task was revoked"
        exit 1
    fi

    echo "Waiting 2 seconds..."
    sleep 2
done

if [ "$STATUS" != "COMPLETED" ]; then
    echo "Error: Task did not complete within $MAX_ATTEMPTS attempts"
    exit 1
fi

echo ""
echo "=== Step 4: Fetch Artifact ==="
ARTIFACTS_RESPONSE=$(curl -s -X GET "$API_URL/artifacts?artifact_ids=$ARTIFACT_ID" \
    -H "$AUTH_HEADER")

echo "Artifacts Response: $ARTIFACTS_RESPONSE"

echo ""
echo "=== Test Complete ==="
echo "Session ID: $SESSION_ID"
echo "Task ID: $TASK_ID"
echo "Artifact ID: $ARTIFACT_ID"
