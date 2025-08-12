/**
 * Okta Assign User to Group Action
 *
 * Assigns an Okta user to a group, granting them the permissions and access
 * associated with that group membership.
 */

/**
 * Helper function to perform user group assignment
 * @private
 */
async function assignUserToGroup(userId, groupId, oktaDomain, authToken) {
  // Safely encode IDs to prevent injection
  const encodedUserId = encodeURIComponent(userId);
  const encodedGroupId = encodeURIComponent(groupId);
  const url = new URL(`/api/v1/groups/${encodedGroupId}/users/${encodedUserId}`, `https://${oktaDomain}`);

  const authHeader = authToken.startsWith('SSWS ') ? authToken : `SSWS ${authToken}`;

  const response = await fetch(url.toString(), {
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
   * @param {string} params.oktaDomain - The Okta domain (e.g., example.okta.com)
   * @param {Object} context - Execution context with env, secrets, outputs
   * @returns {Object} Job results
   */
  invoke: async (params, context) => {
    const { userId, groupId, oktaDomain } = params;

    console.log(`Starting Okta user group assignment: user ${userId} to group ${groupId}`);

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid or missing userId parameter');
    }
    if (!groupId || typeof groupId !== 'string') {
      throw new Error('Invalid or missing groupId parameter');
    }
    if (!oktaDomain || typeof oktaDomain !== 'string') {
      throw new Error('Invalid or missing oktaDomain parameter');
    }

    // Validate Okta API token is present
    if (!context.secrets?.OKTA_API_TOKEN) {
      throw new Error('Missing required secret: OKTA_API_TOKEN');
    }

    // Make the API request to assign user to group
    const response = await assignUserToGroup(
      userId,
      groupId,
      oktaDomain,
      context.secrets.OKTA_API_TOKEN
    );

    // Handle the response
    if (response.ok) {
      // 204 No Content is the expected success response
      console.log(`Successfully assigned user ${userId} to group ${groupId}`);

      return {
        userId: userId,
        groupId: groupId,
        assigned: true,
        oktaDomain: oktaDomain,
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