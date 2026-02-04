import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { rankOperationFields, executeRankOperation } from './operations/rank.operation';
import { dedupeOperationFields, executeDedupeOperation } from './operations/dedupe.operation';
import { screenOperationFields, executeScreenOperation } from './operations/screen.operation';
import { mergeOperationFields, executeMergeOperation } from './operations/merge.operation';
import { agentMapOperationFields, executeAgentMapOperation } from './operations/agentMap.operation';
import {
	taskOperationFields,
	executeGetStatusOperation,
	executeGetResultOperation,
} from './operations/task.operation';

export class Everyrow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Everyrow',
		name: 'everyrow',
		icon: 'file:everyrow.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'AI-powered data operations: rank, dedupe, merge, screen, and agent workflows',
		defaults: {
			name: 'Everyrow',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'everyrowApi',
				required: true,
			},
		],
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Data Operation',
						value: 'dataOperations',
						description: 'Operations for transforming and cleaning data',
					},
					{
						name: 'Agent Operation',
						value: 'agentOperations',
						description: 'AI agent operations for research and analysis',
					},
					{
						name: 'Task',
						value: 'task',
						description: 'Check status or get results of a submitted task',
					},
				],
				default: 'dataOperations',
			},
			// Data Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['dataOperations'],
					},
				},
				options: [
					{
						name: 'Rank',
						value: 'rank',
						description: 'Score and rank rows based on criteria',
						action: 'Rank rows based on criteria',
					},
					{
						name: 'Dedupe',
						value: 'dedupe',
						description: 'Remove duplicate rows using AI matching',
						action: 'Remove duplicate rows',
					},
					{
						name: 'Screen',
						value: 'screen',
						description: 'Filter rows based on criteria',
						action: 'Filter rows based on criteria',
					},
					{
						name: 'Merge',
						value: 'merge',
						description: 'Join two tables using AI matching',
						action: 'Merge two tables',
					},
				],
				default: 'rank',
			},
			// Agent Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['agentOperations'],
					},
				},
				options: [
					{
						name: 'Agent Map',
						value: 'agentMap',
						description: 'Run an AI agent on each row to research and enrich data',
						action: 'Run AI agent on each row',
					},
				],
				default: 'agentMap',
			},
			// Task Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['task'],
					},
				},
				options: [
					{
						name: 'Get Status',
						value: 'getStatus',
						description: 'Check the status of a submitted task',
						action: 'Get task status',
					},
					{
						name: 'Get Result',
						value: 'getResult',
						description: 'Get the result data of a completed task',
						action: 'Get task result',
					},
				],
				default: 'getStatus',
			},
			// Common fields for data/agent operations
			{
				displayName: 'Session Name',
				name: 'sessionName',
				type: 'string',
				default: 'n8n-everyrow-session',
				description: 'Name for the Everyrow session (visible in the Everyrow dashboard)',
				displayOptions: {
					show: {
						resource: ['dataOperations', 'agentOperations'],
					},
				},
			},
			// Operation-specific fields
			...rankOperationFields,
			...dedupeOperationFields,
			...screenOperationFields,
			...mergeOperationFields,
			...agentMapOperationFields,
			...taskOperationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let resultData: IDataObject[];

		if (resource === 'dataOperations') {
			const sessionName = this.getNodeParameter('sessionName', 0) as string;
			const inputData = items.map((item) => item.json);

			switch (operation) {
				case 'rank':
					resultData = await executeRankOperation.call(this, inputData, sessionName);
					break;
				case 'dedupe':
					resultData = await executeDedupeOperation.call(this, inputData, sessionName);
					break;
				case 'screen':
					resultData = await executeScreenOperation.call(this, inputData, sessionName);
					break;
				case 'merge':
					resultData = await executeMergeOperation.call(this, inputData, sessionName);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `Unknown data operation: ${operation}`);
			}
		} else if (resource === 'agentOperations') {
			const sessionName = this.getNodeParameter('sessionName', 0) as string;
			const inputData = items.map((item) => item.json);

			switch (operation) {
				case 'agentMap':
					resultData = await executeAgentMapOperation.call(this, inputData, sessionName);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `Unknown agent operation: ${operation}`);
			}
		} else if (resource === 'task') {
			switch (operation) {
				case 'getStatus':
					resultData = await executeGetStatusOperation.call(this);
					break;
				case 'getResult':
					resultData = await executeGetResultOperation.call(this);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `Unknown task operation: ${operation}`);
			}
		} else {
			throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
		}

		// Convert results back to n8n format
		const returnData: INodeExecutionData[] = resultData.map((data) => ({
			json: data,
		}));

		return [returnData];
	}
}
