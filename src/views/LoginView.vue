<script setup>
import { AlertCircle, Loader2 } from '@lucide/vue';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { login, register } from '@/api/auth.js';
import { useUserStore } from '@/stores/user.js';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// Tab 切换
const activeTab = ref('login');

// 加载与错误状态
const loading = ref(false);
const globalError = ref('');

// ===== 手机号正则：1 开头，第二位 3-9，共 11 位 =====
const PHONE_REGEX = /^1[3-9]\d{9}$/;
// ===== 后端密码正则：≥8 位，必须包含大小写字母和数字 =====
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*#?&]{8,}$/;

// ===== 表单数据 =====
const loginForm = reactive({ phone: '', password: '' });
const registerForm = reactive({ phone: '', password: '', confirmPassword: '', nickname: '' });

// ===== 表单校验 =====
function validateLogin() {
  const errors = {};
  if (!loginForm.phone.trim()) errors.phone = '请输入手机号';
  else if (!PHONE_REGEX.test(loginForm.phone)) errors.phone = '手机号格式不正确';
  if (!loginForm.password) errors.password = '请输入密码';
  return errors;
}

function validateRegister() {
  const errors = {};
  if (!registerForm.phone.trim()) errors.phone = '请输入手机号';
  else if (!PHONE_REGEX.test(registerForm.phone)) errors.phone = '手机号格式不正确';
  if (!registerForm.password) errors.password = '请输入密码';
  else if (!PASSWORD_REGEX.test(registerForm.password)) {
    errors.password = '密码至少 8 位，需包含大小写字母和数字';
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    errors.confirmPassword = '两次密码输入不一致';
  }
  return errors;
}

const loginErrors = reactive({});
const registerErrors = reactive({});

function clearErrors() {
  globalError.value = '';
  Object.keys(loginErrors).forEach((k) => delete loginErrors[k]);
  Object.keys(registerErrors).forEach((k) => delete registerErrors[k]);
}

// ===== 提交 =====
async function handleLogin() {
  clearErrors();
  const errors = validateLogin();
  Object.assign(loginErrors, errors);
  if (Object.keys(errors).length > 0) return;

  loading.value = true;
  try {
    // 后端 Result<TokenResponse>：http 拦截器已解包 data，拿到 { accessToken, expiresIn, tokenType, user }
    const data = await login({
      phone: loginForm.phone.trim(),
      password: loginForm.password,
    });
    userStore.login(data.accessToken, data.user);
    const redirect = route.query.redirect || '/';
    router.replace(redirect);
  } catch (err) {
    globalError.value = err.message || '登录失败，请检查手机号和密码';
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  clearErrors();
  const errors = validateRegister();
  Object.assign(registerErrors, errors);
  if (Object.keys(errors).length > 0) return;

  loading.value = true;
  try {
    await register({
      phone: registerForm.phone.trim(),
      password: registerForm.password,
      nickname: registerForm.nickname.trim() || undefined,
    });
    // 注册成功 → 自动切到登录 Tab，预填手机号
    activeTab.value = 'login';
    loginForm.phone = registerForm.phone.trim();
    loginForm.password = '';
    globalError.value = '';
  } catch (err) {
    globalError.value = err.message || '注册失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card">
      <h1>欢迎回来</h1>
      <p class="subtitle">手机号登录快速抢票，或注册新账号</p>

      <!-- Tab 切换 -->
      <div class="auth-tabs" role="tablist">
        <button
          class="auth-tab"
          :class="{ active: activeTab === 'login' }"
          type="button"
          @click="activeTab = 'login'; clearErrors()"
        >
          登录
        </button>
        <button
          class="auth-tab"
          :class="{ active: activeTab === 'register' }"
          type="button"
          @click="activeTab = 'register'; clearErrors()"
        >
          注册
        </button>
      </div>

      <!-- 全局错误提示 -->
      <div v-if="globalError" class="auth-error" role="alert">
        <AlertCircle :size="16" />
        <span>{{ globalError }}</span>
      </div>

      <!-- 登录表单 -->
      <form v-if="activeTab === 'login'" class="auth-form" @submit.prevent="handleLogin">
        <div class="form-field">
          <label for="login-phone">手机号</label>
          <input
            id="login-phone"
            v-model="loginForm.phone"
            type="tel"
            :class="{ invalid: loginErrors.phone }"
            autocomplete="tel"
            maxlength="11"
            placeholder="请输入 11 位手机号"
          />
          <span class="field-error">{{ loginErrors.phone }}</span>
        </div>
        <div class="form-field">
          <label for="login-password">密码</label>
          <input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            :class="{ invalid: loginErrors.password }"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
          <span class="field-error">{{ loginErrors.password }}</span>
        </div>
        <button class="primary-button auth-submit" type="submit" :disabled="loading">
          <Loader2 v-if="loading" :size="18" class="spin" />
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 注册表单 -->
      <form v-else class="auth-form" @submit.prevent="handleRegister">
        <div class="form-field">
          <label for="reg-phone">手机号</label>
          <input
            id="reg-phone"
            v-model="registerForm.phone"
            type="tel"
            :class="{ invalid: registerErrors.phone }"
            autocomplete="tel"
            maxlength="11"
            placeholder="请输入 11 位手机号"
          />
          <span class="field-error">{{ registerErrors.phone }}</span>
        </div>
        <div class="form-field">
          <label for="reg-nickname">昵称（可选）</label>
          <input
            id="reg-nickname"
            v-model="registerForm.nickname"
            type="text"
            autocomplete="nickname"
            placeholder="显示给其他用户"
          />
        </div>
        <div class="form-field">
          <label for="reg-password">密码</label>
          <input
            id="reg-password"
            v-model="registerForm.password"
            type="password"
            :class="{ invalid: registerErrors.password }"
            autocomplete="new-password"
            placeholder="至少 8 位，需包含大小写字母和数字"
          />
          <span class="field-error">{{ registerErrors.password }}</span>
        </div>
        <div class="form-field">
          <label for="reg-confirm">确认密码</label>
          <input
            id="reg-confirm"
            v-model="registerForm.confirmPassword"
            type="password"
            :class="{ invalid: registerErrors.confirmPassword }"
            autocomplete="new-password"
            placeholder="再次输入密码"
          />
          <span class="field-error">{{ registerErrors.confirmPassword }}</span>
        </div>
        <button class="primary-button auth-submit" type="submit" :disabled="loading">
          <Loader2 v-if="loading" :size="18" class="spin" />
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
