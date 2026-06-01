<template>
  <div class="auth-shell">
    <!-- Left: Hero -->
    <section class="auth-shell__hero" aria-label="VNSEEA hero">
      <slot name="left">
        <AuthHeroPanel v-bind="resolvedHeroProps" />
      </slot>
    </section>

    <!-- Right: Form -->
    <main class="auth-shell__form">
      <!-- Mobile top bar -->
      <div class="auth-shell__mobile-top">
        <NavigationHeaderLogo :inverted="false" :to="appRoutes.welcome" />
      </div>

      <div class="auth-shell__form-inner">
        <slot name="right">
          <slot />
        </slot>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { appRoutes } from '#shared-kernel/application/constants/route-registry'
import AuthHeroPanel from './AuthHeroPanel.vue'
import NavigationHeaderLogo from '../../../navigation/presentation/components/HeaderLogo.vue'

const props = withDefaults(defineProps<{
  heroProps?: {
    title?: string
    subtitle?: string
    imageSrc?: string
    imageAlt?: string
  }
}>(), {
  heroProps: () => ({}),
})

const resolvedHeroProps = computed(() => ({
  title: props.heroProps.title ?? '',
  subtitle: props.heroProps.subtitle ?? '',
  imageSrc: props.heroProps.imageSrc ?? '',
  imageAlt: props.heroProps.imageAlt ?? '',
}))
</script>

<style scoped>
/* ─── Shell ────────────────────────────────────────────── */
.auth-shell {
  min-height: 100svh;
  width: 100%;
  background: #f6f8ff;
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .auth-shell {
    display: grid;
    grid-template-columns: minmax(0, 56%) minmax(0, 44%);
    flex-direction: unset;
  }
}

@media (min-width: 1280px) {
  .auth-shell {
    grid-template-columns: minmax(0, 60%) minmax(0, 40%);
  }
}

/* ─── Hero column ──────────────────────────────────────── */
.auth-shell__hero {
  display: none;
  overflow: hidden;
  background: linear-gradient(160deg, #2747ff 0%, #1122e0 48%, #0911ac 100%);
}

@media (min-width: 1024px) {
  .auth-shell__hero {
    display: flex;
    min-height: 100svh;
    position: sticky;
    top: 0;
  }
}

/* ─── Form column ──────────────────────────────────────── */
.auth-shell__form {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  background: #ffffff;
}

@media (min-width: 1024px) {
  .auth-shell__form {
    overflow-y: auto;
  }
}

/* Mobile top bar */
.auth-shell__mobile-top {
  display: flex;
  align-items: center;
  padding: 20px 24px 0;
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .auth-shell__mobile-top {
    display: none;
  }
}

/* Form inner */
.auth-shell__form-inner {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 24px 48px;
}

@media (min-width: 640px) {
  .auth-shell__form-inner {
    padding: 40px 40px 60px;
  }
}

@media (min-width: 1024px) {
  .auth-shell__form-inner {
    align-items: center;
    padding: 48px 56px;
    min-height: 100svh;
  }
}

@media (min-width: 1280px) {
  .auth-shell__form-inner {
    padding: 64px 72px;
  }
}
</style>
