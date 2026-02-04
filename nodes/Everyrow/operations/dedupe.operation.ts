import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { createSession, submitDedupeOperation } from '../helpers/api';

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
): Promise<IDataObject[]> {
	const equivalenceRelation = this.getNodeParameter('equivalenceRelation', 0) as string;

	// Create session
	const session = await createSession.call(this, sessionName);

	// Submit dedupe operation
	const operationResponse = await submitDedupeOperation.call(
		this,
		items,
		equivalenceRelation,
		session.session_id,
	);

	// Return task info immediately (no polling)
	return [
		{
			task_id: operationResponse.task_id,
			session_id: operationResponse.session_id,
			status: operationResponse.status,
			operation: 'dedupe',
		},
	];
}
