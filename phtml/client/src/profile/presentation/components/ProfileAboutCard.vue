  <div class="surface-card p-6 space-y-6">
    <h3 class="text-sm font-black text-[var(--text-primary)] tracking-tight">{{ t("pages.profilePage.aboutCard.title") }}</h3>

    <!-- Overview Categories -->
    <div class="divide-y divide-secondary-100 border border-secondary-100 rounded-2xl overflow-hidden bg-secondary-50/20">
      <div v-for="section in sections" :key="section.title" class="p-5 space-y-4 transition-colors hover:bg-white/40 group">
        <h4 class="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary-100 text-[var(--text-primary)] group-hover:bg-primary-50 group-hover:text-secondary-900 transition-colors">
            <Icon :name="section.icon" class="h-4 w-4" />
          </div>
          {{ section.title }}
        </h4>
        
        <div class="space-y-4 pl-11">
          <div v-for="item in section.items" :key="item.value" class="flex items-start gap-4">
            <Icon :name="item.icon" class="mt-1 h-5 w-5 shrink-0 text-secondary-300 group-hover:text-primary-400 transition-colors" />
            <div class="space-y-0.5">
              <p class="text-sm font-black text-[var(--text-primary)] leading-tight group-hover:text-secondary-900 transition-colors">{{ item.value }}</p>
              <p v-if="item.sub" class="text-[11px] font-medium text-[var(--text-primary)]">{{ item.sub }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

<script setup lang="ts">
const { t } = useI18n()

const sections = computed(() => [
  {
    title: t("pages.profilePage.aboutCard.sections.workEducation.title"),
    icon: "i-ph-briefcase",
    items: [
      {
        icon: "i-ph-buildings",
        value: t("pages.profilePage.aboutCard.sections.workEducation.items.job.value"),
        sub: t("pages.profilePage.aboutCard.sections.workEducation.items.job.sub"),
      },
      {
        icon: "i-ph-graduation-cap",
        value: t("pages.profilePage.aboutCard.sections.workEducation.items.school.value"),
        sub: t("pages.profilePage.aboutCard.sections.workEducation.items.school.sub"),
      },
    ],
  },
  {
    title: t("pages.profilePage.aboutCard.sections.living.title"),
    icon: "i-ph-map-pin",
    items: [
      {
        icon: "i-ph-house-simple",
        value: t("pages.profilePage.aboutCard.sections.living.items.current.value"),
      },
      {
        icon: "i-ph-map-trifold",
        value: t("pages.profilePage.aboutCard.sections.living.items.hometown.value"),
      },
    ],
  },
  {
    title: t("pages.profilePage.aboutCard.sections.contact.title"),
    icon: "i-ph-phone",
    items: [
      {
        icon: "i-ph-envelope-simple",
        value: t("pages.profilePage.aboutCard.sections.contact.items.email.value"),
      },
      {
        icon: "i-ph-globe-simple",
        value: t("pages.profilePage.aboutCard.sections.contact.items.website.value"),
      },
      {
        icon: "i-ph-phone",
        value: t("pages.profilePage.aboutCard.sections.contact.items.phone.value"),
      },
    ],
  },
  {
    title: t("pages.profilePage.aboutCard.sections.basic.title"),
    icon: "i-ph-info",
    items: [
      {
        icon: "i-ph-gender-intersex",
        value: t("pages.profilePage.aboutCard.sections.basic.items.gender.value"),
      },
      {
        icon: "i-ph-calendar-blank",
        value: t("pages.profilePage.aboutCard.sections.basic.items.birthday.value"),
      },
      {
        icon: "i-ph-heart",
        value: t("pages.profilePage.aboutCard.sections.basic.items.relationship.value"),
      },
    ],
  },
])
</script>
