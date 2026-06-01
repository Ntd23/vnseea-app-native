<!-- English description: Registration form presentation for the backend-backed auth flow. -->

<template>
  <div class="auth-form">
    <div class="auth-form__head">
      <h1 class="auth-form__title">{{ $t('pages.registerPage.title') }}</h1>
    </div>

    <UForm :state="state" :validate="validate" class="auth-form__body" @submit="handleSubmit">
      <div class="auth-form__row-2">
        <UFormField name="firstName" :label="$t('pages.registerPage.firstName')" required class="min-w-0">
          <UInput v-model="state.firstName" size="xl" :placeholder="$t('pages.registerPage.firstNamePlaceholder')"
            class="w-full" />
        </UFormField>
        <UFormField name="lastName" :label="$t('pages.registerPage.lastName')" required class="min-w-0">
          <UInput v-model="state.lastName" size="xl" :placeholder="$t('pages.registerPage.lastNamePlaceholder')"
            class="w-full" />
        </UFormField>
      </div>

      <UFormField name="username" :label="$t('pages.registerPage.username')" required>
        <UInput v-model="state.username" type="text" autocomplete="username" size="xl" class="w-full"
          :placeholder="$t('pages.registerPage.usernamePlaceholder')" />
      </UFormField>

   <div class="auth-form__row-2">
 <UFormField name="birthDay" :label="$t('pages.registerPage.birthday')" class="min-w-0">
  <UPopover>
    <UButton
      color="neutral"
      variant="outline"
      size="xl"
      block
      class="justify-start font-normal"
    >
      {{ birthDateLabel || 'DD/MM/YYYY' }}
    </UButton>

    <template #content>
      <UCalendar v-model="birthDate" />
    </template>
  </UPopover>
</UFormField>

  <UFormField name="gender" :label="$t('pages.registerPage.gender')" class="min-w-0">
    <USelect
      v-model="state.gender"
      :items="genderItems"
      :placeholder="$t('pages.registerPage.gender')"
      size="xl"
      class="w-full"
    />
  </UFormField>
</div>

      <UFormField name="email" :label="$t('pages.registerPage.loginIdentity')" required>
        <UInput v-model="state.email" type="text" autocomplete="username" size="xl"
          :placeholder="$t('pages.registerPage.loginIdentityPlaceholder')" class="w-full" />
      </UFormField>

      <UFormField name="password" :label="$t('pages.registerPage.newPassword')" required>
        <UInput v-model="state.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
          size="xl" class="w-full">
          <template #trailing>
            <UButton type="button" color="neutral" variant="ghost" size="sm"
              :icon="showPassword ? 'i-ph-eye-slash-duotone' : 'i-ph-eye-duotone'"
              :aria-label="showPassword ? $t('pages.registerPage.hidePassword') : $t('pages.registerPage.showPassword')"
              @click="showPassword = !showPassword" />
          </template>
        </UInput>
        <!-- Password strength bars -->
        <div class="auth-strength">
          <div v-for="i in 4" :key="i" class="auth-strength__bar" :class="{
            'auth-strength__bar--weak': strength >= 1 && i === 1,
            'auth-strength__bar--fair': strength >= 2 && i <= 2,
            'auth-strength__bar--good': strength >= 3 && i <= 3,
            'auth-strength__bar--strong': strength >= 4,
          }" />
        </div>
      </UFormField>

      <UFormField name="confirmPassword" :label="$t('pages.registerPage.confirmPassword')" required>
        <UInput v-model="state.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'"
          autocomplete="new-password" size="xl" :placeholder="$t('pages.registerPage.confirmPasswordPlaceholder')"
          class="w-full">
          <template #trailing>
            <UButton type="button" color="neutral" variant="ghost" size="sm"
              :icon="showConfirmPassword ? 'i-ph-eye-slash-duotone' : 'i-ph-eye-duotone'"
              :aria-label="$t('pages.registerPage.toggleConfirmPassword')"
              @click="showConfirmPassword = !showConfirmPassword" />
          </template>
        </UInput>
      </UFormField>

     <div class="auth-checklist">
  <UCheckbox
    v-model="state.hasExistingStorefront"
    :label="$t('pages.registerPage.storefrontQuestion')"
  />

  <UFormField name="acceptTerms" required>
    <UCheckbox v-model="state.acceptTerms" required="">
      <template #label>
        <span class="auth-check__text">
          {{ $t('pages.registerPage.termsAgreementPrefix') }}
          <a
            class="auth-check__link"
            :href="termsHref"
            target="_blank"
            rel="noreferrer"
            @click.stop
          >
            {{ $t('pages.registerPage.terms') }}
          </a>
          {{ $t('pages.registerPage.termsConnector') }}
          <a
            class="auth-check__link"
            :href="privacyHref"
            target="_blank"
            rel="noreferrer"
            @click.stop
          >
            {{ $t('pages.registerPage.privacy') }}
          </a>
        </span>
      </template>
    </UCheckbox>
  </UFormField>
</div>

      <UButton type="submit" color="primary" variant="solid" block size="xl" :loading="isSubmitting"
        loading-icon="i-lucide-loader-2" class="auth-submit">
        {{ isSubmitting ? $t('pages.registerPage.submitting') : $t('pages.registerPage.submit') }}
      </UButton>

      <p class="auth-form__footer-text">
        {{ $t('pages.registerPage.hasAccount') }}
        <NuxtLink class="auth-form__footer-link" :to="appRoutes.welcome">
          {{ $t('pages.registerPage.login') }}
        </NuxtLink>
      </p>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { appRoutes } from '#shared-kernel/application/constants/route-registry'
import { useRegisterPageVM } from '../../application/view-models/useRegisterPageVM'

const { t } = useI18n()
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const { state, isSubmitting, validate, handleSubmit } = useRegisterPageVM()
const termsHref = appRoutes.termsOfUse
const privacyHref = appRoutes.privacyPolicy

const birthDate = shallowRef<CalendarDate | undefined>(
  state.birthYear && state.birthMonth && state.birthDay
    ? new CalendarDate(
        String(state.birthYear),
        String(state.birthMonth),
        String(state.birthDay)
      )
    : undefined
)

watch(birthDate, (value) => {
  state.birthDay = value ? String(value.day) : ''
  state.birthMonth = value ? String(value.month) : ''
  state.birthYear = value ? String(value.year) : ''
})
const birthDateLabel = computed(() => {
  if (!birthDate.value) return ''

  const day = String(birthDate.value.day).padStart(2, '0')
  const month = String(birthDate.value.month).padStart(2, '0')
  const year = birthDate.value.year

  return `${day}/${month}/${year}`
})
const genderOptions = [
  { value: 'female', labelKey: 'pages.registerPage.female' },
  { value: 'male', labelKey: 'pages.registerPage.male' },
  { value: 'custom', labelKey: 'pages.registerPage.custom' },
]
const genderItems = computed(() =>
  genderOptions.map(g => ({
    label: $t(g.labelKey),
    value: g.value
  }))
)
const strength = computed(() => {
  const p = state.password
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})
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
  .auth-form__title {
    font-size: 2.6rem;
  }
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

/* Row grids */
.auth-form__row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.auth-form__row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

/* Password strength */
.auth-strength {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.auth-strength__bar {
  height: 3px;
  flex: 1;
  border-radius: 999px;
  background: #e2e8f0;
  transition: background 0.2s ease;
}

.auth-strength__bar--weak {
  background: #ef4444;
}

.auth-strength__bar--fair {
  background: #f59e0b;
}

.auth-strength__bar--good {
  background: #22c55e;
}

.auth-strength__bar--strong {
  background: #0000ff;
}

.auth-checklist {
  display: flex;
  flex-direction: column;
  gap: 12px;
}


.auth-check__text {
  font-size: 0.92rem;
  line-height: 1.65;
  color: #475569;
}

.auth-check__link {
  color: #0000ff;
  font-weight: 700;
  text-decoration: none;
}

/* Gender radio pills */
.auth-gender {
  display: flex;
  gap: 8px;
}

.auth-gender__option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #fafbfe;
  cursor: pointer;
  transition: all 0.12s ease;
}

.auth-gender__option:hover {
  border-color: rgba(0, 0, 255, 0.2);
  background: rgba(0, 0, 255, 0.02);
}

.auth-gender__option--active {
  border-color: #0000ff;
  background: rgba(0, 0, 255, 0.04);
}

.auth-gender__label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.auth-gender__radio {
  width: 15px;
  height: 15px;
  accent-color: #0000ff;
  cursor: pointer;
}

/* Submit button */
.auth-submit {
  border-radius: 14px !important;
  height: 3.5rem !important;
  font-size: 1rem !important;
  font-weight: 800 !important;
  margin-top: 4px;
  box-shadow: 0 12px 28px rgba(0, 0, 255, 0.2) !important;
}

.auth-submit:hover {
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
