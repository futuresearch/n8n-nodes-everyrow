import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	createSession,
	createTableArtifact,
	getArtifacts,
	submitTask,
	type ArtifactGroupRecord,
} from '../helpers/api';
import { pollTaskCompletion } from '../helpers/polling';

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
	{
		displayName: 'LLM Model',
		name: 'mergeModel',
		type: 'options',
		options: [
			{ name: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku' },
			{ name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
			{ name: 'Default (Auto-Select)', value: '' },
			{ name: 'GPT-4o', value: 'gpt-4o' },
			{ name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
		],
		default: '',
		description: 'Which LLM model to use for matching',
		displayOptions: {
			show: {
				resource: ['dataOperations'],
				operation: ['merge'],
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
				operation: ['merge'],
			},
		},
	},
];

export async function executeMergeOperation(
	this: IExecuteFunctions,
	items: IDataObject[],
	sessionName: string,
	pollInterval: number,
	maxWaitTime: number,
): Promise<IDataObject[]> {
	const task = this.getNodeParameter('task', 0) as string;
	const rightTableRaw = this.getNodeParameter('rightTable', 0) as string;
	const mergeOnLeft = this.getNodeParameter('mergeOnLeft', 0) as string;
	const mergeOnRight = this.getNodeParameter('mergeOnRight', 0) as string;
	const mergeModel = this.getNodeParameter('mergeModel', 0) as string;
	const preview = this.getNodeParameter('preview', 0) as boolean;

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

	// Create input artifacts from both tables
	const leftArtifactId = await createTableArtifact.call(this, session.session_id, items);
	const rightArtifactId = await createTableArtifact.call(this, session.session_id, rightTable);

	// Build query params
	const queryParams: IDataObject = {
		task,
		preview,
	};

	if (mergeOnLeft) {
		queryParams.merge_on_left = mergeOnLeft;
	}
	if (mergeOnRight) {
		queryParams.merge_on_right = mergeOnRight;
	}
	if (mergeModel) {
		queryParams.merge_model = mergeModel;
	}

	// Build and submit merge task
	const payload = {
		DeepMergeRequest: {
			query: queryParams,
			input_artifacts: [leftArtifactId],
			context_artifacts: [rightArtifactId],
		},
	};

	const taskResponse = await submitTask.call(this, session.session_id, payload);

	// Poll for completion
	const status = await pollTaskCompletion.call(this, taskResponse.task_id, pollInterval, maxWaitTime);

	if (!status.artifact_id) {
		throw new Error('Merge operation completed but no artifact ID was returned');
	}

	// Fetch results
	const artifacts = await getArtifacts.call(this, [status.artifact_id]);
	if (artifacts.length === 0) {
		throw new Error('No artifacts returned from merge operation');
	}

	const result = artifacts[0] as ArtifactGroupRecord;
	if (!result.artifacts) {
		throw new Error('Expected table result from merge operation');
	}

	return result.artifacts.map((a) => a.data);
}
