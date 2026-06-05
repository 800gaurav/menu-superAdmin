const API_BASE = 'http://localhost:5000/api';

// Token Management
export const getSuperAdminToken = () => localStorage.getItem('superadmin_token');
export const setSuperAdminToken = (token) => localStorage.setItem('superadmin_token', token);
export const removeSuperAdminToken = () => localStorage.removeItem('superadmin_token');

export const getRestaurantToken = () => localStorage.getItem('restaurant_token');
export const setRestaurantToken = (token) => localStorage.setItem('restaurant_token', token);
export const removeRestaurantToken = () => {
  localStorage.removeItem('restaurant_token');
  localStorage.removeItem('restaurant_id');
  localStorage.removeItem('restaurant_slug');
};

const getHeaders = (role = 'restaurant') => {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = role === 'superadmin' ? getSuperAdminToken() : getRestaurantToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Generic fetch wrapper
const apiFetch = async (endpoint, options = {}, role = 'restaurant') => {
  const url = `${API_BASE}${endpoint}`;
  const headers = getHeaders(role);
  
  // Clean header if uploading formData
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Something went wrong');
    err.status = response.status;
    throw err;
  }
  return data;
};

export const api = {
  // Authentication
  auth: {
    superAdminLogin: (email, password) => 
      apiFetch('/auth/superadmin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }, 'superadmin'),
    restaurantLogin: (username, password) =>
      apiFetch('/auth/restaurant/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
  },

  // Super Admin Endpoints
  superAdmin: {
    getDashboard: () => apiFetch('/superadmin/dashboard', {}, 'superadmin'),
    getRestaurants: () => apiFetch('/superadmin/restaurants', {}, 'superadmin'),
    createRestaurant: (data) => apiFetch('/superadmin/restaurants', {
      method: 'POST',
      body: JSON.stringify(data)
    }, 'superadmin'),
    getRestaurant: (id) => apiFetch(`/superadmin/restaurants/${id}`, {}, 'superadmin'),
    updateRestaurant: (id, data) => apiFetch(`/superadmin/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, 'superadmin'),
    toggleActive: (id) => apiFetch(`/superadmin/restaurants/${id}/toggle-active`, {
      method: 'PATCH'
    }, 'superadmin'),
    updatePlan: (id, data) => apiFetch(`/superadmin/restaurants/${id}/plan`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }, 'superadmin'),
    updateFeatures: (id, data) => apiFetch(`/superadmin/restaurants/${id}/features`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }, 'superadmin'),
    getRestaurantOrders: (id, filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return apiFetch(`/superadmin/restaurants/${id}/orders?${params}`, {}, 'superadmin');
    },
    impersonate: (restaurantId) => apiFetch(`/superadmin/impersonate/${restaurantId}`, {
      method: 'POST'
    }, 'superadmin')
  },

  // Restaurant Admin Profile & Branding
  restaurant: {
    getProfile: () => apiFetch('/restaurant/profile'),
    updateProfile: (data) => apiFetch('/restaurant/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    updateBranding: (data) => apiFetch('/restaurant/branding', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    completeWizard: () => apiFetch('/restaurant/wizard/complete', {
      method: 'POST'
    }),
    getStats: () => apiFetch('/restaurant/dashboard/stats'),
    
    // File upload
    uploadLogo: (formData) => apiFetch('/restaurant/upload-logo', {
      method: 'POST',
      body: formData
    }),
    uploadImage: (formData) => apiFetch('/restaurant/upload-image', {
      method: 'POST',
      body: formData
    }),
    updateCustomerLoginSettings: (data) => apiFetch('/restaurant/customer-login-settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    updateCustomerDataSettings: (data) => apiFetch('/restaurant/customer-data-settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    updateActionButtons: (actionButtons) => apiFetch('/restaurant/action-buttons', {
      method: 'PUT',
      body: JSON.stringify({ actionButtons })
    }),
    generateQR: (data) => apiFetch('/restaurant/generate-qr', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // Categories & Menu Items
  menu: {
    // Categories
    getCategories: () => apiFetch('/menu/categories'),
    createCategory: (data) => apiFetch('/menu/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateCategory: (id, data) => apiFetch(`/menu/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    reorderCategories: (orderList) => apiFetch('/menu/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderList })
    }),
    deleteCategory: (id) => apiFetch(`/menu/categories/${id}`, {
      method: 'DELETE'
    }),

    // Items
    getItems: () => apiFetch('/menu/items'),
    createItem: (data) => apiFetch('/menu/items', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateItem: (id, data) => apiFetch(`/menu/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    toggleStock: (id) => apiFetch(`/menu/items/${id}/toggle-stock`, {
      method: 'PATCH'
    }),
    duplicateItem: (id) => apiFetch(`/menu/items/${id}/duplicate`, {
      method: 'POST'
    }),
    bulkPriceUpdate: (itemIds, updateType, value) => apiFetch('/menu/items/bulk-price-update', {
      method: 'POST',
      body: JSON.stringify({ itemIds, updateType, value })
    }),
    deleteItem: (id) => apiFetch(`/menu/items/${id}`, {
      method: 'DELETE'
    })
  },

  // Tables / Rooms
  tables: {
    getTables: () => apiFetch('/tables'),
    createTable: (data) => apiFetch('/tables', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    updateTable: (id, data) => apiFetch(`/tables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    bulkQR: (targets) => apiFetch('/tables/bulk-qr', {
      method: 'POST',
      body: JSON.stringify({ targets })
    }),
    downloadZipUrl: () => `${API_BASE}/tables/download-zip?token=${encodeURIComponent(getRestaurantToken() || '')}`,
    deleteTable: (id) => apiFetch(`/tables/${id}`, {
      method: 'DELETE'
    })
  },

  // Orders
  orders: {
    getOrders: (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return apiFetch(`/orders?${params}`);
    },
    getOrder: (id) => apiFetch(`/orders/${id}`),
    updateStatus: (id, status) => apiFetch(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
    updatePriority: (id, priority) => apiFetch(`/orders/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority })
    }),
    requestBill: (id) => apiFetch(`/orders/${id}/bill-request`, {
      method: 'PATCH'
    }),
    exportCsvUrl: () => `${API_BASE}/orders/export?token=${encodeURIComponent(getRestaurantToken() || '')}`,
  },

  crm: {
    getCustomers: (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return apiFetch(`/crm/customers?${params}`);
    },
    getCustomer: (id) => apiFetch(`/crm/customers/${id}`),
    exportCsvUrl: () => `${API_BASE}/crm/customers/export?token=${encodeURIComponent(getRestaurantToken() || '')}`
  },

  analytics: {
    getDashboard: (days = 30) => apiFetch(`/analytics/dashboard?days=${days}`)
  },

  // Public Customer Facing Endpoints
  customer: {
    getMenu: (slug) => apiFetch(`/customer/menu/${slug}`),
    placeOrder: (orderData) => apiFetch('/customer/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    }),
    getOrderStatus: (orderId) => apiFetch(`/customer/orders/${orderId}`)
  }
};
export { API_BASE };
