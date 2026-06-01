<template>
  <div class="auth-form">
    <div class="auth-form__head">
      <h1 class="auth-form__title">{{ $t('pages.forgotPasswordPage.title') }}</h1>
    </div>

    <!-- Status alert -->
    <Transition name="auth-alert">
      <UAlert
        v-if="statusAlert"
        :color="statusAlert.color"
        variant="subtle"
        :icon="statusAlert.icon"
        :title="statusAlert.title"
        :description="statusAlert.description"
        class="auth-alert-box"
      />
    </Transition>

    <UForm
      :state="state"
      :validate="validate"
      class="auth-form__body"
      @submit="handleReset"
      @error="onFormError"
    >
      <!-- Email / phone -->
      <UFormField
        name="emailOrPhone"
        :label="$t('pages.forgotPasswordPage.emailLabel')"
        required
      >
        <UInput
          v-model="state.emailOrPhone"
          type="text"
          autocomplete="username"
          size="xl"
          :placeholder="$t('pages.forgotPasswordPage.emailPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <!-- Captcha -->
      <UFormField name="captchaConfirmed">
        <div class="auth-captcha">
          <UCheckbox
            v-model="state.captchaConfirmed"
            name="captchaConfirmed"
            color="primary"
            size="lg"
            :label="$t('pages.forgotPasswordPage.captchaLabel')"
          />
          <div class="auth-captcha__brand">
            <div class="auth-captcha__shield">
              <Icon name="i-ph-shield-check-fill" class="h-4 w-4 text-[#0000ff]" />
            </div>
            <span class="auth-captcha__brand-text">{{ $t('pages.forgotPasswordPage.captchaBrand') }}</span>
          </div>
        </div>
      </UFormField>

      <!-- Submit -->
      <UButton
        type="submit"
        color="primary"
        variant="solid"
        block
        size="xl"
        :loading="submitState === 'loading'"
        loading-icon="i-lucide-loader-2"
        :disabled="isSubmitDisabled"
        class="auth-submit"
      >
        {{ $t('pages.forgotPasswordPage.submit') }}
      </UButton>

      <p class="auth-form__footer-text">
        {{ $t('pages.forgotPasswordPage.readyQuestion') }}
        <NuxtLink class="auth-form__footer-link" :to="appRoutes.welcome">
          {{ $t('pages.forgotPasswordPage.login') }}
        </NuxtLink>
      </p>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { appRoutes } from '#shared-kernel/application/constants/route-registry'
import { useForgotPasswordPageVM } from '../../application/view-models/useForgotPasswordPageVM'

const { t } = useI18n()
const {
  state,
  submitState,
  isSubmitDisabled,
  statusAlert,
  validate,
  handleReset,
  onFormError,
} = useForgotPasswordPageVM()

const checkboxUi = {
  root: 'items-center gap-3',
  label: 'text-[0.95rem] font-medium text-slate-700',
  base: 'size-5 rounded-[6px]',
}
</script>

<style scoped>
.auth-form {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
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

/* Alert */
.auth-alert-box {
  border-radius: 14px !important;
}

.auth-alert-enter-active,
.auth-alert-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.auth-alert-enter-from,
.auth-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.auth-form__body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

/* Captcha row */
.auth-captcha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  background: #fafbfe;
  padding: 14px 16px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.auth-captcha:focus-within {
  border-color: #0000ff;
  box-shadow: 0 0 0 4px rgba(0, 0, 255, 0.07);
}

.auth-captcha__brand {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.auth-captcha__shield {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8faff;
}

.auth-captcha__brand-text {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

/* Submit */
.auth-submit {
  border-radius: 14px !important;
  height: 3.5rem !important;
  font-size: 1rem !important;
  font-weight: 800 !important;
  margin-top: 4px;
  box-shadow: 0 12px 28px rgba(0, 0, 255, 0.2) !important;
}

.auth-submit:hover:not(:disabled) {
  box-shadow: 0 16px 36px rgba(0, 0, 255, 0.28) !important;
  transform: translateY(-1px);
}

/* Footer */
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
</style>
