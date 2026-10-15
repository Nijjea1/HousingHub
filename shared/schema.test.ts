import { describe, expect, it } from "vitest";
import { signUpSchema } from "./schema";

const valid = {
  fullName: "  Ava Chen ",
  email: "Ava@McMaster.ca",
  password: "longenough",
  confirmPassword: "longenough",
  role: "student",
  universityId: "mcmaster",
};

const errorsFor = (input: Record<string, unknown>) => {
  const result = signUpSchema.safeParse(input);
  return result.success ? {} : result.error.flatten().fieldErrors;
};

describe("signUpSchema", () => {
  it("accepts a valid sign-up and normalizes name and email", () => {
    const parsed = signUpSchema.parse(valid);
    expect(parsed.fullName).toBe("Ava Chen");
    expect(parsed.email).toBe("ava@mcmaster.ca");
  });

  it("rejects mismatched passwords on the confirm field", () => {
    expect(errorsFor({ ...valid, confirmPassword: "different1" }).confirmPassword).toEqual([
      "Passwords do not match",
    ]);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(errorsFor({ ...valid, password: "short", confirmPassword: "short" }).password).toBeDefined();
  });

  it("requires a university and a known role", () => {
    expect(errorsFor({ ...valid, universityId: "" }).universityId).toEqual(["Choose a university"]);
    expect(errorsFor({ ...valid, role: "admin" }).role).toBeDefined();
  });
});
