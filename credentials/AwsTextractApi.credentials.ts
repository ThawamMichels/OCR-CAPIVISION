import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AwsTextractApi implements ICredentialType {
	name = 'awsTextractApi';
	displayName = 'AWS Textract API';
	documentationUrl = 'https://docs.aws.amazon.com/textract/';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'AWS Access Key ID',
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'AWS Secret Access Key',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'string',
			default: 'us-east-1',
			required: true,
			description: 'AWS Region',
		},
	];
} 