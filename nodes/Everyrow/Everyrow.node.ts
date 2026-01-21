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
			// Common fields
			{
				displayName: 'Session Name',
				name: 'sessionName',
				type: 'string',
				default: 'n8n-everyrow-session',
				description: 'Name for the Everyrow session (visible in the Everyrow dashboard)',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Poll Interval (Ms)',
						name: 'pollInterval',
						type: 'number',
						default: 2000,
						description: 'How often to check task status (in milliseconds)',
					},
					{
						displayName: 'Max Wait Time (Ms)',
						name: 'maxWaitTime',
						type: 'number',
						default: 600000,
						description: 'Maximum time to wait for task completion (in milliseconds)',
					},
				],
			},
			// Operation-specific fields
			...rankOperationFields,
			...dedupeOperationFields,
			...screenOperationFields,
			...mergeOperationFields,
			...agentMapOperationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const sessionName = this.getNodeParameter('sessionName', 0) as string;
		const options = this.getNodeParameter('options', 0) as IDataObject;

		const pollInterval = (options.pollInterval as number) || 2000;
		const maxWaitTime = (options.maxWaitTime as number) || 600000;

		// Convert input items to plain objects
		const inputData = items.map((item) => item.json);

		let resultData: IDataObject[];

		if (resource === 'dataOperations') {
			switch (operation) {
				case 'rank':
					resultData = await executeRankOperation.call(
						this,
						inputData,
						sessionName,
						pollInterval,
						maxWaitTime,
					);
					break;
				case 'dedupe':
					resultData = await executeDedupeOperation.call(
						this,
						inputData,
						sessionName,
						pollInterval,
						maxWaitTime,
					);
					break;
				case 'screen':
					resultData = await executeScreenOperation.call(
						this,
						inputData,
						sessionName,
						pollInterval,
						maxWaitTime,
					);
					break;
				case 'merge':
					resultData = await executeMergeOperation.call(
						this,
						inputData,
						sessionName,
						pollInterval,
						maxWaitTime,
					);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `Unknown data operation: ${operation}`);
			}
		} else if (resource === 'agentOperations') {
			switch (operation) {
				case 'agentMap':
					resultData = await executeAgentMapOperation.call(
						this,
						inputData,
						sessionName,
						pollInterval,
						maxWaitTime,
					);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `Unknown agent operation: ${operation}`);
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
