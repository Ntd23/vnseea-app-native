import type {
  DonationPayload,
  FundingCategoryKey,
  FundingCreatePayload,
  FundingDonationPresentation,
  FundingOption,
  FundingStatusKey,
  MockFundingCampaign,
} from "../../domain/types/funding.types"

export const fundingCategoryKeys = [
  "community",
  "education",
  "health",
  "environment",
  "startup",
] as const satisfies FundingCategoryKey[]

export const fundingStatusKeys = [
  "all",
  "active",
  "ending",
  "funded",
  "mine",
] as const satisfies FundingStatusKey[]

export const readFundingQueryValue = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || "")
  return typeof value === "string" ? value : ""
}

export const normalizeFundingCategory = (value: string): "all" | FundingCategoryKey => {
  if (fundingCategoryKeys.includes(value as FundingCategoryKey)) {
    return value as FundingCategoryKey
  }

  return "all"
}

export const normalizeFundingStatus = (value: string): FundingStatusKey => {
  if (fundingStatusKeys.includes(value as FundingStatusKey)) {
    return value as FundingStatusKey
  }

  return "all"
}

export const filterFundingCampaigns = (
  campaigns: ReadonlyArray<MockFundingCampaign>,
  search: string,
  category: "all" | FundingCategoryKey,
  status: FundingStatusKey,
) => {
  const keyword = search.trim().toLowerCase()

  return campaigns.filter((campaign) => {
    const matchesKeyword = keyword.length === 0 || [
      campaign.title,
      campaign.owner,
      campaign.location,
      campaign.categoryLabel,
      campaign.summary,
      campaign.description,
      ...campaign.impact,
    ].some(field => field.toLowerCase().includes(keyword))

    const matchesCategory = category === "all" || campaign.category === category
    const matchesStatus = status === "all"
      || (status === "mine" ? campaign.isOwner : campaign.status === status)

    return matchesKeyword && matchesCategory && matchesStatus
  })
}

export const cloneFundingCampaign = (campaign: MockFundingCampaign): MockFundingCampaign => ({
  ...campaign,
  impact: [...campaign.impact],
  rewards: [...campaign.rewards],
  donors: campaign.donors.map(donor => ({ ...donor })),
})

export const applyFundingDonation = (
  campaign: MockFundingCampaign,
  payload: DonationPayload,
  presentation: FundingDonationPresentation,
) => {
  campaign.raisedAmount += payload.amount
  campaign.backers += 1
  campaign.status = campaign.raisedAmount >= campaign.goalAmount
    ? "funded"
    : campaign.daysLeft <= 10
      ? "ending"
      : "active"
  campaign.donors = [
    {
      id: Date.now(),
      name: presentation.supporterName,
      initials: presentation.supporterInitials,
      gradient: presentation.gradient ?? "linear-gradient(135deg,var(--color-primary-500),var(--color-accent-500))",
      amount: payload.amount,
      message: payload.message.trim() || presentation.fallbackMessage,
      donatedAt: presentation.donatedAt,
    },
    ...campaign.donors,
  ]

  return campaign
}

export const useFundingCatalog = () => {
  const { t } = useI18n()

  const fundingCategories: FundingOption<"all" | FundingCategoryKey>[] = [
    { label: t("pages.fundingPage.categoryAll"), value: "all", icon: "i-ph-squares-four-fill" },
    { label: t("pages.fundingPage.categoryCommunity"), value: "community", icon: "i-ph-users-three-fill" },
    { label: t("pages.fundingPage.categoryEducation"), value: "education", icon: "i-ph-graduation-cap-fill" },
    { label: t("pages.fundingPage.categoryHealth"), value: "health", icon: "i-ph-heartbeat-fill" },
    { label: t("pages.fundingPage.categoryEnvironment"), value: "environment", icon: "i-ph-leaf-fill" },
    { label: t("pages.fundingPage.categoryStartup"), value: "startup", icon: "i-ph-rocket-launch-fill" },
  ]

  const fundingStatuses: FundingOption<FundingStatusKey>[] = [
    { label: t("pages.fundingPage.statusAll"), value: "all", icon: "i-ph-list-bullets-fill" },
    { label: t("pages.fundingPage.statusActive"), value: "active", icon: "i-ph-lightning-fill" },
    { label: t("pages.fundingPage.statusEnding"), value: "ending", icon: "i-ph-hourglass-high-fill" },
    { label: t("pages.fundingPage.statusFunded"), value: "funded", icon: "i-ph-check-circle-fill" },
    { label: t("pages.fundingPage.statusMine"), value: "mine", icon: "i-ph-user-circle-check-fill" },
  ]

  const campaigns: MockFundingCampaign[] = [
    {
      id: "green-classroom-kit",
      title: t("pages.fundingPage.campaign1Title"),
      category: "education",
      categoryLabel: t("pages.fundingPage.categoryEducation"),
      owner: "Learning Guild",
      ownerInitials: "LG",
      ownerGradient: "linear-gradient(135deg,var(--color-primary-500),var(--color-success))",
      location: t("pages.fundingPage.campaign1Location"),
      goalAmount: 120000000,
      raisedAmount: 84500000,
      backers: 238,
      daysLeft: 18,
      status: "active",
      cover: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=80",
      coverFallback: "linear-gradient(135deg,var(--color-primary-500),var(--color-success))",
      summary: t("pages.fundingPage.campaign1Summary"),
      description: t("pages.fundingPage.campaign1Description"),
      impact: [
        t("pages.fundingPage.campaign1Impact1"),
        t("pages.fundingPage.campaign1Impact2"),
        t("pages.fundingPage.campaign1Impact3"),
      ],
      rewards: [
        t("pages.fundingPage.campaign1Reward1"),
        t("pages.fundingPage.campaign1Reward2"),
        t("pages.fundingPage.campaign1Reward3"),
      ],
      donors: [
        {
          id: 1,
          name: "Thu Hà",
          initials: "TH",
          gradient: "linear-gradient(135deg,var(--color-primary-500),var(--color-success))",
          amount: 2500000,
          message: t("pages.fundingPage.campaign1Donor1Message"),
          donatedAt: t("pages.fundingPage.campaign1Donor1Time"),
        },
        {
          id: 2,
          name: "Bảo Trần",
          initials: "BT",
          gradient: "linear-gradient(135deg,var(--color-accent-500),var(--color-primary-600))",
          amount: 1000000,
          message: t("pages.fundingPage.campaign1Donor2Message"),
          donatedAt: t("pages.fundingPage.campaign1Donor2Time"),
        },
      ],
      isOwner: true,
      isFeatured: true,
    },
    {
      id: "community-health-check",
      title: t("pages.fundingPage.campaign2Title"),
      category: "health",
      categoryLabel: t("pages.fundingPage.categoryHealth"),
      owner: "Care Bridge",
      ownerInitials: "CB",
      ownerGradient: "linear-gradient(135deg,var(--color-error),var(--color-accent-500))",
      location: t("pages.fundingPage.campaign2Location"),
      goalAmount: 90000000,
      raisedAmount: 64000000,
      backers: 176,
      daysLeft: 9,
      status: "ending",
      cover: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=80",
      coverFallback: "linear-gradient(135deg,var(--color-error),var(--color-accent-500))",
      summary: t("pages.fundingPage.campaign2Summary"),
      description: t("pages.fundingPage.campaign2Description"),
      impact: [
        t("pages.fundingPage.campaign2Impact1"),
        t("pages.fundingPage.campaign2Impact2"),
        t("pages.fundingPage.campaign2Impact3"),
      ],
      rewards: [
        t("pages.fundingPage.campaign2Reward1"),
        t("pages.fundingPage.campaign2Reward2"),
        t("pages.fundingPage.campaign2Reward3"),
      ],
      donors: [
        {
          id: 3,
          name: "Quỳnh Lan",
          initials: "QL",
          gradient: "linear-gradient(135deg,var(--color-error),var(--color-primary-500))",
          amount: 3000000,
          message: t("pages.fundingPage.campaign2Donor1Message"),
          donatedAt: t("pages.fundingPage.campaign2Donor1Time"),
        },
      ],
      isOwner: false,
      isFeatured: true,
    },
    {
      id: "river-cleanup-weekend",
      title: t("pages.fundingPage.campaign3Title"),
      category: "environment",
      categoryLabel: t("pages.fundingPage.categoryEnvironment"),
      owner: "Green Neighborhood",
      ownerInitials: "GN",
      ownerGradient: "linear-gradient(135deg,var(--color-success),var(--color-info))",
      location: t("pages.fundingPage.campaign3Location"),
      goalAmount: 45000000,
      raisedAmount: 47500000,
      backers: 312,
      daysLeft: 0,
      status: "funded",
      cover: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1400&q=80",
      coverFallback: "linear-gradient(135deg,var(--color-success),var(--color-info))",
      summary: t("pages.fundingPage.campaign3Summary"),
      description: t("pages.fundingPage.campaign3Description"),
      impact: [
        t("pages.fundingPage.campaign3Impact1"),
        t("pages.fundingPage.campaign3Impact2"),
        t("pages.fundingPage.campaign3Impact3"),
      ],
      rewards: [
        t("pages.fundingPage.campaign3Reward1"),
        t("pages.fundingPage.campaign3Reward2"),
        t("pages.fundingPage.campaign3Reward3"),
      ],
      donors: [
        {
          id: 4,
          name: "Hải Nam",
          initials: "HN",
          gradient: "linear-gradient(135deg,var(--color-success),var(--color-primary-500))",
          amount: 500000,
          message: t("pages.fundingPage.campaign3Donor1Message"),
          donatedAt: t("pages.fundingPage.campaign3Donor1Time"),
        },
      ],
      isOwner: false,
      isFeatured: false,
    },
    {
      id: "local-founder-grant",
      title: t("pages.fundingPage.campaign4Title"),
      category: "startup",
      categoryLabel: t("pages.fundingPage.categoryStartup"),
      owner: "Startup Circle",
      ownerInitials: "SC",
      ownerGradient: "linear-gradient(135deg,var(--color-primary-700),var(--color-accent-500))",
      location: t("pages.fundingPage.campaign4Location"),
      goalAmount: 180000000,
      raisedAmount: 52000000,
      backers: 92,
      daysLeft: 32,
      status: "active",
      cover: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
      coverFallback: "linear-gradient(135deg,var(--color-primary-700),var(--color-accent-500))",
      summary: t("pages.fundingPage.campaign4Summary"),
      description: t("pages.fundingPage.campaign4Description"),
      impact: [
        t("pages.fundingPage.campaign4Impact1"),
        t("pages.fundingPage.campaign4Impact2"),
        t("pages.fundingPage.campaign4Impact3"),
      ],
      rewards: [
        t("pages.fundingPage.campaign4Reward1"),
        t("pages.fundingPage.campaign4Reward2"),
        t("pages.fundingPage.campaign4Reward3"),
      ],
      donors: [
        {
          id: 5,
          name: "Minh Anh",
          initials: "MA",
          gradient: "linear-gradient(135deg,var(--color-primary-500),var(--color-accent-500))",
          amount: 2000000,
          message: t("pages.fundingPage.campaign4Donor1Message"),
          donatedAt: t("pages.fundingPage.campaign4Donor1Time"),
        },
      ],
      isOwner: true,
      isFeatured: false,
    },
  ]

  return {
    campaigns,
    fundingCategories,
    fundingStatuses,
    findCampaignById: (id: string) => campaigns.find(campaign => campaign.id === id),
  }
}

export const formatFundingCurrency = (value: number, locale = "vi") =>
  new Intl.NumberFormat(locale.startsWith("en") ? "en-US" : "vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)
