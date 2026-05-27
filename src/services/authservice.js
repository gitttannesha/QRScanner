import axios from "axios";
import { buildApiUrl } from "../config/api";
import { clearStorage, getToken } from "../utilis/storage";

const createHeaders = async (requiresAuth = true, extraHeaders = {}) => {
  const headers = { ...extraHeaders };

  if (!requiresAuth) {
    return headers;
  }

  const token = await getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const apiCall = async (method, endpoint, data = null, options = {}) => {
  const {
    requiresAuth = true,
    headers: extraHeaders = {},
  } = options;

  const requestConfig = {
    method,
    url: buildApiUrl(endpoint),
    headers: await createHeaders(requiresAuth, extraHeaders),
  };

  if (data !== null && data !== undefined) {
    requestConfig.data = data;
  }

  try {
    return await axios(requestConfig);
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      await clearStorage();
    }

    throw error;
  }
};

export const getRequest = (endpoint, options) =>
  apiCall("GET", endpoint, null, options);

export const postRequest = (endpoint, data, options) =>
  apiCall("POST", endpoint, data, options);

export const postRequestFormData = (endpoint, formData) =>
  apiCall("POST", endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export default apiCall;