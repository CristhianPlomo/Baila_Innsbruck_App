export type HomeOfferTone = "gold" | "turquoise" | "sand";

export type HomeOffer = {
  id: string;
  tone: HomeOfferTone;
  titleKey: string;
  copyKey: string;
  tagKey: string;
  ctaKey: string;
  href: string;
};

export type HomeFeaturedEvent = {
  id: string;
  title: string;
  titleKey?: string;
  type: string;
  date: string;
  location: string;
  locationKey?: string;
};

export const fallbackFeaturedEvents: HomeFeaturedEvent[] = [
  { id: "construction-summer-workshop", title: "Summer movement workshop", titleKey: "eventTitles.summerWorkshop", type: "workshop", date: "12–13 Jul 2026", location: "Baila Studio · Innsbruck", locationKey: "studioLocation" },
  { id: "construction-community-night", title: "Baila community night", titleKey: "eventTitles.communitySocial", type: "social", date: "25 Jul 2026 · 20:00", location: "KulturQuartier · Innsbruck", locationKey: "socialLocation" },
];

export const homeOffers: HomeOffer[] = [
  { id: "seasonal-offer", tone: "gold", titleKey: "homeOffers.seasonalTitle", copyKey: "homeOffers.seasonalCopy", tagKey: "homeOffers.seasonalTag", ctaKey: "homeOffers.exploreCta", href: "/courses" },
  { id: "member-rate", tone: "turquoise", titleKey: "homeOffers.memberTitle", copyKey: "homeOffers.memberCopy", tagKey: "homeOffers.memberTag", ctaKey: "homeOffers.memberCta", href: "/orders?product=membership#checkout" },
  { id: "flexible-package", tone: "sand", titleKey: "homeOffers.packageTitle", copyKey: "homeOffers.packageCopy", tagKey: "homeOffers.packageTag", ctaKey: "homeOffers.exploreCta", href: "/courses" },
];
