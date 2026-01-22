import { describe, it, expect, beforeAll } from 'vitest';
import 'dotenv/config';

const API_URL = process.env.EVERYROW_API_URL || 'https://engine.futuresearch.ai';
const API_KEY = process.env.EVERYROW_API_KEY;

async function apiRequest(
	method: string,
	endpoint: string,
	body?: unknown
): Promise<{ status: number; data: unknown }> {
	const response = await fetch(`${API_URL}${endpoint}`, {
		method,
		headers: {
			'Authorization': `Bearer ${API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	const data = await response.json();
	return { status: response.status, data };
}

async function pollTaskStatus(
	taskId: string,
	maxAttempts = 30,
	intervalMs = 2000
): Promise<{ status: string; artifact_id?: string; error?: string }> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const { data } = await apiRequest('GET', `/tasks/${taskId}/status`);
		const result = data as { status: string; artifact_id?: string; error?: string };

		console.log(`Poll attempt ${attempt + 1}: status=${result.status}, artifact_id=${result.artifact_id}, error=${result.error}`);

		// API returns lowercase status values
		const status = result.status.toLowerCase();
		if (status === 'completed' || status === 'failed' || status === 'revoked') {
			return result;
		}

		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error(`Task ${taskId} did not complete within ${maxAttempts} attempts`);
}

describe('Everyrow Workflow API', () => {
	beforeAll(() => {
		if (!API_KEY) {
			throw new Error('EVERYROW_API_KEY environment variable is required');
		}
		console.log(`Using API URL: ${API_URL}`);
	});

	it('should create a session', async () => {
		const { status, data } = await apiRequest('POST', '/sessions/create', {
			name: `test-session-${Date.now()}`,
		});

		console.log('Create Session Response:', JSON.stringify(data, null, 2));

		expect(status).toBe(200);
		expect(data).toHaveProperty('session_id');
	});

	it('should complete full workflow: create artifact -> poll -> rank -> poll -> fetch', async () => {
		// Step 1: Create Session
		console.log('\n=== Step 1: Create Session ===');
		const sessionResponse = await apiRequest('POST', '/sessions/create', {
			name: `test-workflow-${Date.now()}`,
		});
		console.log('Session Response:', JSON.stringify(sessionResponse.data, null, 2));
		expect(sessionResponse.status).toBe(200);

		const sessionId = (sessionResponse.data as { session_id: string }).session_id;
		expect(sessionId).toBeTruthy();
		console.log(`Session ID: ${sessionId}`);

		// Step 2: Create Input Artifact
		console.log('\n=== Step 2: Create Input Artifact ===');
		const createArtifactPayload = {
			session_id: sessionId,
			payload: {
				task_type: 'create_group',
				query: {
					data_to_create: [
						{ name: 'OpenAI', description: 'AI research company, creators of GPT models' },
						{ name: 'Stripe', description: 'Payment processing platform' },
						{ name: 'Anthropic', description: 'AI safety company, creators of Claude' },
					],
				},
			},
		};
		console.log('Create Artifact Payload:', JSON.stringify(createArtifactPayload, null, 2));

		const createTaskResponse = await apiRequest('POST', '/tasks', createArtifactPayload);
		console.log('Create Task Response:', JSON.stringify(createTaskResponse.data, null, 2));
		expect(createTaskResponse.status).toBe(200);

		const createTaskId = (createTaskResponse.data as { task_id: string }).task_id;
		expect(createTaskId).toBeTruthy();
		console.log(`Create Task ID: ${createTaskId}`);

		// Step 3: Poll for artifact creation
		console.log('\n=== Step 3: Poll Artifact Creation ===');
		const artifactStatus = await pollTaskStatus(createTaskId);
		console.log('Final Artifact Status:', JSON.stringify(artifactStatus, null, 2));

		expect(artifactStatus.status.toLowerCase()).toBe('completed');
		expect(artifactStatus.artifact_id).toBeTruthy();
		const inputArtifactId = artifactStatus.artifact_id!;
		console.log(`Input Artifact ID: ${inputArtifactId}`);

		// Step 4: Submit Rank Task
		console.log('\n=== Step 4: Submit Rank Task ===');
		const rankPayload = {
			session_id: sessionId,
			payload: {
				task_type: 'deep_rank',
				query: {
					task: 'Score each company by their relevance to AI infrastructure. Companies building core AI models should score highest.',
					response_schema: {
						_model_name: 'RankResponse',
						score: { type: 'float', optional: false, description: 'Relevance score from 0-100' },
						reasoning: { type: 'str', optional: false, description: 'Brief explanation' },
					},
					field_to_sort_by: 'score',
					ascending_order: false,
					preview: false,
				},
				input_artifacts: [inputArtifactId],
				context_artifacts: [],
			},
		};
		console.log('Rank Payload:', JSON.stringify(rankPayload, null, 2));

		const rankTaskResponse = await apiRequest('POST', '/tasks', rankPayload);
		console.log('Rank Task Response:', JSON.stringify(rankTaskResponse.data, null, 2));
		expect(rankTaskResponse.status).toBe(200);

		const rankTaskId = (rankTaskResponse.data as { task_id: string }).task_id;
		expect(rankTaskId).toBeTruthy();
		console.log(`Rank Task ID: ${rankTaskId}`);

		// Step 5: Poll for rank completion
		console.log('\n=== Step 5: Poll Rank Completion ===');
		const rankStatus = await pollTaskStatus(rankTaskId, 60, 5000); // longer timeout for rank
		console.log('Final Rank Status:', JSON.stringify(rankStatus, null, 2));

		expect(rankStatus.status.toLowerCase()).toBe('completed');
		expect(rankStatus.artifact_id).toBeTruthy();
		const outputArtifactId = rankStatus.artifact_id!;
		console.log(`Output Artifact ID: ${outputArtifactId}`);

		// Step 6: Fetch Results
		console.log('\n=== Step 6: Fetch Results ===');
		const artifactsResponse = await apiRequest('GET', `/artifacts?artifact_ids=${outputArtifactId}`);
		console.log('Artifacts Response:', JSON.stringify(artifactsResponse.data, null, 2));
		expect(artifactsResponse.status).toBe(200);

		const artifacts = artifactsResponse.data as Array<{ artifacts?: Array<{ data: unknown }> }>;
		expect(artifacts).toBeInstanceOf(Array);
		expect(artifacts.length).toBeGreaterThan(0);
		expect(artifacts[0].artifacts).toBeInstanceOf(Array);

		console.log('\n=== Final Results ===');
		artifacts[0].artifacts?.forEach((a, i) => {
			console.log(`Row ${i + 1}:`, JSON.stringify(a.data, null, 2));
		});
	}, 300000); // 5 minute timeout
});
