import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'pf_token';
const NAME_KEY  = 'pf_name';
const TZ_KEY    = 'pf_timezone';

export const setToken    = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getToken    = ()      => localStorage.getItem(TOKEN_KEY);
export const clearToken  = ()      => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(NAME_KEY); localStorage.removeItem(TZ_KEY); };

export const setTimezone = (tz) => localStorage.setItem(TZ_KEY, tz);
export const getTimezone = ()   => localStorage.getItem(TZ_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;

export const setUserName = (name) => localStorage.setItem(NAME_KEY, name);
export const getUserName = ()     => localStorage.getItem(NAME_KEY) || '';

export const getPayload = () => {
  const token = getToken();
  if (!token) return null;
  try   { return jwtDecode(token); }
  catch { clearToken(); return null; }
};

export const getRole   = () => getPayload()?.role   ?? null;
export const getUserId = () => getPayload()?.user_id ?? null;

export const isTokenValid = () => {
  const payload = getPayload();
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
};
