import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	createSession,
	getTaskResult,
	submitScreenOperation,
} from '../helpers/api';
import { pollTaskCompletion } from '../helpers/polling';

export const screenOperationFields: INodeProperties[] = [
	{
		displayName: 'Task Description',
		name: 'task',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		placeholder: 'e.g., Filter companies that have raised Series A or later funding',
		description:
			'Describe the criteria for screening/filtering rows. Rows not matching the criteria will be removed.',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['screen'],
			},
		},
	},
	{
		displayName: 'Response Schema (JSON)',
		name: 'responseSchema',
		type: 'json',
		default: '{"type": "object", "properties": {"included": {"type": "boolean", "description": "Whether the row passes the filter"}, "reasoning": {"type": "string", "description": "Explanation for the decision"}}, "required": ["included"]}',
		description:
			'JSON Schema for the response format. Must include at least one boolean field to determine filtering.',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['screen'],
			},
		},
	},
];

export async function executeScreenOperation(
	this: IExecuteFunctions,
	items: IDataObject[],
	sessionName: string,
	pollInterval: number,
	maxWaitTime: number,
): Promise<IDataObject[]> {
	const task = this.getNodeParameter('task', 0) as string;
	const responseSchemaRaw = this.getNodeParameter('responseSchema', 0) as string;

	// Parse response schema if provided
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

	// Submit screen operation directly with data
	const operationResponse = await submitScreenOperation.call(
		this,
		items,
		task,
		responseSchema,
		session.session_id,
	);

	// Poll for completion
	await pollTaskCompletion.call(this, operationResponse.task_id, pollInterval, maxWaitTime);

	// Fetch results using the new result endpoint
	const result = await getTaskResult.call(this, operationResponse.task_id);

	if (!result.data) {
		throw new Error('Screen operation completed but no data was returned');
	}

	// Handle both array and single object responses
	if (Array.isArray(result.data)) {
		return result.data;
	}
	return [result.data];
}
