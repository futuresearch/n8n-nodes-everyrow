import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	createSession,
	createTableArtifact,
	getArtifacts,
	submitTask,
	type ArtifactGroupRecord,
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
		default: '',
		placeholder:
			'{"included": {"type": "bool", "description": "Whether the row passes the screen"}, "reason": {"type": "str", "description": "Why included or excluded"}}',
		description:
			'Optional custom response schema to capture additional information during screening',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['screen'],
			},
		},
	},
	{
		displayName: 'Batch Size',
		name: 'batchSize',
		type: 'number',
		default: 10,
		description: 'Number of rows to process in each batch',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['screen'],
			},
		},
	},
	{
		displayName: 'Preview Mode',
		name: 'preview',
		type: 'boolean',
		default: false,
		description: 'Whether to process only the first few rows for testing',
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
	const batchSize = this.getNodeParameter('batchSize', 0) as number;
	const preview = this.getNodeParameter('preview', 0) as boolean;

	// Create session
	const session = await createSession.call(this, sessionName);

	// Create input artifact from items
	const inputArtifactId = await createTableArtifact.call(this, session.session_id, items);

	// Build query params
	const queryParams: IDataObject = {
		task,
		batch_size: batchSize,
		preview,
	};

	// Parse response schema if provided
	if (responseSchemaRaw && responseSchemaRaw.trim()) {
		try {
			const responseSchema = JSON.parse(responseSchemaRaw) as IDataObject;
			queryParams.response_schema = responseSchema;
			queryParams.response_schema_type = 'JSON';
		} catch (e) {
			throw new Error(`Invalid response schema JSON: ${(e as Error).message}`);
		}
	}

	// Build and submit screen task
	const payload = {
		DeepScreenRequest: {
			query: queryParams,
			input_artifacts: [inputArtifactId],
		},
	};

	const taskResponse = await submitTask.call(this, session.session_id, payload);

	// Poll for completion
	const status = await pollTaskCompletion.call(this, taskResponse.task_id, pollInterval, maxWaitTime);

	if (!status.artifact_id) {
		throw new Error('Screen operation completed but no artifact ID was returned');
	}

	// Fetch results
	const artifacts = await getArtifacts.call(this, [status.artifact_id]);
	if (artifacts.length === 0) {
		throw new Error('No artifacts returned from screen operation');
	}

	const result = artifacts[0] as ArtifactGroupRecord;
	if (!result.artifacts) {
		throw new Error('Expected table result from screen operation');
	}

	return result.artifacts.map((a) => a.data);
}
