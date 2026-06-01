<!-- English description: Password reset presentation for completing backend recovery requests. -->

<template>
  <div class="auth-form">
    <div class="auth-form__head">
      <h1 class="auth-form__title">{{ $t('pages.resetPasswordPage.title') }}</h1>
    </div>

    <UAlert
      v-if="!pageReady"
      color="warning"
      variant="subtle"
      icon="i-ph-warning-circle-fill"
      :title="$t('pages.resetPasswordPage.invalidTitle')"
      :description="$t('pages.resetPasswordPage.invalidDescription')"
      class="rounded-[14px]"
    />

    <UForm
      v-else
      :state="state"
      :validate="validate"
      class="auth-form__body"
      @submit="handleSubmit"
    >
      <UFormField name="email" :label="$t('pages.resetPasswordPage.emailLabel')" required>
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="username"
          size="xl"
          :placeholder="$t('pages.resetPasswordPage.emailPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UFormField name="password" :label="$t('pages.resetPasswordPage.passwordLabel')" required>
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          size="xl"
          class="w-full"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :icon="showPassword ? 'i-ph-eye-slash-duotone' : 'i-ph-eye-duotone'"
              :aria-label="showPassword ? $t('pages.resetPasswordPage.hidePassword') : $t('pages.resetPasswordPage.showPassword')"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UFormField name="confirmPassword" :label="$t('pages.resetPasswordPage.confirmPasswordLabel')" required>
        <UInput
          v-model="state.confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          autocomplete="new-password"
          size="xl"
          class="w-full"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :icon="showConfirmPassword ? 'i-ph-eye-slash-duotone' : 'i-ph-eye-duotone'"
              :aria-label="showConfirmPassword ? $t('pages.resetPasswordPage.hidePasswordConfirmation') : $t('pages.resetPasswordPage.showPasswordConfirmation')"
              @click="showConfirmPassword = !showConfirmPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UAlert
        v-if="submitState === 'error' && submitMessage"
        color="error"
        variant="subtle"
        icon="i-ph-warning-circle-fill"
        :title="$t('pages.resetPasswordPage.statusErrorTitle')"
        :description="submitMessage"
        class="rounded-[14px]"
      />

      <UButton
        type="submit"
        color="primary"
        variant="solid"
        block
        size="xl"
        :loading="submitState === 'loading'"
        loading-icon="i-lucide-loader-2"
        class="auth-submit"
      >
        {{ $t('pages.resetPasswordPage.submit') }}
      </UButton>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { useResetPasswordPageVM } from "../../application/view-models/useResetPasswordPageVM"

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const {
  state,
  pageReady,
  submitState,
  submitMessage,
  validate,
  handleSubmit,
} = useResetPasswordPageVM()

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

.auth-submit {
  border-radius: 14px !important;
  height: 3.5rem !important;
  font-size: 1rem !important;
  font-weight: 800 !important;
  margin-top: 4px;
  box-shadow: 0 12px 28px rgba(0, 0, 255, 0.2) !important;
}
</style>
