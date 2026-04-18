import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);

// Set test env defaults
// NODE_ENV is read-only in some TS configs — set via env variable instead
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_placeholder";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_placeholder";
process.env.STRIPE_PREMIUM_PRICE_ID = "price_placeholder";
process.env.NEXTAUTH_SECRET = "test_secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
