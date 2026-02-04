import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { createSession, submitRankOperation } from '../helpers/api';

export const rankOperationFields: INodeProperties[] = [
	{
		displayName: 'Task Description',
		name: 'task',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., Score each company by their relevance to AI infrastructure',
		description: 'Describe what criteria to use for ranking the rows',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['rank'],
			},
		},
	},
	{
		displayName: 'Field Name',
		name: 'fieldName',
		type: 'string',
		required: true,
		default: 'score',
		description: 'Name of the field to extract and sort by',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['rank'],
			},
		},
	},
	{
		displayName: 'Sort Order',
		name: 'ascendingOrder',
		type: 'boolean',
		default: true,
		description: 'Whether to sort in ascending order (lowest first)',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['rank'],
			},
		},
	},
	{
		displayName: 'Response Schema (JSON)',
		name: 'responseSchema',
		type: 'json',
		default: '',
		placeholder:
			'{"type": "object", "properties": {"score": {"type": "number"}, "reasoning": {"type": "string"}}, "required": ["score"]}',
		description:
			'Optional JSON Schema for the response format. If not provided, a default schema with the sort field will be used.',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['rank'],
			},
		},
	},
];

export async function executeRankOperation(
	this: IExecuteFunctions,
	items: IDataObject[],
	sessionName: string,
): Promise<IDataObject[]> {
	const task = this.getNodeParameter('task', 0) as string;
	const fieldName = this.getNodeParameter('fieldName', 0) as string;
	const ascendingOrder = this.getNodeParameter('ascendingOrder', 0) as boolean;
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

	// Create session
	const session = await createSession.call(this, sessionName);

	// Submit rank operation
	const operationResponse = await submitRankOperation.call(
		this,
		items,
		task,
		fieldName,
		ascendingOrder,
		responseSchema,
		session.session_id,
	);

	// Return task info immediately (no polling)
	return [
		{
			task_id: operationResponse.task_id,
			session_id: operationResponse.session_id,
			status: operationResponse.status,
			operation: 'rank',
		},
	];
}
