# ListingPilot AI

ListingPilot AI creates a seller-facing home sale optimization report from real estate photos. The current product analyzes uploaded JPEG, PNG, and WebP photos with OpenAI Vision, ranks visible preparation opportunities, calculates property readiness, renders an in-app report, and exports a PDF.

## Requirements

- Node.js 20.x
- npm 10.x or newer

## Local Setup

```bash
npm install
```

Create a local environment file such as `.env.local`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4.1-mini
NEXT_PUBLIC_ENABLE_VISION_DEBUG=false
```

## Environment Variables

- `OPENAI_API_KEY`: Required. Server-side key used by `src/app/api/analyze-photos/route.ts`.
- `OPENAI_VISION_MODEL`: Optional. Defaults to `gpt-4.1-mini`.
- `NEXT_PUBLIC_ENABLE_VISION_DEBUG`: Optional. Set to `true` only in development when inspecting sanitized Vision diagnostics. Keep `false` for beta users and production.

## Commands

```bash
npm run dev
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

## Current Architecture

- `src/app/page.tsx`: Main client workflow for photo upload, validation feedback, Vision analysis orchestration, retrying failed photos, report preview, and PDF export.
- `src/app/api/analyze-photos/route.ts`: Server-only OpenAI Vision boundary. Validates request payloads, sanitizes errors, calls OpenAI, and returns per-photo success/failure results.
- `src/lib/analysis-schema.ts`: Shared upload limits, supported MIME types, request/response types, data URL parsing, validation helpers, and safe error messages.
- `src/lib/property-intelligence/*`: Room taxonomy, condition scoring, readiness scoring, seller talking points, improvement library, and recommendation ranking.
- `src/test/*` and `*.test.ts(x)`: Vitest test fixtures and automated coverage for validation, API behavior, recommendations, readiness, taxonomy, retry, and object URL cleanup.

## Beta Upload Limits

- Supported formats: JPEG, PNG, WebP
- Maximum photos: 30
- Maximum size per photo: 8 MB
- Maximum total decoded image payload: 80 MB
- Duplicate handling: same name, size, and MIME type is rejected client-side

## Known Limitations

- No database or saved report history yet.
- No authentication, billing, or user/team management.
- Market value/CMA content remains a placeholder and must be paired with agent pricing guidance.
- Image analysis depends on OpenAI availability and model quality.
- Invalid/corrupt image detection is best-effort in the browser and strict for server data URL/base64 payloads.
- PDF export is client-side and should be visually reviewed during real-photo beta validation.

## Deployment Checklist

- `OPENAI_API_KEY` configured in the deployment environment.
- `NEXT_PUBLIC_ENABLE_VISION_DEBUG=false`.
- `npm test` passes.
- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- Production smoke test verifies upload, analysis, failed-photo retry, report generation, and PDF export with beta-safe real photos.
