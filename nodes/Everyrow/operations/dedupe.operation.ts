import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	createSession,
	getTaskResult,
	submitDedupeOperation,
} from '../helpers/api';
import { pollTaskCompletion } from '../helpers/polling';

export const dedupeOperationFields: INodeProperties[] = [
	{
		displayName: 'Equivalence Relation',
		name: 'equivalenceRelation',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		placeholder:
			'e.g., Two entries are duplicates if they represent the same company, even if the name is slightly different',
		description:
			'Describe what makes two rows equivalent/duplicates. The AI will use this to identify and remove duplicates.',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['dedupe'],
			},
		},
	},
];

export async function executeDedupeOperation(
	this: IExecuteFunctions,
	items: IDataObject[],
	sessionName: string,
	pollInterval: number,
	maxWaitTime: number,
): Promise<IDataObject[]> {
	const equivalenceRelation = this.getNodeParameter('equivalenceRelation', 0) as string;

	// Create session (optional - the API will auto-create if not provided)
	const session = await createSession.call(this, sessionName);

	// Submit dedupe operation directly with data
	const operationResponse = await submitDedupeOperation.call(
		this,
		items,
		equivalenceRelation,
		session.session_id,
	);

	// Poll for completion
	await pollTaskCompletion.call(this, operationResponse.task_id, pollInterval, maxWaitTime);

	// Fetch results using the new result endpoint
	const result = await getTaskResult.call(this, operationResponse.task_id);

	if (!result.data) {
		throw new Error('Dedupe operation completed but no data was returned');
	}

	// Handle both array and single object responses
	if (Array.isArray(result.data)) {
		return result.data;
	}
	return [result.data];
}
