import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  uuid,
  date,
} from "drizzle-orm/pg-core";

export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  leadCount: integer("lead_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const LEAD_STATUSES = [
  "pendiente",
  "contactado",
  "interesado",
  "no_interesado",
  "descartado",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  searchArea: text("search_area").notNull(),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  mapsUrl: text("maps_url"),
  rating: real("rating"),
  userRatingCount: integer("user_rating_count"),
  lat: real("lat"),
  lng: real("lng"),
  status: text("status").$type<LeadStatus>().notNull().default("pendiente"),
  notes: text("notes"),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
