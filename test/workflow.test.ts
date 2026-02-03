import { describe, it, expect, beforeAll } from 'vitest';
import 'dotenv/config';

const API_URL = process.env.EVERYROW_API_URL || 'https://engine.futuresearch.ai/api/v0';
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
): Promise<{ status: string; artifact_id?: string; error?: string; data?: unknown }> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const { data, status: httpStatus } = await apiRequest('GET', `/tasks/${taskId}/status`);
		const result = data as { status: string; artifact_id?: string; error?: string };

		console.log(`Poll attempt ${attempt + 1}: httpStatus=${httpStatus}, status=${result?.status}, artifact_id=${result?.artifact_id}, error=${result?.error}`);

		// Handle unexpected API responses
		if (!result || !result.status) {
			console.log(`Unexpected response: ${JSON.stringify(data)}`);
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
			continue;
		}

		// API returns lowercase status values
		const status = result.status.toLowerCase();
		if (status === 'completed' || status === 'failed' || status === 'revoked') {
			return result;
		}

		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error(`Task ${taskId} did not complete within ${maxAttempts} attempts`);
}

async function getTaskResult(taskId: string): Promise<unknown[]> {
	const { data, status } = await apiRequest('GET', `/tasks/${taskId}/result`);
	if (status !== 200) {
		throw new Error(`Failed to get task result: ${JSON.stringify(data)}`);
	}
	const result = data as { data?: unknown[] | Record<string, unknown> };
	if (!result.data) {
		throw new Error('No data in task result');
	}
	return Array.isArray(result.data) ? result.data : [result.data];
}

describe('Everyrow Public API', () => {
	beforeAll(() => {
		if (!API_KEY) {
			throw new Error('EVERYROW_API_KEY environment variable is required');
		}
		console.log(`Using API URL: ${API_URL}`);
	});

	it('should create a session', async () => {
		const { status, data } = await apiRequest('POST', '/sessions', {
			name: `test-session-${Date.now()}`,
		});

		console.log('Create Session Response:', JSON.stringify(data, null, 2));

		expect(status).toBe(200);
		expect(data).toHaveProperty('session_id');
	});

	it('should complete rank workflow using public API', async () => {
		// Step 1: Submit rank operation directly with data
		console.log('\n=== Step 1: Submit Rank Operation ===');
		const rankPayload = {
			input: [
				{ name: 'OpenAI', description: 'AI research company, creators of GPT models' },
				{ name: 'Stripe', description: 'Payment processing platform' },
				{ name: 'Anthropic', description: 'AI safety company, creators of Claude' },
			],
			task: 'Score each company by their relevance to AI infrastructure. Companies building core AI models should score highest.',
			sort_by: 'score',
			ascending: false,
			response_schema: {
				type: 'object',
				properties: {
					score: { type: 'number', description: 'Relevance score from 0-100' },
					reasoning: { type: 'string', description: 'Brief explanation' },
				},
				required: ['score'],
			},
		};
		console.log('Rank Payload:', JSON.stringify(rankPayload, null, 2));

		const rankResponse = await apiRequest('POST', '/operations/rank', rankPayload);
		console.log('Rank Response:', JSON.stringify(rankResponse.data, null, 2));
		expect(rankResponse.status).toBe(200);

		const taskId = (rankResponse.data as { task_id: string }).task_id;
		expect(taskId).toBeTruthy();
		console.log(`Task ID: ${taskId}`);

		// Step 2: Poll for completion
		console.log('\n=== Step 2: Poll for Completion ===');
		const status = await pollTaskStatus(taskId, 60, 5000);
		console.log('Final Status:', JSON.stringify(status, null, 2));
		expect(status.status.toLowerCase()).toBe('completed');

		// Step 3: Get result
		console.log('\n=== Step 3: Get Result ===');
		const results = await getTaskResult(taskId);
		console.log('Results:', JSON.stringify(results, null, 2));
		expect(results.length).toBeGreaterThan(0);
	}, 300000); // 5 minute timeout

	it('should complete dedupe workflow using public API', async () => {
		// Step 1: Submit dedupe operation directly with data
		console.log('\n=== Step 1: Submit Dedupe Operation ===');
		const dedupePayload = {
			input: [
				{ name: 'OpenAI', description: 'AI research company' },
				{ name: 'Open AI', description: 'Creators of GPT and ChatGPT' },
				{ name: 'Anthropic', description: 'AI safety company' },
				{ name: 'Stripe', description: 'Payment processing platform' },
				{ name: 'Stripe Inc', description: 'Online payment infrastructure' },
			],
			equivalence_relation: 'Two entries are duplicates if they represent the same company, even if the name is slightly different or includes suffixes like Inc, AI, etc.',
		};
		console.log('Dedupe Payload:', JSON.stringify(dedupePayload, null, 2));

		const dedupeResponse = await apiRequest('POST', '/operations/dedupe', dedupePayload);
		console.log('Dedupe Response:', JSON.stringify(dedupeResponse.data, null, 2));
		expect(dedupeResponse.status).toBe(200);

		const taskId = (dedupeResponse.data as { task_id: string }).task_id;
		expect(taskId).toBeTruthy();
		console.log(`Task ID: ${taskId}`);

		// Step 2: Poll for completion
		console.log('\n=== Step 2: Poll for Completion ===');
		const status = await pollTaskStatus(taskId, 60, 5000);
		console.log('Final Status:', JSON.stringify(status, null, 2));
		expect(status.status.toLowerCase()).toBe('completed');

		// Step 3: Get result
		console.log('\n=== Step 3: Get Result ===');
		const results = await getTaskResult(taskId);
		console.log('Results:', JSON.stringify(results, null, 2));

		// Should have fewer rows than input due to deduplication
		expect(results.length).toBeGreaterThan(0);
		expect(results.length).toBeLessThanOrEqual(5);
	}, 300000);

	it('should complete screen workflow using public API', async () => {
		// Step 1: Submit screen operation directly with data
		console.log('\n=== Step 1: Submit Screen Operation ===');
		const screenPayload = {
			input: [
				{ name: 'OpenAI', description: 'AI research company, creators of GPT models', industry: 'AI' },
				{ name: 'Stripe', description: 'Payment processing platform for internet businesses', industry: 'Fintech' },
				{ name: 'Anthropic', description: 'AI safety company, creators of Claude', industry: 'AI' },
				{ name: 'Figma', description: 'Collaborative design tool for UI/UX', industry: 'Design' },
				{ name: 'Scale AI', description: 'Data labeling and AI infrastructure company', industry: 'AI' },
			],
			task: 'Filter to only include companies that are primarily focused on AI/ML. Companies should be building AI models, AI infrastructure, or AI-powered products as their core business.',
			response_schema: {
				type: 'object',
				properties: {
					included: { type: 'boolean', description: 'Whether the company passes the AI/ML filter' },
					reasoning: { type: 'string', description: 'Explanation for the decision' },
				},
				required: ['included'],
			},
		};
		console.log('Screen Payload:', JSON.stringify(screenPayload, null, 2));

		const screenResponse = await apiRequest('POST', '/operations/screen', screenPayload);
		console.log('Screen Response:', JSON.stringify(screenResponse.data, null, 2));
		expect(screenResponse.status).toBe(200);

		const taskId = (screenResponse.data as { task_id: string }).task_id;
		expect(taskId).toBeTruthy();
		console.log(`Task ID: ${taskId}`);

		// Step 2: Poll for completion
		console.log('\n=== Step 2: Poll for Completion ===');
		const status = await pollTaskStatus(taskId, 60, 5000);
		console.log('Final Status:', JSON.stringify(status, null, 2));
		expect(status.status.toLowerCase()).toBe('completed');

		// Step 3: Get result
		console.log('\n=== Step 3: Get Result ===');
		const results = await getTaskResult(taskId);
		console.log('Results:', JSON.stringify(results, null, 2));

		// Should have filtered to AI companies
		expect(results.length).toBeLessThanOrEqual(4);
		expect(results.length).toBeGreaterThan(0);
	}, 300000);

	it('should complete merge workflow using public API', async () => {
		// Step 1: Submit merge operation directly with data
		console.log('\n=== Step 1: Submit Merge Operation ===');
		const mergePayload = {
			left_input: [
				{ company_name: 'OpenAI', notes: 'Interested in partnership' },
				{ company_name: 'Anthropic', notes: 'Potential customer' },
				{ company_name: 'Stripe', notes: 'Payment provider' },
			],
			right_input: [
				{ name: 'OpenAI', founded: 2015, headquarters: 'San Francisco', employees: 1500 },
				{ name: 'Anthropic', founded: 2021, headquarters: 'San Francisco', employees: 500 },
				{ name: 'Stripe Inc.', founded: 2010, headquarters: 'San Francisco', employees: 8000 },
				{ name: 'Google', founded: 1998, headquarters: 'Mountain View', employees: 180000 },
			],
			task: 'Match companies from the left table with their corresponding entries in the right table based on company name. The names may be slightly different (e.g., "Stripe" vs "Stripe Inc.").',
		};
		console.log('Merge Payload:', JSON.stringify(mergePayload, null, 2));

		const mergeResponse = await apiRequest('POST', '/operations/merge', mergePayload);
		console.log('Merge Response:', JSON.stringify(mergeResponse.data, null, 2));
		expect(mergeResponse.status).toBe(200);

		const taskId = (mergeResponse.data as { task_id: string }).task_id;
		expect(taskId).toBeTruthy();
		console.log(`Task ID: ${taskId}`);

		// Step 2: Poll for completion
		console.log('\n=== Step 2: Poll for Completion ===');
		const status = await pollTaskStatus(taskId, 60, 5000);
		console.log('Final Status:', JSON.stringify(status, null, 2));
		expect(status.status.toLowerCase()).toBe('completed');

		// Step 3: Get result
		console.log('\n=== Step 3: Get Result ===');
		const results = await getTaskResult(taskId);
		console.log('Results:', JSON.stringify(results, null, 2));

		// Should have 3 rows (one for each left table entry)
		expect(results.length).toBe(3);
	}, 300000);

	it('should complete agent-map workflow using public API', async () => {
		// Step 1: Submit agent-map operation directly with data
		// NOTE: Matching everyrow-sheets implementation - no llm or response_schema params
		console.log('\n=== Step 1: Submit Agent Map Operation ===');
		const agentPayload = {
			input: [
				{ name: 'OpenAI', website: 'openai.com' },
				{ name: 'Anthropic', website: 'anthropic.com' },
			],
			task: 'Research this company and find their latest funding round, including the amount raised if available.',
			effort_level: 'low',
			join_with_input: true,
		};
		console.log('Agent Payload:', JSON.stringify(agentPayload, null, 2));

		const agentResponse = await apiRequest('POST', '/operations/agent-map', agentPayload);
		console.log('Agent Response:', JSON.stringify(agentResponse.data, null, 2));
		expect(agentResponse.status).toBe(200);

		const taskId = (agentResponse.data as { task_id: string }).task_id;
		expect(taskId).toBeTruthy();
		console.log(`Task ID: ${taskId}`);

		// Step 2: Poll for completion (longer timeout for AI research)
		console.log('\n=== Step 2: Poll for Completion ===');
		const status = await pollTaskStatus(taskId, 90, 10000); // 15 min timeout, 10s intervals
		console.log('Final Status:', JSON.stringify(status, null, 2));
		expect(status.status.toLowerCase()).toBe('completed');

		// Step 3: Get result
		console.log('\n=== Step 3: Get Result ===');
		const results = await getTaskResult(taskId);
		console.log('Results:', JSON.stringify(results, null, 2));

		// Should have 2 rows (one for each company)
		expect(results.length).toBe(2);
	}, 900000); // 15 minute timeout for agent tasks
});
