import type { IExecuteFunctions } from 'n8n-workflow';
import { getTaskStatus, type TaskStatusResponse } from './api';

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_MAX_WAIT_TIME_MS = 600000; // 10 minutes

/**
 * Polls for task completion with configurable interval and timeout.
 */
export async function pollTaskCompletion(
	this: IExecuteFunctions,
	taskId: string,
	pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
	maxWaitTimeMs: number = DEFAULT_MAX_WAIT_TIME_MS,
): Promise<TaskStatusResponse> {
	const startTime = Date.now();
	let retries = 0;
	const maxRetries = 3;

	while (true) {
		// Check timeout
		if (Date.now() - startTime > maxWaitTimeMs) {
			throw new Error(
				`Task ${taskId} timed out after ${maxWaitTimeMs / 1000} seconds. ` +
					'The task may still be running. You can check its status manually.',
			);
		}

		try {
			const status = await getTaskStatus.call(this, taskId);
			retries = 0; // Reset retries on successful request

			// Check terminal states (API returns lowercase status values)
			const statusLower = status.status.toLowerCase();
			if (statusLower === 'completed') {
				return status;
			}

			if (statusLower === 'failed') {
				throw new Error(`Task ${taskId} failed: ${status.error || 'Unknown error'}`);
			}

			if (statusLower === 'revoked') {
				throw new Error(`Task ${taskId} was revoked/cancelled`);
			}

			// Still running, wait and poll again
			await sleep(pollIntervalMs);
		} catch (error) {
			// Network/transient errors - retry with backoff
			if (isNetworkError(error)) {
				retries++;
				if (retries >= maxRetries) {
					throw new Error(
						`Failed to get task status after ${maxRetries} retries: ${(error as Error).message}`,
					);
				}
				await sleep(pollIntervalMs * retries); // Exponential backoff
				continue;
			}
			// Re-throw non-network errors
			throw error;
		}
	}
}

/**
 * Sleep for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a network/transient error that should be retried.
 */
function isNetworkError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const message = error.message.toLowerCase();
	return (
		message.includes('network') ||
		message.includes('timeout') ||
		message.includes('econnrefused') ||
		message.includes('econnreset') ||
		message.includes('socket')
	);
}
