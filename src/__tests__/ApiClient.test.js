import api, { setAuthToken, clearAuthToken } from '../api/ApiClient';

describe('ApiClient token helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    delete api.defaults.headers.common.Authorization;
  });

  test('setAuthToken stores token and sets default Authorization header', () => {
    setAuthToken('abc123');
    expect(localStorage.getItem('auth_token')).toBe('abc123');
    expect(api.defaults.headers.common.Authorization).toBe('Bearer abc123');
  });

  test('clearAuthToken removes token and Authorization header', () => {
    setAuthToken('tok');
    clearAuthToken();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(api.defaults.headers.common.Authorization).toBeUndefined();
  });
});
