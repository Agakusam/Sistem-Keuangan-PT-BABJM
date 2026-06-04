const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

/**
 * Fetch data from Google Apps Script Web App
 * @param {string} action - The action parameter
 * @param {Object} params - Additional query parameters
 */
export async function fetchFromGas(action, params = {}) {
  if (!GAS_URL) {
    console.error('NEXT_PUBLIC_GAS_URL is not set!');
    return { success: false, error: 'API URL not configured' };
  }

  try {
    const url = new URL(GAS_URL);
    url.searchParams.append('action', action);
    url.searchParams.append('api_key', API_KEY);
    
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    
    // Add cache-busting timestamp to prevent browser/CDN caching
    url.searchParams.append('_t', Date.now().toString());

    const response = await fetch(url.toString(), {
      cache: 'no-store' // Ensure we get fresh data
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Post data to Google Apps Script Web App
 * @param {string} action - The action parameter
 * @param {Object} body - Request body
 */
export async function postToGas(action, body = {}) {
  if (!GAS_URL) {
    console.error('NEXT_PUBLIC_GAS_URL is not set!');
    return { success: false, error: 'API URL not configured' };
  }

  try {
    const payload = {
      action,
      api_key: API_KEY,
      ...body
    };

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // GAS requires plain text to avoid CORS preflight sometimes, but JSON parsing will handle it
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API POST Error (${action}):`, error);
    return { success: false, error: error.message };
  }
}
