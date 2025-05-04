"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapivisionOcr = void 0;
const tesseract_js_1 = require("tesseract.js");
const client_textract_1 = require("@aws-sdk/client-textract");
const axios_1 = __importDefault(require("axios"));
class CapivisionOcr {
    constructor() {
        this.description = {
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            const engine = this.getNodeParameter('engine', i);
            const imageFormat = this.getNodeParameter('imageFormat', i);
            const outputFormat = this.getNodeParameter('outputFormat', i);
            const layoutPreset = this.getNodeParameter('layoutPreset', i);
            let layout;
            try {
                layout = JSON.parse(layoutPreset);
            }
            catch (e) {
                layout = {};
            }
            let imageData;
            if (imageFormat === 'binary') {
                const binaryData = items[i].binary;
                if (!binaryData) {
                    throw new Error('Nenhum dado binário encontrado!');
                }
                const binaryProperty = Object.keys(binaryData)[0];
                const binaryDataEntry = binaryData[binaryProperty];
                imageData = Buffer.from(binaryDataEntry.data, 'base64');
            }
            else {
                const base64Field = this.getNodeParameter('base64Field', i);
                imageData = items[i].json[base64Field];
            }
            let result;
            switch (engine) {
                case 'tesseract':
                    const worker = await (0, tesseract_js_1.createWorker)();
                    await worker.loadLanguage('por');
                    await worker.initialize('por');
                    const { data } = await worker.recognize(imageData);
                    await worker.terminate();
                    result = data;
                    break;
                case 'ocrspace':
                    const credentials = await this.getCredentials('ocrSpaceApi');
                    const formData = new FormData();
                    formData.append('apikey', credentials.apiKey);
                    formData.append('language', 'por');
                    if (imageFormat === 'binary') {
                        formData.append('file', new Blob([imageData]));
                    }
                    else {
                        formData.append('base64Image', imageData);
                    }
                    const response = await axios_1.default.post('https://api.ocr.space/parse/image', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    result = response.data;
                    break;
                case 'textract':
                    const awsCredentials = await this.getCredentials('awsTextractApi');
                    const textract = new client_textract_1.TextractClient({
                        region: awsCredentials.region,
                        credentials: {
                            accessKeyId: awsCredentials.accessKeyId,
                            secretAccessKey: awsCredentials.secretAccessKey,
                        },
                    });
                    const command = new client_textract_1.DetectDocumentTextCommand({
                        Document: {
                            Bytes: Buffer.isBuffer(imageData) ? imageData : Buffer.from(imageData, 'base64'),
                        },
                    });
                    const textractResponse = await textract.send(command);
                    result = textractResponse;
                    break;
            }
            let outputData;
            switch (outputFormat) {
                case 'text':
                    outputData = this.extractText(result, engine);
                    break;
                case 'json':
                    outputData = this.extractJson(result, engine, layout);
                    break;
                case 'csv':
                    outputData = this.extractCsv(result, engine, layout);
                    break;
            }
            returnData.push({
                json: { data: outputData },
            });
        }
        return [returnData];
    }
    extractText(result, engine) {
        switch (engine) {
            case 'tesseract':
                return result.text;
            case 'ocrspace':
                return result.ParsedResults[0].ParsedText;
            case 'textract':
                return result.Blocks
                    .filter((block) => block.BlockType === 'LINE')
                    .map((block) => block.Text)
                    .join('\n');
            default:
                return '';
        }
    }
    extractJson(result, engine, layout) {
        const text = this.extractText(result, engine);
        if (Object.keys(layout).length === 0) {
            return { text };
        }
        const structuredData = {};
        for (const [field, coords] of Object.entries(layout)) {
            const { x, y, w, h } = coords;
            // Implementar lógica de extração por coordenadas
            structuredData[field] = `Valor extraído para ${field}`;
        }
        return structuredData;
    }
    extractCsv(result, engine, layout) {
        const jsonData = this.extractJson(result, engine, layout);
        if (Object.keys(layout).length === 0) {
            return jsonData.text;
        }
        const headers = Object.keys(jsonData);
        const values = Object.values(jsonData);
        return `${headers.join(',')}\n${values.join(',')}`;
    }
}
exports.CapivisionOcr = CapivisionOcr;
//# sourceMappingURL=CapivisionOcr.node.js.map