"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrSpaceApi = void 0;
class OcrSpaceApi {
    constructor() {
        this.name = 'ocrSpaceApi';
        this.displayName = 'OCR.space API';
        this.documentationUrl = 'https://ocr.space/ocrapi';
        this.properties = [
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
}
exports.OcrSpaceApi = OcrSpaceApi;
//# sourceMappingURL=OcrSpaceApi.credentials.js.map