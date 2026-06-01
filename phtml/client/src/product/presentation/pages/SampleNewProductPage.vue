<template>
  <section class="space-y-4">
    <header>
      <p class="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
        Product Context Sample
      </p>
      <h1 class="text-3xl font-black text-slate-900">
        New Product Page
      </h1>
      <p class="text-sm text-slate-500">
        Sample page under `src/product/presentation/pages`. Route file should only wrap this page.
      </p>
    </header>

    <div class="rounded-2xl border border-slate-200 bg-white p-5">
      <p class="text-sm text-slate-600">
        Completion: {{ completionCount }}/7
      </p>
      <p class="mt-2 text-sm text-slate-600">
        Status: {{ status }}
      </p>
      <p class="mt-2 text-sm text-slate-600">
        Valid: {{ validation.valid ? "yes" : "no" }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useProductEditor } from "../../application/composables/useProductEditor"
import { createEmptyProductDraft } from "../../application/use-cases/create-product-draft"

const { completionCount, status, validation } = useProductEditor(
  "sample:product-editor",
  createEmptyProductDraft(),
)
</script>
