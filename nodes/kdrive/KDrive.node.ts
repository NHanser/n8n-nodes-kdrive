import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { lookup } from 'mime-types';

export class KDrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'kDrive',
        name: 'kDrive',
        icon: 'file:Kdrive.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Manipulate files from remote Kdrive',
        defaults: {
            name: 'KDrive',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'kdriveApi',
                required: true,
            },
        ],
        requestDefaults: {
            baseURL: 'https://api.infomaniak.com/2',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        },

		properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Profile',
                        value: 'profile',
                    },
                    {
                        name: 'Drive',
                        value: 'drive',
                    },
                    {
                        name: 'File',
                        value: 'file',
                    },
                    {
                        name: 'Folder',
                        value: 'folder',
                    },
                ],
                default: 'profile',
            },

            // Operations pour Profile
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['profile'],
                    },
                },
                options: [
                    {
                        name: 'Get',
                        value: 'get',
                        description: 'Get user profile information',
                        action: 'Get user profile information',
                    },
                ],
                default: 'get',
            },

            // Operations pour Drive
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['drive'],
                    },
                },
                options: [
                    {
                        name: 'List',
                        value: 'list',
                        description: 'Get list of accessible drives',
                        action: 'List accessible drives',
                    },
                ],
                default: 'list',
            },

            // Operations pour File
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['file'],
                    },
                },
                options: [
                    {
                        name: 'Delete',
                        value: 'delete',
                        description: 'Delete a file',
                        action: 'Delete a file',
                    },
                    {
                        name: 'Download',
                        value: 'download',
                        description: 'Download a file',
                        action: 'Download a file',
                    },
                    {
                        name: 'Info',
                        value: 'info',
                        description: 'Get file/directory information',
                        action: 'Get file directory information',
                    },
                    {
                        name: 'List',
                        value: 'list',
                        description: 'List files in folder',
                        action: 'List files in folder',
                    },
                    {
                        name: 'Upload',
                        value: 'upload',
                        description: 'Upload a file',
                        action: 'Upload a file',
                    },
                ],
                default: 'list',
            },

            // Paramètres communs
            {
                displayName: 'Drive ID',
                name: 'driveId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['file', 'folder'],
                    },
                },
                description: 'ID of the drive',
            },

            // Paramètres pour Account ID (Drive)
            {
                displayName: 'Account ID',
                name: 'accountId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: {
                        resource: ['drive'],
                        operation: ['list'],
                    },
                },
                description: 'ID of the account (can be found in profile information)',
            },

            // Paramètres pour File Operations
            {
                displayName: 'File ID',
                name: 'fileId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['file'],
                        operation: ['download', 'delete', 'info'],
                    },
                },
                description: 'ID of the file',
            },
            // Paramètres pour File Operations
            {
                displayName: 'File Name',
                name: 'fileName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['file'],
                        operation: ['download'],
                    },
                },
                description: 'Name of the file',
            },

            {
                displayName: 'Parent Folder ID',
                name: 'parentFolderId',
                type: 'string',
                default: '1',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['file', 'folder'],
                        operation: ['upload', 'create', 'list'],
                    },
                },
                description: 'ID of the parent folder (1 for root)',
            },

            // Paramètres pour Upload
            {
                displayName: 'Binary Data',
                name: 'binaryData',
                type: 'boolean',
                default: true,
                displayOptions: {
                    show: {
                        operation: ['upload'],
                        resource: ['file'],
                    },
                },
                description: 'Whether the data to upload should be taken from binary field',
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['upload'],
                        resource: ['file'],
                        binaryData: [true],
                    },
                },
                description: 'Name of the binary property which contains the data for the file',
            },
            {
                displayName: 'File Name',
                name: 'fileName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['upload'],
                        resource: ['file'],
                        binaryData: [false],
                    },
                },
                description: 'Name of the file to upload',
            },
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('kdriveApi');

		for (let i = 0; i < items.length; i++) {
			try {
				// Profile Operations
				if (resource === 'profile') {
					if (operation === 'get') {
						const response = await this.helpers.httpRequest({
								method: 'GET',
								baseURL: credentials.apiUrl as string,
								url: '/2/profile',
								headers: {
									'Authorization': `Bearer ${credentials.accessToken}`,
									'Content-Type': 'application/json'
								},
						});

						returnData.push({ json: response });
					}
				}

				// Drive Operations
				else if (resource === 'drive') {
					if (operation === 'list') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						const response = await this.helpers.httpRequest({
								method: 'GET',
								baseURL: credentials.apiUrl as string,
								url: `/2/drive?account_id=${accountId}`,
								headers: {
									'Authorization': `Bearer ${credentials.accessToken}`,
									'Content-Type': 'application/json'
								},
						});

						returnData.push({ json: response });
					}
				}

				// File Operations
				else if (resource === 'file') {
					const driveId = this.getNodeParameter('driveId', i) as string;

					if (operation === 'upload') {
						const parentFolderId = this.getNodeParameter('parentFolderId', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						const fileName = items[i].binary![binaryPropertyName].fileName;
						const fileSize = Buffer.byteLength(binaryDataBuffer);
						const url = `/3/drive/${driveId}/upload?directory_id=${parentFolderId}&file_name=${fileName}&total_size=${fileSize}`;

						try {
							const response = await this.helpers.httpRequest({
								method: 'POST',
								baseURL: credentials.apiUrl as string,
								url,
								headers: {
									'Authorization': `Bearer ${credentials.accessToken}`,
									'Content-Type': 'application/octet-stream',
								},
								body: binaryDataBuffer,
								returnFullResponse: true, // Pour capturer tous les codes de statut
							});

							if (response.status === 404) {
								throw new NodeOperationError(this.getNode(), 'API Endpoint not found', {
									description: `Full URL: ${credentials.apiUrl}${url}\nDrive ID: ${driveId}\nDirectory ID: ${parentFolderId}\nFile Name: ${fileName}\nFile Size: ${fileSize}\nResponse: ${JSON.stringify(response.data)}`,
									runIndex: i,
								});
							}

                            if (response.status === 409) {
								throw new NodeOperationError(this.getNode(), 'File already exists', {
									description: `Full URL: ${credentials.apiUrl}${url}\nDrive ID: ${driveId}\nDirectory ID: ${parentFolderId}\nFile Name: ${fileName}\nFile Size: ${fileSize}\nResponse: ${JSON.stringify(response.data)}`,
									runIndex: i,
								});
							}

							returnData.push({ json: response });
						} catch (error) {
							throw new NodeOperationError(this.getNode(), `Upload failed: ${error.message}`, {
								description: `Full URL: ${credentials.apiUrl}${url}\nDrive ID: ${driveId}\nDirectory ID: ${parentFolderId}\nFile Name: ${fileName}\nFile Size: ${fileSize}\nResponse: ${error.response?.data ? JSON.stringify(error.response.data) : 'No response data'}`,
								runIndex: i,
							});
						}
					}

					else if (operation === 'download') {
						console.log('Starting download operation');
						const fileId = this.getNodeParameter('fileId', i) as string;
						const fileName = this.getNodeParameter('fileName', i) as string;
						
						// Déterminer le mimetype du fichier
						const mimeType = lookup(fileName) || 'application/octet-stream';

						const response = await this.helpers.httpRequest({
							method: 'GET',
							baseURL: credentials.apiUrl as string,
							url: `/2/drive/${driveId}/files/${fileId}/download`,
							encoding: 'arraybuffer',
							headers: {
								'Authorization': `Bearer ${credentials.accessToken}`,
							},
						});

						returnData.push({
							json: { fileId },
							binary: {
								data: {
									data: response.toString('base64'),
									mimeType,
									fileName,
								},
							},
						});
					}

					else if (operation === 'delete') {
						console.log('Starting delete operation');
						const fileId = this.getNodeParameter('fileId', i) as string;

						const response = await this.helpers.httpRequest({
							method: 'DELETE',
							baseURL: credentials.apiUrl as string,
							url: `/3/drive/${driveId}/files/${fileId}`,
							headers: {
								'Authorization': `Bearer ${credentials.accessToken}`,
								'Content-Type': 'application/json'
							},
						});

						returnData.push({ json: response });
					}

					else if (operation === 'list') {
						console.log('Starting list operation');
						const parentFolderId = this.getNodeParameter('parentFolderId', i, '1') as string;

						const response = await this.helpers.httpRequest({
							method: 'GET',
							baseURL: credentials.apiUrl as string,
							url: `/3/drive/${driveId}/files/${parentFolderId}/files?limit=1000`,
							headers: {
								'Authorization': `Bearer ${credentials.accessToken}`,
								'Content-Type': 'application/json'
							},
						});

						returnData.push({ json: response });
					}

					else if (operation === 'info') {
						console.log('Starting info operation');
						const fileId = this.getNodeParameter('fileId', i) as string;

						const response = await this.helpers.httpRequest({
							method: 'GET',
							baseURL: credentials.apiUrl as string,
							url: `/3/drive/${driveId}/files/${fileId}`,
							headers: {
								'Authorization': `Bearer ${credentials.accessToken}`,
								'Content-Type': 'application/json'
							},
						});

						returnData.push({ json: response });
					}
				}

				else if (resource === 'folder') {
					if (operation === 'create') {
						const parentFolderId = this.getNodeParameter('parentFolderId', i) as string;

						const response = await this.helpers.httpRequest({
							method: 'POST',
							baseURL: credentials.apiUrl as string,
							url: `/2/drive/folders/${parentFolderId}/folders`,
							headers: {
								'Authorization': `Bearer ${credentials.accessToken}`,
							},
						});

						returnData.push({ json: response });
					}

					else if (operation === 'delete') {
						const folderId = this.getNodeParameter('folderId', i) as string;

						const response = await this.helpers.httpRequest({
							method: 'DELETE',
							baseURL: credentials.apiUrl as string,
							url: `/2/drive/folders/${folderId}`,
							headers: {
								'Authorization': `Bearer ${credentials.accessToken}`,
							},
						});

						returnData.push({ json: response });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}