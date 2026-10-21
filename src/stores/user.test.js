import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { getToken, removeToken, setToken } from '@/services/auth.js';
import { useUserStore } from '@/stores/user.js';

describe('auth.js Token 存取', () => {
  beforeEach(() => {
    removeToken();
  });

  it('setToken 后 getToken 能读回相同值', () => {
    setToken('fake-jwt-token');
    expect(getToken()).toBe('fake-jwt-token');
  });

  it('removeToken 后 getToken 返回 null', () => {
    setToken('will-be-removed');
    removeToken();
    expect(getToken()).toBeNull();
  });
});

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    removeToken();
  });

  it('初始状态未登录', () => {
    const store = useUserStore();
    expect(store.isLoggedIn).toBe(false);
  });

  it('login 后 isLoggedIn 为 true', () => {
    const store = useUserStore();
    store.login('token-123', { username: 'testuser', nickname: '测试用户' });
    expect(store.isLoggedIn).toBe(true);
    expect(store.nickname).toBe('测试用户');
  });

  it('logout 后清理 Token', () => {
    const store = useUserStore();
    store.login('token-123', { username: 'x' });
    store.logout();
    expect(store.isLoggedIn).toBe(false);
    expect(getToken()).toBeNull();
  });
});
