// English description: Domain types for backend-backed funding campaigns and legacy migration shapes.

export type FundingCategoryKey = "community" | "education" | "health" | "environment" | "startup"
export type FundingStatusKey = "all" | "active" | "ending" | "funded" | "mine"

export type FundingOption<T extends string = string> = {
  label: string
  value: T
  icon: string
}

export type FundingDonor = {
  id: number
  name: string
  initials: string
  gradient: string
  amount: number
  message: string
  donatedAt: string
}

export type MockFundingCampaign = {
  id: string
  title: string
  category: FundingCategoryKey
  categoryLabel: string
  owner: string
  ownerInitials: string
  ownerGradient: string
  location: string
  goalAmount: number
  raisedAmount: number
  backers: number
  daysLeft: number
  status: Exclude<FundingStatusKey, "all">
  cover: string
  coverFallback: string
  summary: string
  description: string
  impact: string[]
  rewards: string[]
  donors: FundingDonor[]
  isOwner: boolean
  isFeatured: boolean
}

export type DonationPayload = {
  campaignId: string
  amount: number
  paymentMethod: "wallet" | "card" | "bank"
  message: string
}

export type FundingCreatePayload = {
  title: string
  category: FundingCategoryKey
  goalAmount: number
  imageName: string
  description: string
}

export type FundingDonationPresentation = {
  supporterName: string
  supporterInitials: string
  fallbackMessage: string
  donatedAt: string
  gradient?: string
}

export type FundingTabKey = "browse" | "mine"

export type FundingDonation = {
  id: number
  userId: number
  supporterName: string
  supporterAvatarUrl: string
  amount: number
  donatedAt: string
}

export type FundingCampaign = {
  id: number
  hashedId: string
  title: string
  description: string
  ownerId: number
  imageUrl: string
  ownerName: string
  ownerAvatarUrl: string
  ownerUrl: string
  createdAt: string
  amount: number
  raised: number
  progress: number
  donorCount: number
  donated: boolean
  canDonate: boolean
  canManage: boolean
  isCompleted: boolean
  donations: FundingDonation[]
  detailUrl: string
  editUrl: string
}

export type FundingCatalog = {
  items: FundingCampaign[]
  canCreate: boolean
  currency: string
  currencySymbol: string
  hasMore: boolean
  nextOffset: number | null
}

export type FundingCatalogQuery = {
  tab?: FundingTabKey
  offset?: number | null
}

export type FundingDetail = {
  campaign: FundingCampaign
  canCreate: boolean
  currency: string
  currencySymbol: string
}

export type FundingCreateInput = {
  title: string
  amount: number
  description: string
  image: File
}

export type FundingUpdateInput = {
  title: string
  amount: number
  description: string
}
