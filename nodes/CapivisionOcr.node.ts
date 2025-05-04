import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IBinaryData,
} from 'n8n-workflow';
import { createWorker } from 'tesseract.js';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import axios from 'axios';

class OcrExtractor {
	async extractText(result: any, engine: string): Promise<string> {
		switch (engine) {
			case 'tesseract':
				return result.text;
			case 'ocrspace':
				return result.ParsedResults[0].ParsedText;
			case 'textract':
				return result.Blocks
					.filter((block: any) => block.BlockType === 'LINE')
					.map((block: any) => block.Text)
					.join('\n');
			default:
				return '';
		}
	}

	async extractJson(result: any, engine: string, layout: any): Promise<any> {
		const text = await this.extractText(result, engine);
		if (Object.keys(layout).length === 0) {
			return { text };
		}

		const structuredData: any = {};
		for (const [field, coords] of Object.entries(layout)) {
			const { x, y, w, h } = coords as any;
			// Implementar lógica de extração por coordenadas
			structuredData[field] = `Valor extraído para ${field}`;
		}
		return structuredData;
	}

	async extractCsv(result: any, engine: string, layout: any): Promise<string> {
		const jsonData = await this.extractJson(result, engine, layout);
		if (Object.keys(layout).length === 0) {
			return jsonData.text;
		}

		const headers = Object.keys(jsonData);
		const values = Object.values(jsonData);
		return `${headers.join(',')}\n${values.join(',')}`;
	}
}

export class CapivisionOcr implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CAPIVISION OCR',
		name: 'capivisionOcr',
		icon: 'file:capivision.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'OCR multiengine com visão apurada de capivara',
		defaults: {
			name: 'CAPIVISION OCR',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ocrSpaceApi',
				required: false,
			},
			{
				name: 'awsTextractApi',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Mecanismo OCR',
				name: 'engine',
				type: 'options',
				options: [
					{
						name: 'Tesseract.js',
						value: 'tesseract',
					},
					{
						name: 'OCR.space',
						value: 'ocrspace',
					},
					{
						name: 'AWS Textract',
						value: 'textract',
					},
				],
				default: 'tesseract',
				required: true,
			},
			{
				displayName: 'Formato da Imagem',
				name: 'imageFormat',
				type: 'options',
				options: [
					{
						name: 'Binário',
						value: 'binary',
					},
					{
						name: 'Base64',
						value: 'base64',
					},
				],
				default: 'binary',
				required: true,
			},
			{
				displayName: 'Campo Base64',
				name: 'base64Field',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						imageFormat: ['base64'],
					},
				},
				description: 'Nome do campo que contém a imagem em Base64',
			},
			{
				displayName: 'Formato de Saída',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'Texto Puro',
						value: 'text',
					},
					{
						name: 'JSON Estruturado',
						value: 'json',
					},
					{
						name: 'CSV',
						value: 'csv',
					},
				],
				default: 'text',
				required: true,
			},
			{
				displayName: 'Preset de Layout (opcional)',
				name: 'layoutPreset',
				type: 'json',
				default: '{}',
				required: false,
				description: 'JSON com estrutura de coordenadas para extração',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const extractor = new OcrExtractor();

		for (let i = 0; i < items.length; i++) {
			const engine = this.getNodeParameter('engine', i) as string;
			const imageFormat = this.getNodeParameter('imageFormat', i) as string;
			const outputFormat = this.getNodeParameter('outputFormat', i) as string;
			const layoutPreset = this.getNodeParameter('layoutPreset', i) as string;
			let layout;
			try {
				layout = JSON.parse(layoutPreset);
			} catch (e) {
				layout = {};
			}

			let imageData: string | Buffer;
			if (imageFormat === 'binary') {
				const binaryData = items[i].binary;
				if (!binaryData) {
					throw new Error('Nenhum dado binário encontrado!');
				}
				const binaryProperty = Object.keys(binaryData)[0];
				const binaryDataEntry = binaryData[binaryProperty] as IBinaryData;
				imageData = Buffer.from(binaryDataEntry.data, 'base64');
			} else {
				const base64Field = this.getNodeParameter('base64Field', i) as string;
				imageData = items[i].json[base64Field] as string;
			}

			let result: any;

			switch (engine) {
				case 'tesseract':
					const worker = await createWorker();
					await worker.loadLanguage('por');
					await worker.initialize('por');
					const { data } = await worker.recognize(imageData);
					await worker.terminate();
					result = data;
					break;

				case 'ocrspace':
					const credentials = await this.getCredentials('ocrSpaceApi');
					const formData = new FormData();
					formData.append('apikey', credentials.apiKey as string);
					formData.append('language', 'por');
					if (imageFormat === 'binary') {
						formData.append('file', new Blob([imageData as Buffer]));
					} else {
						formData.append('base64Image', imageData as string);
					}
					const response = await axios.post('https://api.ocr.space/parse/image', formData, {
						headers: { 'Content-Type': 'multipart/form-data' },
					});
					result = response.data;
					break;

				case 'textract':
					const awsCredentials = await this.getCredentials('awsTextractApi');
					const textract = new TextractClient({
						region: awsCredentials.region as string,
						credentials: {
							accessKeyId: awsCredentials.accessKeyId as string,
							secretAccessKey: awsCredentials.secretAccessKey as string,
						},
					});
					const command = new DetectDocumentTextCommand({
						Document: {
							Bytes: Buffer.isBuffer(imageData) ? imageData : Buffer.from(imageData, 'base64'),
						},
					});
					const textractResponse = await textract.send(command);
					result = textractResponse;
					break;
			}

			let outputData: any;
			switch (outputFormat) {
				case 'text':
					outputData = await extractor.extractText(result, engine);
					break;
				case 'json':
					outputData = await extractor.extractJson(result, engine, layout);
					break;
				case 'csv':
					outputData = await extractor.extractCsv(result, engine, layout);
					break;
			}

			returnData.push({
				json: { data: outputData },
			});
		}

		return [returnData];
	}
} 