import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { getTaskStatus, getTaskResult } from '../helpers/api';

export const taskOperationFields: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., {{$json.task_id}}',
		description: 'The task ID returned from a previous Everyrow operation',
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
	},
];

export async function executeGetStatusOperation(
	this: IExecuteFunctions,
): Promise<IDataObject[]> {
	const taskId = this.getNodeParameter('taskId', 0) as string;

	const status = await getTaskStatus.call(this, taskId);

	return [status as unknown as IDataObject];
}

export async function executeGetResultOperation(
	this: IExecuteFunctions,
): Promise<IDataObject[]> {
	const taskId = this.getNodeParameter('taskId', 0) as string;

	const result = await getTaskResult.call(this, taskId);

	if (!result.data) {
		// Return the result object itself if no data (might be an error or pending)
		return [result as unknown as IDataObject];
	}

	// Handle both array and single object responses
	if (Array.isArray(result.data)) {
		return result.data;
	}
	return [result.data];
}
