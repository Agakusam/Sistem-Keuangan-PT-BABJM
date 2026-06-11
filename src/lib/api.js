/**
 * Map GAS actions to Next.js API Routes
 * @param {string} action - The action parameter
 * @param {Object} params - Additional parameters
 */
export async function fetchFromGas(action, params = {}) {
  let endpoint = '';
  let urlParams = new URLSearchParams();

  switch (action) {
    case 'getDashboard':
      endpoint = 'dashboard';
      break;
    case 'listCash':
      endpoint = 'transactions';
      if (params.dari) urlParams.append('dari', params.dari);
      if (params.sampai) urlParams.append('sampai', params.sampai);
      break;
    case 'listBon':
      endpoint = 'bon';
      if (params.status) urlParams.append('status', params.status);
      break;
    case 'rekapCash':
    case 'rekapBon':
    case 'getSaldo':
      // Map to dashboard for simple data fetching if needed,
      // or implement dedicated routes. We'll reuse dashboard for now
      // since it returns saldo, bon count, etc.
      endpoint = 'dashboard'; 
      break;
    default:
      console.warn('Unknown action:', action);
      return { success: false, error: 'Unknown action' };
  }

  try {
    const url = `/api/${endpoint}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (response.status === 401) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      return { success: false, error: 'Unauthorized' };
    }
    
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
 * Post data to Next.js API Routes
 * @param {string} action - The action parameter
 * @param {Object} body - Request body
 */
export async function postToGas(action, body = {}) {
  let endpoint = '';
  let method = 'POST';

  switch (action) {
    case 'addCash':
      endpoint = 'transactions';
      break;
    case 'addBon':
      endpoint = 'bon';
      break;
    case 'settleBon':
      endpoint = `bon/${body.id_bon}`;
      method = 'PUT';
      break;
    case 'deleteBon':
      endpoint = `bon/${body.id_bon}`;
      method = 'DELETE';
      break;
    default:
      console.warn('Unknown POST action:', action);
      return { success: false, error: 'Unknown action' };
  }

  try {
    const response = await fetch(`/api/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'DELETE' ? JSON.stringify(body) : undefined
    });
    
    if (response.status === 401) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      return { success: false, error: 'Unauthorized' };
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API POST Error (${action}):`, error);
    return { success: false, error: error.message };
  }
}
