import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class KdriveApi implements ICredentialType {
	name = 'kdriveApi';
	displayName = 'Kdrive API';
	documentationUrl = 'https://developer.infomaniak.com/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
		},
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'hidden',
			default: 'https://api.infomaniak.com',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: 'https://api.infomaniak.com/2/profile',
			method: 'GET',
		},
	};
}
