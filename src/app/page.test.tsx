import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";
import { validPngBase64 } from "@/test/fixtures/images";

const { pdfTextLog } = vi.hoisted(() => ({
  pdfTextLog: [] as string[],
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    addPage() {}
    getNumberOfPages() {
      return 1;
    }
    line() {}
    rect() {}
    save() {}
    setDrawColor() {}
    setFillColor() {}
    setFont() {}
    setFontSize() {}
    setPage() {}
    setTextColor() {}
    splitTextToSize(text: string | string[]) {
      return Array.isArray(text) ? text : [text];
    }
    text(text: string | string[]) {
      if (Array.isArray(text)) {
        pdfTextLog.push(...text);
      } else {
        pdfTextLog.push(text);
      }
    }
  },
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={String(props.alt ?? "")}
      {...Object.fromEntries(
        Object.entries(props).filter(
          ([key]) => key !== "priority" && key !== "alt",
        ),
      )}
    />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

function pngFile(name = "kitchen.png") {
  const bytes = Uint8Array.from(Buffer.from(validPngBase64, "base64"));
  return new File([bytes], name, { type: "image/png" });
}

function visionFinding(
  photoId: string,
  suggestedCategory = "Kitchen",
  visibleFindings = ["cabinet hardware"],
) {
  return {
    photoId,
    assignedCategory: suggestedCategory,
    suggestedCategory,
    categoryMismatch: false,
    condition: "Average",
    confidence: "High",
    visibleFindings,
    explicitlySupportedRecommendations: ["Cabinet hardware refresh"],
    evidenceForEachRecommendation: [
      {
        recommendation: "Cabinet hardware refresh",
        evidence: visibleFindings[0] ?? "visible finding",
      },
    ],
  };
}

function synthesisResponse() {
  return new Response(
    JSON.stringify({
      wholePropertyAnalysis: {
        executiveSummary:
          "This home already presents very well, with the kitchen giving the listing a bright, polished first impression.",
        overallCondition: "Strong visible presentation.",
        buyerAppeal:
          "The home should appeal to buyers looking for a clean, photo-ready presentation.",
        listingReadinessNarrative:
          "The property is close to listing ready after targeted cosmetic preparation.",
        topSellingFeatures: [
          "Bright kitchen",
          "Clean shared spaces",
          "Strong first impression",
        ],
        topImprovementPriorities: ["Refresh visible cabinet hardware"],
        stagingObservations: ["Keep counters clear for listing photos"],
        overallConfidence: "High",
        marketingHighlights: [
          "Excellent natural lighting",
          "Move-in-ready presentation",
        ],
      },
      usedFallback: false,
    }),
    { status: 200 },
  );
}

function uploadInput(container: HTMLElement) {
  const input = container.querySelector("input[type='file']");

  if (!(input instanceof HTMLInputElement)) {
    throw new Error("File input not found");
  }

  return input;
}

function mockSuccessfulClassification() {
  return vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).includes("/api/synthesize-report")) {
      return synthesisResponse();
    }

    const payload = JSON.parse(String(init?.body)) as {
      photos: Array<{ id: string }>;
    };

    return new Response(
      JSON.stringify({
        findings: payload.photos.map((photo) => visionFinding(photo.id)),
        failedPhotos: [],
        photoResults: [],
        requestedPhotoCount: payload.photos.length,
      }),
      { status: 200 },
    );
  });
}

describe("ListingPilot page", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    pdfTextLog.length = 0;
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/photo");
    URL.revokeObjectURL = vi.fn();
    global.fetch = mockSuccessfulClassification();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("rejects unsupported uploads before analysis without showing filenames", async () => {
    const { container } = render(<Home />);
    const user = userEvent.setup({ applyAccept: false });
    const badFile = new File(["not an image"], "notes.txt", {
      type: "text/plain",
    });

    await user.upload(uploadInput(container), badFile);

    expect(
      await screen.findByText("Only JPEG, PNG, and WebP photos are supported."),
    ).toBeInTheDocument();
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("does not render raw debug JSON, trace cards, provider payloads, or a classify button", () => {
    render(<Home />);

    expect(screen.queryByText("Real-Photo Validation")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw Vision JSON")).not.toBeInTheDocument();
    expect(screen.queryByText("Pipeline Trace")).not.toBeInTheDocument();
    expect(screen.queryByText("Button Enabled")).not.toBeInTheDocument();
    expect(screen.queryByText("uploadedPhotoCount")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Classify Photos" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Not analyzed")).not.toBeInTheDocument();
  });

  it("cleans up object URLs on unmount and never shows generated filenames", async () => {
    const { container, unmount } = render(<Home />);

    await userEvent.upload(
      uploadInput(container),
      pngFile("hash-like-name-abc123.png"),
    );
    expect(await screen.findByText("Photo 1")).toBeInTheDocument();
    expect(
      screen.queryByText("hash-like-name-abc123.png"),
    ).not.toBeInTheDocument();

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/photo",
    );
  });

  it("uses friendly labels, accepts only the first 20 photos, and makes one batched request", async () => {
    const fetchMock = mockSuccessfulClassification();
    global.fetch = fetchMock;
    const { container } = render(<Home />);
    const files = Array.from({ length: 22 }, (_, index) =>
      pngFile(`generated-${index + 1}.png`),
    );

    await userEvent.upload(uploadInput(container), files);

    expect(
      await screen.findByText(
        "You can upload up to 20 photos per report. We added the first available photos and skipped the rest.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    ) as { photos: unknown[] };

    expect(payload.photos).toHaveLength(20);
    expect(screen.getByText("Photo 1")).toBeInTheDocument();
    expect(screen.getByText("Photo 20")).toBeInTheDocument();
    expect(screen.queryByText("Photo 21")).not.toBeInTheDocument();
    expect(screen.queryByText("generated-1.png")).not.toBeInTheDocument();
  });

  it("shows one clean limit message when already at 20 photos", async () => {
    const { container } = render(<Home />);
    const files = Array.from({ length: 20 }, (_, index) =>
      pngFile(`photo-${index + 1}.png`),
    );

    await userEvent.upload(uploadInput(container), files);
    await screen.findByText("Photo 20");
    await userEvent.upload(uploadInput(container), pngFile("extra.png"));

    expect(
      await screen.findByText(
        "You have reached the 20-photo limit. Remove a photo before adding another.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("extra.png")).not.toBeInTheDocument();
  });

  it("starts classification automatically, populates the dropdown, and enables report generation after analysis", async () => {
    const fetchMock = mockSuccessfulClassification();
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile());

    expect(await screen.findByText("Analyzing...")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toHaveValue("Kitchen"),
    );
    expect(screen.getByText("AI identified")).toBeInTheDocument();
    expect(screen.getByText("Analysis Progress")).toBeInTheDocument();
    expect(screen.getByText("1 completed / 0 remaining")).toBeInTheDocument();
    expect(screen.getByText("AI Room")).toBeInTheDocument();
    expect(screen.getByText("Condition")).toBeInTheDocument();
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate Report" }),
    ).toBeEnabled();
  });

  it("adds later photos with a second request for only the new photo", async () => {
    const fetchMock = mockSuccessfulClassification();
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile("first.png"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await userEvent.upload(uploadInput(container), pngFile("second.png"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstPayload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    ) as { photos: unknown[] };
    const secondPayload = JSON.parse(
      String((fetchMock.mock.calls[1][1] as RequestInit).body),
    ) as { photos: unknown[] };

    expect(firstPayload.photos).toHaveLength(1);
    expect(secondPayload.photos).toHaveLength(1);
  });

  it("prevents overlapping classification requests and processes queued uploads afterward", async () => {
    let resolveFirst: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        photos: Array<{ id: string }>;
      };
      const response = new Response(
        JSON.stringify({
          findings: payload.photos.map((photo) => visionFinding(photo.id)),
          failedPhotos: [],
          photoResults: [],
          requestedPhotoCount: payload.photos.length,
        }),
        { status: 200 },
      );

      if (fetchMock.mock.calls.length === 1) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      }

      return Promise.resolve(response);
    });
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile("first.png"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await userEvent.upload(uploadInput(container), pngFile("second.png"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFirst(
      new Response(
        JSON.stringify({
          findings: [visionFinding("stale-id")],
          failedPhotos: [],
          photoResults: [],
          requestedPhotoCount: 1,
        }),
        { status: 200 },
      ),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondPayload = JSON.parse(
      String((fetchMock.mock.calls[1][1] as RequestInit).body),
    ) as { photos: unknown[] };

    expect(secondPayload.photos).toHaveLength(1);
  });

  it("keeps an agent correction authoritative during retry", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      callCount += 1;
      const payload = JSON.parse(String(init?.body)) as {
        photos: Array<{ id: string; name: string; assignedCategory?: string }>;
      };

      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            findings: [visionFinding(payload.photos[0].id, "Kitchen")],
            failedPhotos: [
              {
                photoId: payload.photos[1].id,
                name: payload.photos[1].name,
                status: "failed",
                errorType: "no_analysis_result",
                message: "No analysis result was returned for this photo.",
              },
            ],
            photoResults: [],
            requestedPhotoCount: 2,
          }),
          { status: 200 },
        );
      }

      expect(payload.photos[0].assignedCategory).toBeUndefined();

      return new Response(
        JSON.stringify({
          findings: [visionFinding(payload.photos[0].id, "Exterior")],
          failedPhotos: [],
          photoResults: [],
          requestedPhotoCount: 1,
        }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), [
      pngFile("first.png"),
      pngFile("second.png"),
    ]);

    await screen.findAllByText("Analysis unavailable");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "Bathroom");
    expect(selects[0]).toHaveValue("Bathroom");

    await userEvent.click(screen.getByRole("button", { name: "Retry photo" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(selects[0]).toHaveValue("Bathroom");
  });

  it("ignores stale results when a photo is removed during analysis", async () => {
    let resolveAnalysis: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        photos: Array<{ id: string }>;
      };

      return new Promise<Response>((resolve) => {
        resolveAnalysis = () =>
          resolve(
            new Response(
              JSON.stringify({
                findings: [visionFinding(payload.photos[0].id, "Kitchen")],
                failedPhotos: [],
                photoResults: [],
                requestedPhotoCount: 1,
              }),
              { status: 200 },
            ),
          );
      });
    });
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile("remove-me.png"));
    await screen.findAllByText("Photo 1");
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    resolveAnalysis(
      new Response(
        JSON.stringify({
          findings: [],
          failedPhotos: [],
          photoResults: [],
          requestedPhotoCount: 1,
        }),
        { status: 200 },
      ),
    );

    await waitFor(() =>
      expect(screen.queryByText("Photo 1")).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("keeps report generation disabled while classification is running", async () => {
    const fetchMock = vi.fn(
      () => new Promise<Response>(() => undefined),
    );
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile());

    expect(await screen.findByText("Analyzing...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate Report" }),
    ).toBeDisabled();
  });

  it("generates a report from successful photos and excludes failed photos", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("/api/synthesize-report")) {
        return synthesisResponse();
      }

      const payload = JSON.parse(String(init?.body)) as {
        photos: Array<{ id: string; name: string }>;
      };

      return new Response(
        JSON.stringify({
          findings: [visionFinding(payload.photos[0].id, "Kitchen")],
          failedPhotos: [
            {
              photoId: payload.photos[1].id,
              name: payload.photos[1].name,
              status: "failed",
              errorType: "no_analysis_result",
              message: "No analysis result was returned for this photo.",
            },
          ],
          photoResults: [],
          requestedPhotoCount: 2,
        }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), [
      pngFile("scored.png"),
      pngFile("failed.png"),
    ]);
    await screen.findAllByText("Analysis unavailable");
    await userEvent.click(
      screen.getByRole("button", { name: "Generate Report" }),
    );

    expect(await screen.findByText("C. Listing Readiness")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This home already presents very well, with the kitchen giving the listing a bright, polished first impression.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("D. Top Selling Features")).toBeInTheDocument();
    expect(
      screen.getByText("E. Highest-Impact Preparation Priorities"),
    ).toBeInTheDocument();
    expect(screen.getByText("F. Room-by-Room Summary")).toBeInTheDocument();
    expect(
      screen.getByText("G. Seller Preparation Checklist"),
    ).toBeInTheDocument();
    expect(screen.getByText("Optional Enhancements")).toBeInTheDocument();
    expect(screen.getAllByText(/Quick Win/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Estimated time: Under 1 hour/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("I. Important Limitations / Agent Review Note"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/based only on visible presentation/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Investment")).not.toBeInTheDocument();
    expect(screen.queryByText("Added Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Current Market Value")).not.toBeInTheDocument();
    expect(screen.queryByText(/\$[0-9]/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ROI/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Analysis unavailable").length).toBeGreaterThan(0);
    expect(screen.queryByText("failed.png")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    const pdfText = pdfTextLog.join(" ");
    expect(pdfText).toContain("Home Sale Readiness Report");
    expect(pdfText).toContain("G. Seller Preparation Checklist");
    expect(pdfText).not.toContain("failed.png");
    expect(pdfText).not.toContain("scored.png");
    expect(pdfText).not.toContain("photo-");
    expect(pdfText).not.toContain("Raw Vision JSON");
    expect(pdfText).not.toContain("Estimated Cost");
    expect(pdfText).not.toContain("Added Value");
  });

  it("uses fallback synthesis when the whole-property pass fails", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("/api/synthesize-report")) {
        return new Response(JSON.stringify({ error: "unavailable" }), {
          status: 502,
        });
      }

      const payload = JSON.parse(String(init?.body)) as {
        photos: Array<{ id: string }>;
      };

      return new Response(
        JSON.stringify({
          findings: payload.photos.map((photo) => visionFinding(photo.id)),
          failedPhotos: [],
          photoResults: [],
          requestedPhotoCount: payload.photos.length,
        }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile("fallback.png"));
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Kitchen"));
    await userEvent.click(
      screen.getByRole("button", { name: "Generate Report" }),
    );

    expect(await screen.findByText("B. Executive Summary")).toBeInTheDocument();
    expect(screen.getAllByText(/uploaded photos/i).length).toBeGreaterThan(0);
    expect(screen.getByText("C. Listing Readiness")).toBeInTheDocument();
  });

  it("shows a clean duplicate message without filenames", async () => {
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile("duplicate.png"));
    await screen.findByText("Photo 1");
    await userEvent.upload(uploadInput(container), pngFile("duplicate.png"));

    expect(
      await screen.findByText("Duplicate photo skipped."),
    ).toBeInTheDocument();
    expect(screen.queryByText("duplicate.png")).not.toBeInTheDocument();
  });
});
