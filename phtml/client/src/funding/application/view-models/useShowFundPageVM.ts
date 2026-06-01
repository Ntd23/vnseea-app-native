// English description: Funding detail page view-model that owns route-driven loading and donation actions.

import type { ComputedRef } from "vue"
import type { FundingCampaign } from "../../domain/types/funding.types"
import { createApiFundingRepository } from "../../infrastructure/repositories/ApiFundingRepository"

export function useShowFundPageVM() {
  const route = useRoute()
  const toast = useToast()
  const repository = createApiFundingRepository()
  const donationOpen = ref(false)
  const donationAmount = ref<number | null>(null)
  const donating = ref(false)
  const donorSearch = ref("")
  const donorSort = ref<"newest" | "amount_asc" | "amount_desc">("newest")
  const campaignId = computed(() => String(route.params.id || ""))

  const { data, pending, error, refresh } = useAsyncData(
    () => `funding-detail:${campaignId.value}`,
    () => repository.getCampaign(campaignId.value),
    { watch: [campaignId] },
  )

  const campaign = computed(() => data.value?.campaign ?? null)
  const currency = computed(() => data.value?.currency ?? "")
  const currencySymbol = computed(() => data.value?.currencySymbol ?? "")

  const filteredDonations = computed(() => {
    const keyword = donorSearch.value.trim().toLowerCase()
    const donations = [...(campaign.value?.donations ?? [])]
      .filter(donation => !keyword || donation.supporterName.toLowerCase().includes(keyword))

    if (donorSort.value === "amount_asc") {
      return donations.sort((left, right) => left.amount - right.amount)
    }

    if (donorSort.value === "amount_desc") {
      return donations.sort((left, right) => right.amount - left.amount)
    }

    return donations.sort((left, right) =>
      new Date(right.donatedAt).getTime() - new Date(left.donatedAt).getTime(),
    )
  })

  const openDonate = () => {
    if (!campaign.value?.canDonate) return
    donationOpen.value = true
    donationAmount.value = null
  }

  const submitDonation = async () => {
    if (!campaign.value || !campaign.value.canDonate || !donationAmount.value) return
    donating.value = true

    try {
      await repository.donate({
        id: campaign.value.id,
        amount: donationAmount.value,
      })
      donationOpen.value = false
      await refresh()
    }
    catch (err) {
      toast.add({
        color: "error",
        title: err instanceof Error ? err.message : "Unable to donate.",
      })
    }
    finally {
      donating.value = false
    }
  }

  return {
    campaign: campaign as ComputedRef<FundingCampaign | null>,
    currency,
    currencySymbol,
    pending,
    error,
    donationOpen,
    donationAmount,
    donating,
    donorSearch,
    donorSort,
    filteredDonations,
    openDonate,
    submitDonation,
  }
}
