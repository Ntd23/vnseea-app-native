<template>
  <div class="auth-form">
    <div class="auth-form__head">
      <h1 class="auth-form__title">{{ $t('pages.welcomePage.title') }}</h1>
    </div>

    <UForm
      :state="state"
      :validate="validate"
      class="auth-form__body"
      @submit="handleLogin"
    >
      <UFormField
        name="login"
        :label="$t('pages.welcomePage.loginLabel')"
        required
      >
        <UInput
          v-model="state.login"
          type="text"
          autocomplete="username"
          size="xl"
          :placeholder="$t('pages.welcomePage.loginPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UFormField
        name="password"
        :label="$t('pages.welcomePage.passwordLabel')"
        required
      >
        <template #hint>
          <NuxtLink class="auth-form__field-link" :to="appRoutes.forgotPassword">
            {{ $t('pages.welcomePage.forgotPassword') }}
          </NuxtLink>
        </template>
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          size="xl"
          :placeholder="$t('pages.welcomePage.passwordLabel')"
          class="w-full"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :icon="showPassword ? 'i-ph-eye-slash-duotone' : 'i-ph-eye-duotone'"
              :aria-label="showPassword ? $t('pages.welcomePage.hidePassword') : $t('pages.welcomePage.showPassword')"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UButton
        type="submit"
        color="primary"
        variant="solid"
        block
        size="xl"
        :loading="isSubmitting"
        loading-icon="i-lucide-loader-2"
        class="auth-submit"
      >
        {{ $t('pages.welcomePage.login') }}
      </UButton>

      <p class="auth-form__footer-text">
        {{ $t('pages.welcomePage.noAccount') }}
        <NuxtLink class="auth-form__footer-link" :to="appRoutes.register">
          {{ $t('pages.welcomePage.register') }}
        </NuxtLink>
      </p>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { appRoutes } from '#shared-kernel/application/constants/route-registry'
import { useLoginPageVM } from "../../../auth/application/view-models/useLoginPageVM"

const { t } = useI18n()
const showPassword = ref(false)
const {
  state,
  isSubmitting,
  validate,
  handleSubmit: handleLogin,
} = useLoginPageVM()

</script>

<style scoped>
.auth-form {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.auth-form__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-form__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #0000ff;
}

.auth-form__title {
  font-size: 2.2rem;
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.06em;
  color: #0f172a;
}

@media (min-width: 640px) {
  .auth-form__title { font-size: 2.6rem; }
}

.auth-form__subtitle {
  font-size: 0.95rem;
  line-height: 1.7;
  color: #64748b;
  margin-top: 4px;
}

.auth-form__body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.auth-form__field-link {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0000ff;
  text-decoration: none;
  transition: opacity 0.12s ease;
}

.auth-form__field-link:hover { opacity: 0.72; }

.auth-submit {
  border-radius: 14px !important;
  height: 3.5rem !important;
  font-size: 1rem !important;
  font-weight: 800 !important;
  margin-top: 4px;
  box-shadow: 0 12px 28px rgba(0, 0, 255, 0.2) !important;
  transition: all 0.2s ease !important;
}

.auth-submit:hover {
  box-shadow: 0 16px 36px rgba(0, 0, 255, 0.28) !important;
  transform: translateY(-1px);
}

.auth-form__footer-text {
  text-align: center;
  font-size: 0.9rem;
  color: #64748b;
}

.auth-form__footer-link {
  font-weight: 800;
  color: #0000ff;
  text-decoration: none;
}

.auth-form__footer-link:hover { opacity: 0.75; }
</style>
