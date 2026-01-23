/**
 * Okta Assign User to Group Action
 *
 * Assigns an Okta user to a group, granting them the permissions and access
 * associated with that group membership.
 */

import { getBaseURL, getAuthorizationHeader } from '@sgnl-actions/utils';

/**
 * Helper function to perform user group assignment
 * @private
 */
async function assignUserToGroup(userId, groupId, baseUrl, authHeader) {
  // Safely encode IDs to prevent injection
  const encodedUserId = encodeURIComponent(userId);
  const encodedGroupId = encodeURIComponent(groupId);

  // Build URL using base URL (already cleaned by getBaseUrl)
  const url = `${baseUrl}/api/v1/groups/${encodedGroupId}/users/${encodedUserId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  return response;
}


export default {
  /**
   * Main execution handler - assigns the user to the specified group
   * @param {Object} params - Job input parameters
   * @param {string} params.userId - The Okta user ID
   * @param {string} params.groupId - The Okta group ID
   * @param {string} params.address - Full URL to Okta API (defaults to ADDRESS environment variable)
   *
   * @param {Object} context - Execution context with secrets and environment
   * @param {string} context.environment.ADDRESS - Okta API base URL
   *
   * The configured auth type will determine which of the following environment variables and secrets are available
   * @param {string} context.secrets.BEARER_AUTH_TOKEN
   *
   * @param {string} context.secrets.BASIC_USERNAME
   * @param {string} context.secrets.BASIC_PASSWORD
   *
   * @param {string} context.secrets.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_AUDIENCE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_SCOPE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL
   *
   * @param {string} context.secrets.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN
   *
   * @returns {Object} Job results
   */
  invoke: async (params, context) => {
    const { userId, groupId } = params;

    console.log(`Starting Okta user group assignment: user ${userId} to group ${groupId}`);

    // Get base URL using utility function
    const baseUrl = getBaseURL(params, context);

    // Get authorization header
    let authHeader = await getAuthorizationHeader(context);

    // Handle Okta's SSWS token format - only for Bearer token auth mode
    if (context.secrets.BEARER_AUTH_TOKEN && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      authHeader = token.startsWith('SSWS ') ? token : `SSWS ${token}`;
    }

    // Make the API request to assign user to group
    const response = await assignUserToGroup(
      userId,
      groupId,
      baseUrl,
      authHeader
    );

    // Handle the response
    if (response.ok) {
      // 204 No Content is the expected success response
      console.log(`Successfully assigned user ${userId} to group ${groupId}`);

      return {
        userId: userId,
        groupId: groupId,
        assigned: true,
        address: baseUrl,
        assignedAt: new Date().toISOString()
      };
    }

    // Handle error responses
    const statusCode = response.status;
    let errorMessage = `Failed to assign user to group: HTTP ${statusCode}`;

    try {
      const errorBody = await response.json();
      if (errorBody.errorSummary) {
        errorMessage = `Failed to assign user to group: ${errorBody.errorSummary}`;
      }
      console.error('Okta API error response:', errorBody);
    } catch {
      // Response might not be JSON
      console.error('Failed to parse error response');
    }

    // Throw error with status code for proper error handling
    const error = new Error(errorMessage);
    error.statusCode = statusCode;
    throw error;
  },

  /**
   * Error recovery handler - framework handles retries by default
   * Only implement if custom recovery logic is needed
   * @param {Object} params - Original params plus error information
   * @param {Object} context - Execution context
   * @returns {Object} Recovery results
   */
  error: async (params, _context) => {
    const { error, userId, groupId } = params;
    console.error(`User group assignment failed for user ${userId} to group ${groupId}: ${error.message}`);

    // Framework handles retries for transient errors (429, 502, 503, 504)
    // Just re-throw the error to let the framework handle it
    throw error;
  },

  /**
   * Graceful shutdown handler - cleanup when job is halted
   * @param {Object} params - Original params plus halt reason
   * @param {Object} context - Execution context
   * @returns {Object} Cleanup results
   */
  halt: async (params, _context) => {
    const { reason, userId, groupId } = params;
    console.log(`User group assignment job is being halted (${reason}) for user ${userId} to group ${groupId}`);

    // No cleanup needed for this simple operation
    // The PUT request either completed or didn't

    return {
      userId: userId || 'unknown',
      groupId: groupId || 'unknown',
      reason: reason,
      haltedAt: new Date().toISOString(),
      cleanupCompleted: true
    };
  }
};