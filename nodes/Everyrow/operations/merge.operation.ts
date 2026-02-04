import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { createSession, submitMergeOperation } from '../helpers/api';

export const mergeOperationFields: INodeProperties[] = [
	{
		displayName: 'Task Description',
		name: 'task',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		placeholder:
			'e.g., Match companies from the left table with their corresponding entries in the lookup table based on company name',
		description: 'Describe how to match rows between the two tables',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['merge'],
			},
		},
	},
	{
		displayName: 'Right Table (Lookup Data)',
		name: 'rightTable',
		type: 'json',
		required: true,
		default: '[]',
		placeholder: '[{"id": 1, "name": "Company A"}, {"id": 2, "name": "Company B"}]',
		description:
			'The lookup table to merge with. This should be a JSON array of objects.',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['merge'],
			},
		},
	},
	{
		displayName: 'Merge Key (Left Table)',
		name: 'mergeOnLeft',
		type: 'string',
		default: '',
		placeholder: 'e.g., company_name',
		description:
			'Optional: Column name in the left table to use for matching. If not specified, AI will determine the best match.',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['merge'],
			},
		},
	},
	{
		displayName: 'Merge Key (Right Table)',
		name: 'mergeOnRight',
		type: 'string',
		default: '',
		placeholder: 'e.g., name',
		description:
			'Optional: Column name in the right table to use for matching. If not specified, AI will determine the best match.',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['merge'],
			},
		},
	},
];

export async function executeMergeOperation(
	this: IExecuteFunctions,
	items: IDataObject[],
	sessionName: string,
): Promise<IDataObject[]> {
	const task = this.getNodeParameter('task', 0) as string;
	const rightTableRaw = this.getNodeParameter('rightTable', 0) as string;
	const mergeOnLeft = this.getNodeParameter('mergeOnLeft', 0) as string;
	const mergeOnRight = this.getNodeParameter('mergeOnRight', 0) as string;

	// Parse right table
	let rightTable: IDataObject[];
	try {
		rightTable = JSON.parse(rightTableRaw) as IDataObject[];
		if (!Array.isArray(rightTable)) {
			throw new Error('Right table must be an array');
		}
	} catch (e) {
		throw new Error(`Invalid right table JSON: ${(e as Error).message}`);
	}

	// Create session
	const session = await createSession.call(this, sessionName);

	// Submit merge operation
	const operationResponse = await submitMergeOperation.call(
		this,
		items,
		rightTable,
		task,
		mergeOnLeft || undefined,
		mergeOnRight || undefined,
		session.session_id,
	);

	// Return task info immediately (no polling)
	return [
		{
			task_id: operationResponse.task_id,
			session_id: operationResponse.session_id,
			status: operationResponse.status,
			operation: 'merge',
		},
	];
}
