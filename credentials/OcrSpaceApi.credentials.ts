import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OcrSpaceApi implements ICredentialType {
	name = 'ocrSpaceApi';
	displayName = 'OCR.space API';
	documentationUrl = 'https://ocr.space/ocrapi';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'API Key do serviço OCR.space',
		},
	];
} 