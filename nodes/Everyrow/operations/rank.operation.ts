import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	createSession,
	createTableArtifact,
	getArtifacts,
	submitTask,
	type ArtifactGroupRecord,
} from '../helpers/api';
import { pollTaskCompletion } from '../helpers/polling';

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
		displayName: 'Field Type',
		name: 'fieldType',
		type: 'options',
		options: [
			{ name: 'Float', value: 'float' },
			{ name: 'Integer', value: 'int' },
			{ name: 'String', value: 'str' },
			{ name: 'Boolean', value: 'bool' },
		],
		default: 'float',
		description: 'Type of the ranking field',
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
			'{"score": {"type": "float", "description": "Score 0-100"}, "reasoning": {"type": "str", "description": "Explanation"}}',
		description:
			'Optional custom response schema. If not provided, a simple schema with just the field name will be used.',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['rank'],
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
				operation: ['rank'],
			},
		},
	},
];

export async function executeRankOperation(
	this: IExecuteFunctions,
	items: IDataObject[],
	sessionName: string,
	pollInterval: number,
	maxWaitTime: number,
): Promise<IDataObject[]> {
	const task = this.getNodeParameter('task', 0) as string;
	const fieldName = this.getNodeParameter('fieldName', 0) as string;
	const fieldType = this.getNodeParameter('fieldType', 0) as string;
	const ascendingOrder = this.getNodeParameter('ascendingOrder', 0) as boolean;
	const responseSchemaRaw = this.getNodeParameter('responseSchema', 0) as string;
	const preview = this.getNodeParameter('preview', 0) as boolean;

	// Parse response schema or build default
	let responseSchema: IDataObject;
	if (responseSchemaRaw && responseSchemaRaw.trim()) {
		try {
			responseSchema = JSON.parse(responseSchemaRaw) as IDataObject;
			responseSchema['_model_name'] = 'RankResponse';
		} catch (e) {
			throw new Error(`Invalid response schema JSON: ${(e as Error).message}`);
		}
	} else {
		responseSchema = {
			_model_name: 'RankResponse',
			[fieldName]: {
				type: fieldType,
				optional: false,
			},
		};
	}

	// Create session
	const session = await createSession.call(this, sessionName);

	// Create input artifact from items
	const inputArtifactId = await createTableArtifact.call(this, session.session_id, items);

	// Build and submit rank task
	const payload = {
		DeepRankRequest: {
			query: {
				task,
				response_schema: responseSchema,
				field_to_sort_by: fieldName,
				ascending_order: ascendingOrder,
				preview,
			},
			input_artifacts: [inputArtifactId],
			context_artifacts: [],
		},
	};

	const taskResponse = await submitTask.call(this, session.session_id, payload);

	// Poll for completion
	const status = await pollTaskCompletion.call(this, taskResponse.task_id, pollInterval, maxWaitTime);

	if (!status.artifact_id) {
		throw new Error('Rank operation completed but no artifact ID was returned');
	}

	// Fetch results
	const artifacts = await getArtifacts.call(this, [status.artifact_id]);
	if (artifacts.length === 0) {
		throw new Error('No artifacts returned from rank operation');
	}

	const result = artifacts[0] as ArtifactGroupRecord;
	if (!result.artifacts) {
		throw new Error('Expected table result from rank operation');
	}

	return result.artifacts.map((a) => a.data);
}
