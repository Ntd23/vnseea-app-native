<!-- English description: SMS reset confirmation presentation for backend password recovery. -->

<template>
  <div class="auth-form">
    <div class="auth-form__head">
      <p class="auth-form__eyebrow">{{ $t('pages.confirmResetSmsPage.eyebrow') }}</p>
      <h1 class="auth-form__title">{{ $t('pages.confirmResetSmsPage.title') }}</h1>
      <p class="auth-form__subtitle">
        {{ $t('pages.confirmResetSmsPage.subtitle') }}
      </p>
    </div>

    <UAlert
      v-if="!pageReady"
      color="warning"
      variant="subtle"
      icon="i-ph-warning-circle-fill"
      :title="$t('pages.confirmResetSmsPage.invalidTitle')"
      :description="$t('pages.confirmResetSmsPage.invalidDescription')"
      class="rounded-[14px]"
    />

    <UForm
      v-else
      :state="state"
      :validate="validate"
      class="auth-form__body"
      @submit="handleSubmit"
    >
      <UFormField name="code" :label="$t('pages.confirmResetSmsPage.codeLabel')" required>
        <UInput
          v-model="state.code"
          type="text"
          autocomplete="one-time-code"
          size="xl"
          :placeholder="$t('pages.confirmResetSmsPage.codePlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="submitState === 'error' && submitMessage"
        color="error"
        variant="subtle"
        icon="i-ph-warning-circle-fill"
        :title="$t('pages.confirmResetSmsPage.statusErrorTitle')"
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
        {{ $t('pages.confirmResetSmsPage.submit') }}
      </UButton>

      <p class="auth-form__footer-text">
        {{ $t('pages.confirmResetSmsPage.restartQuestion') }}
        <button type="button" class="auth-form__footer-link auth-form__footer-button" @click="backToForgotPassword">
          {{ $t('pages.confirmResetSmsPage.backToForgotPassword') }}
        </button>
      </p>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { useConfirmResetSmsPageVM } from "../../application/view-models/useConfirmResetSmsPageVM"

const {
  state,
  pageReady,
  submitState,
  submitMessage,
  validate,
  handleSubmit,
  backToForgotPassword,
} = useConfirmResetSmsPageVM()

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

.auth-form__footer-text {
  text-align: center;
  font-size: 0.9rem;
  color: #64748b;
}

.auth-form__footer-link {
  font-weight: 800;
  color: #0000ff;
}

.auth-form__footer-button {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
</style>
