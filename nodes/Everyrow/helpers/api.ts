import type { IExecuteFunctions, IHttpRequestMethods, IDataObject } from 'n8n-workflow';

export interface EveryrowCredentials {
	apiKey: string;
	apiUrl: string;
}

export interface CreateSessionResponse {
	session_id: string;
}

export interface SubmitTaskResponse {
	task_id: string;
}

export interface TaskStatusResponse {
	status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'REVOKED';
	artifact_id?: string;
	error?: string;
}

export interface ArtifactRecord {
	data: IDataObject;
}

export interface ArtifactGroupRecord {
	artifacts: ArtifactRecord[];
}

/**
 * Makes an authenticated request to the Everyrow API.
 */
export async function everyrowApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	query?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const credentials = (await this.getCredentials('everyrowApi')) as EveryrowCredentials;

	const options = {
		method,
		body,
		qs: query,
		url: `${credentials.apiUrl}${endpoint}`,
		json: true,
	};

	return await this.helpers.requestWithAuthentication.call(this, 'everyrowApi', options);
}

/**
 * Creates a new session in Everyrow.
 */
export async function createSession(
	this: IExecuteFunctions,
	name: string,
): Promise<CreateSessionResponse> {
	const response = await everyrowApiRequest.call(this, 'POST', '/sessions/create', {
		name,
	});
	return response as unknown as CreateSessionResponse;
}

/**
 * Submits a task to Everyrow.
 */
export async function submitTask(
	this: IExecuteFunctions,
	sessionId: string,
	payload: IDataObject,
): Promise<SubmitTaskResponse> {
	const response = await everyrowApiRequest.call(this, 'POST', '/tasks', {
		session_id: sessionId,
		payload,
	});
	return response as unknown as SubmitTaskResponse;
}

/**
 * Gets the status of a task.
 */
export async function getTaskStatus(
	this: IExecuteFunctions,
	taskId: string,
): Promise<TaskStatusResponse> {
	const response = await everyrowApiRequest.call(this, 'GET', `/tasks/${taskId}/status`);
	return response as unknown as TaskStatusResponse;
}

/**
 * Fetches artifacts by their IDs.
 */
export async function getArtifacts(
	this: IExecuteFunctions,
	artifactIds: string[],
): Promise<(ArtifactGroupRecord | ArtifactRecord)[]> {
	const response = await everyrowApiRequest.call(this, 'GET', '/artifacts', undefined, {
		artifact_ids: artifactIds.join(','),
	});
	return response as unknown as (ArtifactGroupRecord | ArtifactRecord)[];
}

/**
 * Creates a table artifact from input data.
 */
export async function createTableArtifact(
	this: IExecuteFunctions,
	sessionId: string,
	data: IDataObject[],
): Promise<string> {
	const payload = {
		task_type: 'create_group',
		query: {
			data_to_create: data,
		},
	};

	const response = await submitTask.call(this, sessionId, payload);

	// Poll for completion and return the artifact ID
	const { pollTaskCompletion } = await import('./polling');
	const status = await pollTaskCompletion.call(this, response.task_id);

	if (!status.artifact_id) {
		throw new Error('Failed to create table artifact: no artifact ID returned');
	}

	return status.artifact_id;
}
