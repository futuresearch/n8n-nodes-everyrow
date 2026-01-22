import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	createSession,
	createTableArtifact,
	getArtifacts,
	submitTask,
	type ArtifactGroupRecord,
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
		default: '{"answer": {"type": "str", "description": "The answer to the task"}}',
		description:
			'Define the structure of the response. Each field should have a type and description.',
		displayOptions: {
			show: {
				resource: ['agentOperations'],
				operation: ['agentMap'],
			},
		},
	},
	{
		displayName: 'LLM Model',
		name: 'llm',
		type: 'options',
		options: [
			{ name: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku' },
			{ name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
			{ name: 'Default (Auto-Select)', value: '' },
			{ name: 'GPT-4o', value: 'gpt-4o' },
			{ name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
		],
		default: '',
		description: 'Which LLM model to use for the agent',
		displayOptions: {
			show: {
				resource: ['agentOperations'],
				operation: ['agentMap'],
			},
		},
	},
	{
		displayName: 'Return Table Per Row',
		name: 'returnTablePerRow',
		type: 'boolean',
		default: false,
		description:
			'Whether each row should return a table of results (for expand operations)',
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
	const llm = this.getNodeParameter('llm', 0) as string;
	const returnTablePerRow = this.getNodeParameter('returnTablePerRow', 0) as boolean;

	// Parse response schema
	let responseSchema: IDataObject;
	try {
		responseSchema = JSON.parse(responseSchemaRaw) as IDataObject;
		responseSchema['_model_name'] = 'AgentResponse';
	} catch (e) {
		throw new Error(`Invalid response schema JSON: ${(e as Error).message}`);
	}

	// Create session
	const session = await createSession.call(this, sessionName);

	// Create input artifact from items
	const inputArtifactId = await createTableArtifact.call(this, session.session_id, items);

	// Build query params
	const queryParams: IDataObject = {
		task,
		effort_level: effortLevel,
		response_schema: responseSchema,
		response_schema_type: 'CUSTOM',
		is_expand: returnTablePerRow,
		include_provenance_and_notes: false,
	};

	if (llm) {
		queryParams.llm = llm;
	}

	// Build and submit agent map task
	const payload = {
		task_type: 'agent',
		query: queryParams,
		input_artifacts: [inputArtifactId],
		context_artifacts: [],
		join_with_input: true,
	};

	const taskResponse = await submitTask.call(this, session.session_id, payload);

	// Poll for completion
	const status = await pollTaskCompletion.call(this, taskResponse.task_id, pollInterval, maxWaitTime);

	if (!status.artifact_id) {
		throw new Error('Agent Map operation completed but no artifact ID was returned');
	}

	// Fetch results
	const artifacts = await getArtifacts.call(this, [status.artifact_id]);
	if (artifacts.length === 0) {
		throw new Error('No artifacts returned from agent map operation');
	}

	const result = artifacts[0] as ArtifactGroupRecord;
	if (!result.artifacts) {
		throw new Error('Expected table result from agent map operation');
	}

	return result.artifacts.map((a) => a.data);
}
