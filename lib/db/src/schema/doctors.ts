import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const doctorsTable = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email").notNull(),
  photoUrl: text("photo_url"),
  degree: text("degree"),
  departmentId: integer("department_id"),
  specialtyId: integer("specialty_id"),
  locationId: integer("location_id"),
  countryId: integer("country_id"),
  cityId: integer("city_id"),
  timezone: text("timezone"),
  experience: integer("experience"),
  chamberAddress: text("chamber_address"),
  visitingTime: text("visiting_time"),
  chamberAddress2: text("chamber_address_2"),
  visitingTime2: text("visiting_time_2"),
  consultationFee: integer("consultation_fee"),
  bmdcNumber: text("bmdc_number"),
  bmdcFile: text("bmdc_file"),
  bmdcValidityYears: integer("bmdc_validity_years"),
  subscriptionFee: integer("subscription_fee").default(0),
  // Billing currency resolved from the doctor's IP-derived country at
  // registration time ("BD" -> BDT, everything else -> USD). Persisted so
  // renewal/payment billing stays consistent even if the doctor later
  // connects from a different country.
  currency: text("currency").notNull().default("BDT"),
  approvalStatus: text("approval_status").notNull().default("pending"),
  isFeatured: boolean("is_featured").default(false),
  isSenior: boolean("is_senior").default(false),
  isVerified: boolean("is_verified").default(false),
  onlineConsultationAvailable: boolean("online_consultation_available").default(false),
  emergencyAvailable: boolean("emergency_available").default(false),
  onlineStatus: text("online_status").default("offline"),
  breakUntil: timestamp("break_until", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  about: text("about"),
  services: text("services"),
  education: text("education"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctorsTable.$inferSelect;
