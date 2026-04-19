import { beforeEach } from "vitest";
import { resetEverythingToDefaults } from "../src/initRepository.ts";

// Ensure JWT_SECRET is always set in tests so a local .env file isn't required
process.env.JWT_SECRET ??= "test-secret";

beforeEach(async () => {
  await resetEverythingToDefaults();
});
