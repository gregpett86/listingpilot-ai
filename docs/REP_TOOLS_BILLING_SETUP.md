# Realty Edge Tools signup and billing

Price: $49/month for CMA Builder + Listing AI.

## Testing mode
REP_TOOLS_BILLING_MODE=open

## Paid mode
REP_TOOLS_BILLING_MODE=paid

Required Vercel environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_REP_TOOLS_PRICE_ID
- NEXT_PUBLIC_APP_URL
- REP_TOOLS_BILLING_MODE=paid

Before switching to paid mode, run supabase/rep-tools-memberships.sql in Supabase.

In Stripe create one recurring $49/month Price for Realty Edge Tools and put its price_... ID into STRIPE_REP_TOOLS_PRICE_ID.

Signup flow: create account -> embedded Stripe subscription payment -> verify payment -> activate dashboard membership.
