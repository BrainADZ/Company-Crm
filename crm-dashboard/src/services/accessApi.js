import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getAdminHeaders } from './businessApi';

export const getRoles = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/roles`, { headers: getAdminHeaders() });
  return response.data;
};

export const updateRole = async (roleKey, payload) => {
  const response = await axios.put(`${API_BASE_URL}/api/roles/${roleKey}`, payload, { headers: getAdminHeaders() });
  return response.data;
};

export const resetRole = async (roleKey) => {
  const response = await axios.post(`${API_BASE_URL}/api/roles/${roleKey}/reset-default`, {}, { headers: getAdminHeaders() });
  return response.data;
};

export const getPermissionMeta = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/permissions/resources`, { headers: getAdminHeaders() });
  return response.data;
};

export const getCommunities = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/communities`, { headers: getAdminHeaders() });
  return response.data;
};
