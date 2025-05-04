"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsTextractApi = void 0;
class AwsTextractApi {
    constructor() {
        this.name = 'awsTextractApi';
        this.displayName = 'AWS Textract API';
        this.documentationUrl = 'https://docs.aws.amazon.com/textract/';
        this.properties = [
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
}
exports.AwsTextractApi = AwsTextractApi;
//# sourceMappingURL=AwsTextractApi.credentials.js.map