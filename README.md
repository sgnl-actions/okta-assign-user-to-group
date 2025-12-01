# Okta Assign User to Group Action

Assign an Okta user to a group, granting them the permissions and access associated with that group membership.

## Overview

This SGNL action integrates with Okta to add a user to a specified group. When executed, the user will receive all permissions and access associated with the group.

## Prerequisites

- Okta instance
- API authentication credentials (supports 4 auth methods - see Configuration below)
- Okta API access with permissions to manage group membership

## Configuration

### Authentication

This action supports four authentication methods. Configure one of the following:

#### Option 1: Bearer Token (Okta API Token)
| Secret | Description |
|--------|-------------|
| `BEARER_AUTH_TOKEN` | Okta API token (SSWS format) |

#### Option 2: Basic Authentication
| Secret | Description |
|--------|-------------|
| `BASIC_USERNAME` | Username for Okta authentication |
| `BASIC_PASSWORD` | Password for Okta authentication |

#### Option 3: OAuth2 Client Credentials
| Secret/Environment | Description |
|-------------------|-------------|
| `OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET` | OAuth2 client secret |
| `OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID` | OAuth2 client ID |
| `OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL` | OAuth2 token endpoint URL |
| `OAUTH2_CLIENT_CREDENTIALS_SCOPE` | OAuth2 scope (optional) |
| `OAUTH2_CLIENT_CREDENTIALS_AUDIENCE` | OAuth2 audience (optional) |
| `OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE` | OAuth2 auth style (optional) |

#### Option 4: OAuth2 Authorization Code
| Secret | Description |
|--------|-------------|
| `OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN` | OAuth2 access token |

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADDRESS` | Okta API base URL | `https://dev-12345.okta.com` |

### Input Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `userId` | string | Yes | The Okta user ID | `00u1234567890abcdef` |
| `groupId` | string | Yes | The Okta group ID | `00g9876543210fedcba` |

### Output Structure

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | The user ID that was assigned |
| `groupId` | string | The group ID the user was assigned to |
| `assigned` | boolean | Whether the assignment was successful |
| `address` | string | The Okta API base URL used |
| `assignedAt` | datetime | When the operation completed (ISO 8601) |

## Usage Example

### Job Request

```json
{
  "id": "assign-user-to-group-001",
  "type": "nodejs-22",
  "script": {
    "repository": "github.com/sgnl-actions/okta-assign-user-to-group",
    "version": "v1.0.0",
    "type": "nodejs"
  },
  "script_inputs": {
    "userId": "00u1234567890abcdef",
    "groupId": "00g9876543210fedcba"
  },
  "environment": {
    "ADDRESS": "https://dev-12345.okta.com",
    "LOG_LEVEL": "info"
  }
}
```

### Successful Response

```json
{
  "userId": "00u1234567890abcdef",
  "groupId": "00g9876543210fedcba",
  "assigned": true,
  "address": "https://dev-12345.okta.com",
  "assignedAt": "2024-01-15T10:30:00Z"
}
```

## How It Works

The action performs a PUT request to the Okta API to assign the user to the group:

1. **Validate Input**: Ensures userId and groupId parameters are provided
2. **Authenticate**: Uses configured authentication method to get authorization
3. **Assign User**: Makes PUT request to `/api/v1/groups/{groupId}/users/{userId}`
4. **Return Result**: Confirms user was assigned to group

## Error Handling

The action includes error handling for common scenarios:

### HTTP Status Codes
- **204 No Content**: Successful assignment (expected response)
- **400 Bad Request**: Invalid user ID or group ID format
- **401 Unauthorized**: Invalid authentication credentials
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: User or group not found
- **429 Rate Limit**: Too many requests

## Development

### Local Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Test locally with mock data
npm run dev

# Build for production
npm run build
```

### Running Tests

The action includes comprehensive unit tests covering:
- Input validation (userId, groupId parameters)
- Authentication handling (all 4 auth methods)
- Success scenarios
- Error handling (API errors, missing credentials)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Check test coverage
npm run test:coverage
```

## Security Considerations

- **Credential Protection**: Never log or expose authentication credentials
- **Group Permissions**: Adding a user to a group grants all associated permissions
- **Audit Logging**: All operations are logged with timestamps
- **Input Validation**: User and group IDs are validated and URL-encoded

## Okta API Reference

This action uses the following Okta API endpoint:
- [Add User to Group](https://developer.okta.com/docs/reference/api/groups/#add-user-to-group) - PUT `/api/v1/groups/{groupId}/users/{userId}`

## Troubleshooting

### Common Issues

1. **"Invalid or missing userId parameter"**
   - Ensure the `userId` parameter is provided and is a non-empty string
   - Verify the user ID exists in your Okta instance

2. **"Invalid or missing groupId parameter"**
   - Ensure the `groupId` parameter is provided and is a non-empty string
   - Verify the group ID exists in your Okta instance

3. **"No authentication configured"**
   - Ensure you have configured one of the four supported authentication methods
   - Check that the required secrets/environment variables are set

4. **"Failed to assign user to group: HTTP 404"**
   - Verify both the user ID and group ID are correct
   - Check that both resources exist in Okta

5. **"Failed to assign user to group: HTTP 403"**
   - Ensure your API credentials have permission to manage group membership
   - Check Okta admin console for required permissions

## Version History

### v1.0.0
- Initial release
- Support for assigning users to groups via Okta API
- Four authentication methods (Bearer, Basic, OAuth2 Client Credentials, OAuth2 Authorization Code)
- Integration with @sgnl-actions/utils package
- Comprehensive error handling

## License

MIT

## Support

For issues or questions, please contact SGNL Engineering or create an issue in this repository.
