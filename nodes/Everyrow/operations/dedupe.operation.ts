import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	createSession,
	createTableArtifact,
	getArtifacts,
	submitTask,
	type ArtifactGroupRecord,
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

	// Create session
	const session = await createSession.call(this, sessionName);

	// Create input artifact from items
	const inputArtifactId = await createTableArtifact.call(this, session.session_id, items);

	// Build and submit dedupe task
	const payload = {
		task_type: 'dedupe',
		query: {
			equivalence_relation: equivalenceRelation,
		},
		input_artifacts: [inputArtifactId],
		processing_mode: 'MAP',
	};

	const taskResponse = await submitTask.call(this, session.session_id, payload);

	// Poll for completion
	const status = await pollTaskCompletion.call(this, taskResponse.task_id, pollInterval, maxWaitTime);

	if (!status.artifact_id) {
		throw new Error('Dedupe operation completed but no artifact ID was returned');
	}

	// Fetch results
	const artifacts = await getArtifacts.call(this, [status.artifact_id]);
	if (artifacts.length === 0) {
		throw new Error('No artifacts returned from dedupe operation');
	}

	const result = artifacts[0] as ArtifactGroupRecord;
	if (!result.artifacts) {
		throw new Error('Expected table result from dedupe operation');
	}

	return result.artifacts.map((a) => a.data);
}
