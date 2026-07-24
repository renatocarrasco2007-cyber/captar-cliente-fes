import type { LeadStatus } from "@/db/schema";

export type LeadDTO = {
  id: string;
  batchId: string;
  placeId: string;
  name: string;
  category: string;
  searchArea: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  rating: number | null;
  userRatingCount: number | null;
  status: LeadStatus;
  notes: string | null;
  contactedAt: string | null;
  createdAt: string;
};

export type BatchDTO = {
  id: string;
  weekStart: string;
  weekEnd: string;
  leadCount: number;
  createdAt: string;
};
