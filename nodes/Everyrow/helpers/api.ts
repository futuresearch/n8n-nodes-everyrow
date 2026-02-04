import type { IExecuteFunctions, IHttpRequestMethods, IDataObject } from 'n8n-workflow';

export interface EveryrowCredentials {
	apiKey: string;
	apiUrl: string;
}

export interface SessionResponse {
	session_id: string;
}

export interface OperationResponse {
	task_id: string;
	session_id: string;
	status: string;
	artifact_id?: string;
	error?: string;
}

export interface TaskStatusResponse {
	task_id: string;
	session_id: string;
	status: string; // 'pending' | 'running' | 'completed' | 'failed'
	task_type: string;
	artifact_id?: string;
	error?: string;
	created_at?: string;
	updated_at?: string;
}

export interface TaskResultResponse {
	task_id: string;
	status: string;
	artifact_id?: string;
	data?: IDataObject[] | IDataObject;
	error?: string;
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

	return await this.helpers.httpRequestWithAuthentication.call(this, 'everyrowApi', options);
}

/**
 * Creates a new session in Everyrow (optional - sessions are auto-created if not provided).
 */
export async function createSession(
	this: IExecuteFunctions,
	name: string,
): Promise<SessionResponse> {
	const response = await everyrowApiRequest.call(this, 'POST', '/sessions', {
		name,
	});
	return response as unknown as SessionResponse;
}

/**
 * Submits a screen operation.
 */
export async function submitScreenOperation(
	this: IExecuteFunctions,
	input: IDataObject[],
	task: string,
	responseSchema?: IDataObject,
	sessionId?: string,
): Promise<OperationResponse> {
	const body: IDataObject = {
		input,
		task,
	};
	if (responseSchema) {
		body.response_schema = responseSchema;
	}
	if (sessionId) {
		body.session_id = sessionId;
	}
	const response = await everyrowApiRequest.call(this, 'POST', '/operations/screen', body);
	return response as unknown as OperationResponse;
}

/**
 * Submits a rank operation.
 */
export async function submitRankOperation(
	this: IExecuteFunctions,
	input: IDataObject[],
	task: string,
	sortBy: string,
	ascending: boolean,
	responseSchema?: IDataObject,
	sessionId?: string,
): Promise<OperationResponse> {
	const body: IDataObject = {
		input,
		task,
		sort_by: sortBy,
		ascending,
	};
	if (responseSchema) {
		body.response_schema = responseSchema;
	}
	if (sessionId) {
		body.session_id = sessionId;
	}
	const response = await everyrowApiRequest.call(this, 'POST', '/operations/rank', body);
	return response as unknown as OperationResponse;
}

/**
 * Submits a merge operation.
 */
export async function submitMergeOperation(
	this: IExecuteFunctions,
	leftInput: IDataObject[],
	rightInput: IDataObject[],
	task: string,
	leftKey?: string,
	rightKey?: string,
	sessionId?: string,
): Promise<OperationResponse> {
	const body: IDataObject = {
		left_input: leftInput,
		right_input: rightInput,
		task,
	};
	if (leftKey) {
		body.left_key = leftKey;
	}
	if (rightKey) {
		body.right_key = rightKey;
	}
	if (sessionId) {
		body.session_id = sessionId;
	}
	const response = await everyrowApiRequest.call(this, 'POST', '/operations/merge', body);
	return response as unknown as OperationResponse;
}

/**
 * Submits a dedupe operation.
 */
export async function submitDedupeOperation(
	this: IExecuteFunctions,
	input: IDataObject[],
	equivalenceRelation: string,
	sessionId?: string,
): Promise<OperationResponse> {
	const body: IDataObject = {
		input,
		equivalence_relation: equivalenceRelation,
	};
	if (sessionId) {
		body.session_id = sessionId;
	}
	const response = await everyrowApiRequest.call(this, 'POST', '/operations/dedupe', body);
	return response as unknown as OperationResponse;
}

/**
 * Submits an agent-map operation.
 */
export async function submitAgentMapOperation(
	this: IExecuteFunctions,
	input: IDataObject[],
	task: string,
	effortLevel: string,
	responseSchema?: IDataObject,
	llm?: string,
	joinWithInput: boolean = true,
	sessionId?: string,
): Promise<OperationResponse> {
	const body: IDataObject = {
		input,
		task,
		effort_level: effortLevel,
		join_with_input: joinWithInput,
	};
	if (responseSchema) {
		body.response_schema = responseSchema;
	}
	if (llm) {
		body.llm = llm;
	}
	if (sessionId) {
		body.session_id = sessionId;
	}
	const response = await everyrowApiRequest.call(this, 'POST', '/operations/agent-map', body);
	return response as unknown as OperationResponse;
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
 * Gets the result data of a completed task.
 */
export async function getTaskResult(
	this: IExecuteFunctions,
	taskId: string,
): Promise<TaskResultResponse> {
	const response = await everyrowApiRequest.call(this, 'GET', `/tasks/${taskId}/result`);
	return response as unknown as TaskResultResponse;
}
