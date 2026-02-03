import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	createSession,
	getTaskResult,
	submitAgentMapOperation,
} from '../helpers/api';
import { pollTaskCompletion } from '../helpers/polling';

export const agentMapOperationFields: INodeProperties[] = [
	{
		displayName: 'Task Description',
		name: 'task',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., Research each company and find their latest funding round',
		description: 'Describe what the AI agent should do for each row',
		displayOptions: {
			show: {
				resource: ['agentOperations'],
				operation: ['agentMap'],
			},
		},
	},
	{
		displayName: 'Effort Level',
		name: 'effortLevel',
		type: 'options',
		options: [
			{
				name: 'Low',
				value: 'low',
				description: 'Quick research with minimal web searches',
			},
			{
				name: 'Medium',
				value: 'medium',
				description: 'Moderate research depth',
			},
			{
				name: 'High',
				value: 'high',
				description: 'Thorough research with extensive web searches',
			},
		],
		default: 'low',
		description: 'How much effort the AI should put into researching each row',
		displayOptions: {
			show: {
				resource: ['agentOperations'],
				operation: ['agentMap'],
			},
		},
	},
	{
		displayName: 'Response Schema (JSON)',
		name: 'responseSchema',
		type: 'json',
		default: '',
		placeholder: '{"type": "object", "properties": {"answer": {"type": "string"}}}',
		description:
			'Optional JSON Schema defining the structure of the response. Leave empty for default behavior.',
		displayOptions: {
			show: {
				resource: ['agentOperations'],
				operation: ['agentMap'],
			},
		},
	},
	{
		displayName: 'Join With Input',
		name: 'joinWithInput',
		type: 'boolean',
		default: true,
		description:
			'Whether to merge agent output with the original input row',
		displayOptions: {
			show: {
				resource: ['agentOperations'],
				operation: ['agentMap'],
			},
		},
	},
];

export async function executeAgentMapOperation(
	this: IExecuteFunctions,
	items: IDataObject[],
	sessionName: string,
	pollInterval: number,
	maxWaitTime: number,
): Promise<IDataObject[]> {
	const task = this.getNodeParameter('task', 0) as string;
	const effortLevel = this.getNodeParameter('effortLevel', 0) as string;
	const responseSchemaRaw = this.getNodeParameter('responseSchema', 0) as string;
	const joinWithInput = this.getNodeParameter('joinWithInput', 0) as boolean;

	// Parse response schema (optional - only if provided)
	let responseSchema: IDataObject | undefined;
	if (responseSchemaRaw && responseSchemaRaw.trim()) {
		try {
			responseSchema = JSON.parse(responseSchemaRaw) as IDataObject;
		} catch (e) {
			throw new Error(`Invalid response schema JSON: ${(e as Error).message}`);
		}
	}

	// Create session (optional - the API will auto-create if not provided)
	const session = await createSession.call(this, sessionName);

	// Submit agent map operation directly with data
	// Note: Not sending llm parameter - let the API use its default
	const operationResponse = await submitAgentMapOperation.call(
		this,
		items,
		task,
		effortLevel,
		responseSchema,
		undefined, // llm - use API default
		joinWithInput,
		session.session_id,
	);

	// Poll for completion
	await pollTaskCompletion.call(this, operationResponse.task_id, pollInterval, maxWaitTime);

	// Fetch results using the new result endpoint
	const result = await getTaskResult.call(this, operationResponse.task_id);

	if (!result.data) {
		throw new Error('Agent Map operation completed but no data was returned');
	}

	// Handle both array and single object responses
	if (Array.isArray(result.data)) {
		return result.data;
	}
	return [result.data];
}
