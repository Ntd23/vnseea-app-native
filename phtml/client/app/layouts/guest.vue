<template>
  <AuthSplitShell :hero-props="heroProps">
    <slot />
  </AuthSplitShell>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import AuthSplitShell from "../../src/auth/presentation/components/AuthSplitShell.vue"

const { t } = useI18n()
const route = useRoute()

const heroProps = computed(() => {
  if (route.path.endsWith(appRoutes.register)) {
    const title = t('pages.registerPage.heroTitle')

    return {
      title,
      subtitle: t('pages.registerPage.subtitle'),
      imageAlt: title,
    }
  }

  if (route.path.endsWith(appRoutes.forgotPassword)) {
    const title = t('pages.forgotPasswordPage.heroTitle')

    return {
      title,
      subtitle: t('pages.forgotPasswordPage.heroSubtitle'),
      imageAlt: title,
    }
  }

  if (route.path.endsWith(appRoutes.confirmLogin)) {
    return {
      title: "Confirm your sign in",
      subtitle: "Enter the confirmation code provided by the backend to finish the sign-in flow.",
      imageAlt: "Confirm sign in",
    }
  }

  if (route.path.endsWith(appRoutes.confirmAccount)) {
    return {
      title: "Verify your VNSEEA account",
      subtitle: "Use the code sent by email or SMS so the backend can activate the account and start a real web session.",
      imageAlt: "Verify account",
    }
  }

  if (route.path.endsWith(appRoutes.confirmResetSms)) {
    return {
      title: "Confirm your phone reset code",
      subtitle: "Once the SMS code is verified, VNSEEA will open the password reset form for this account.",
      imageAlt: "Confirm phone reset code",
    }
  }

  if (route.path.endsWith(appRoutes.resetPassword)) {
    return {
      title: "Set your new password",
      subtitle: "Finish the password reset flow with the secure token that the backend already issued.",
      imageAlt: "Reset password",
    }
  }

  const title = t('pages.welcomePage.title')

  return {
    title,
    subtitle: t('pages.welcomePage.subtitle'),
    imageAlt: title,
  }
})
</script>
