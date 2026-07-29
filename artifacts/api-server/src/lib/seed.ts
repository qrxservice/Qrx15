import { db, usersTable, doctorsTable, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { hashPassword } from "./password";

const DEFAULT_DEPARTMENTS = [
  { name: "General Medicine",       icon: "💊", description: "Primary care and internal medicine" },
  { name: "Surgery",                icon: "🔪", description: "General and specialist surgical procedures" },
  { name: "Cardiology",             icon: "🫀", description: "Heart and cardiovascular system" },
  { name: "Orthopedics",            icon: "🦴", description: "Bones, joints, and musculoskeletal system" },
  { name: "Gynecology & Obstetrics",icon: "🤰", description: "Women's reproductive health and pregnancy" },
  { name: "Pediatrics",             icon: "👶", description: "Medical care for infants, children and adolescents" },
  { name: "Neurology",              icon: "🧠", description: "Brain, spinal cord and nervous system" },
  { name: "Dermatology",            icon: "🔬", description: "Skin, hair and nail conditions" },
  { name: "Ophthalmology",          icon: "👁️", description: "Eye care and vision disorders" },
  { name: "ENT",                    icon: "👂", description: "Ear, nose and throat diseases" },
  { name: "Psychiatry",             icon: "🧩", description: "Mental health and behavioral disorders" },
  { name: "Urology",                icon: "💧", description: "Urinary tract and male reproductive system" },
  { name: "Endocrinology",          icon: "🧬", description: "Hormonal and metabolic disorders" },
  { name: "Gastroenterology",       icon: "🧪", description: "Digestive system and gastrointestinal tract" },
  { name: "Pulmonology",            icon: "🫁", description: "Lungs and respiratory system" },
  { name: "Nephrology",             icon: "🩻", description: "Kidney diseases and renal care" },
  { name: "Oncology",               icon: "🎗️", description: "Cancer diagnosis and treatment" },
  { name: "Rheumatology",           icon: "💪", description: "Arthritis and autoimmune diseases" },
  { name: "Dentistry",              icon: "🦷", description: "Oral health, teeth and gums" },
  { name: "Radiology",              icon: "📡", description: "Medical imaging and diagnostics" },
  { name: "Anesthesiology",         icon: "💉", description: "Anesthesia and pain management" },
  { name: "Emergency Medicine",     icon: "🚑", description: "Acute and emergency care" },
  { name: "Hematology",             icon: "🩸", description: "Blood disorders and diseases" },
  { name: "Physiotherapy",          icon: "🏃", description: "Physical rehabilitation and therapy" },
  { name: "Hepatology",             icon: "🧫", description: "Liver, gallbladder and pancreas" },
];

export async function seedDepartments() {
  try {
    const existing = await db.select({ id: departmentsTable.id, name: departmentsTable.name, icon: departmentsTable.icon })
      .from(departmentsTable);
    const byName = Object.fromEntries(existing.map(d => [d.name, d]));

    for (const dept of DEFAULT_DEPARTMENTS) {
      const found = byName[dept.name];
      if (!found) {
        await db.insert(departmentsTable).values(dept);
        logger.info(`Seeded department: ${dept.name}`);
      } else if (!found.icon) {
        // Back-fill missing icons
        await db.update(departmentsTable).set({ icon: dept.icon }).where(eq(departmentsTable.id, found.id));
        logger.info(`Updated icon for department: ${dept.name}`);
      }
    }
  } catch (err) {
    logger.warn({ err }, "seed: could not seed departments (non-fatal)");
  }
}

export async function seedDefaultUsers() {
  await seedDepartments();
  try {
    // 1. Seed admin
    const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@qrx.com.bd"));
    if (!existingAdmin) {
      await db.insert(usersTable).values({ email: "admin@qrx.com.bd", password: await hashPassword("admin123"), name: "Admin", role: "admin" });
      logger.info("Seeded default admin user");
    }

    // 2. Seed doctor user + doctors table entry (linked)
    let [doctorUser] = await db.select().from(usersTable).where(eq(usersTable.email, "amir@example.com"));
    if (!doctorUser) {
      [doctorUser] = await db.insert(usersTable).values({
        email: "amir@example.com", password: await hashPassword("doctor123"), name: "Dr. Amir Hossain", role: "doctor",
      }).returning();
      logger.info("Seeded default doctor user");
    }

    // Ensure doctor has a doctors table entry and doctorId is linked
    if (doctorUser) {
      let [doctorProfile] = doctorUser.doctorId
        ? await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorUser.doctorId))
        : [];

      if (!doctorProfile) {
        // Create doctor profile entry
        [doctorProfile] = await db.insert(doctorsTable).values({
          name: "Dr. Amir Hossain",
          email: "amir@example.com",
          phone: "01700000000",
          degree: "MBBS, FCPS",
          chamberAddress: "QRX Medical Center, Dhaka",
          visitingTime: "Sat-Thu: 10am-2pm",
          consultationFee: 500,
          bmdcNumber: "A-12345",
          bmdcValidityYears: 3,
          approvalStatus: "approved",
          userId: doctorUser.id,
          isVerified: true,
        }).returning();
        logger.info("Seeded default doctor profile");
      }

      // Link users.doctorId if not already set
      if (doctorProfile && doctorUser.doctorId !== doctorProfile.id) {
        await db.update(usersTable)
          .set({ doctorId: doctorProfile.id })
          .where(eq(usersTable.id, doctorUser.id));
        logger.info(`Linked doctor user ${doctorUser.email} → doctors.id=${doctorProfile.id}`);
      }
    }

    // 3. Seed patient
    const [existingPatient] = await db.select().from(usersTable).where(eq(usersTable.email, "patient@example.com"));
    if (!existingPatient) {
      await db.insert(usersTable).values({ email: "patient@example.com", password: await hashPassword("patient123"), name: "Test Patient", role: "patient" });
      logger.info("Seeded default patient user");
    }

  } catch (err) {
    logger.warn({ err }, "seed: could not seed default users (non-fatal)");
  }
}
