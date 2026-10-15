import type { UserRole } from "./schema.js";

// Public demo logins, shown on the sign-in page. Reset by `npm run seed`.
export const DEMO_PASSWORD = "letmeknock-demo";

export const DEMO_ACCOUNTS: Record<UserRole, { email: string; fullName: string }> = {
  student: { email: "demo-student@example.com", fullName: "Sam Student" },
  landlord: { email: "demo-landlord@example.com", fullName: "Lee Landlord" },
};
