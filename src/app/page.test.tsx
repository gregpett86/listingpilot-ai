import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";
import { validPngBase64 } from "@/test/fixtures/images";

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

function uploadInput(container: HTMLElement) {
  const input = container.querySelector("input[type='file']");

  if (!(input instanceof HTMLInputElement)) {
    throw new Error("File input not found");
  }

  return input;
}

describe("ListingPilot page", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/photo");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("rejects unsupported uploads before analysis", async () => {
    const { container } = render(<Home />);
    const input = uploadInput(container);
    const user = userEvent.setup({ applyAccept: false });
    const badFile = new File(["not an image"], "notes.txt", {
      type: "text/plain",
    });

    await user.upload(input, badFile);

    expect(
      await screen.findByText("notes.txt: Only JPEG, PNG, and WebP photos are supported."),
    ).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("cleans up object URLs on unmount", async () => {
    const { container, unmount } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile());
    expect(await screen.findByText("kitchen.png")).toBeInTheDocument();

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/photo",
    );
  });

  it("retries failed photos without duplicating successful findings", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      callCount += 1;
      const payload = JSON.parse(String(init?.body)) as {
        photos: Array<{ id: string; name: string }>;
      };
      const requestPhoto = payload.photos[0];

      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            findings: [],
            failedPhotos: [
              {
                photoId: requestPhoto.id,
                name: requestPhoto.name,
                status: "failed",
                errorType: "no_analysis_result",
                message: "No analysis result was returned for this photo.",
              },
            ],
            photoResults: [],
            requestedPhotoCount: 1,
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          findings: [
            {
              photoId: requestPhoto.id,
              roomType: "Kitchen",
              condition: "Average",
              confidence: "High",
              opportunities: ["cabinet hardware"],
            },
          ],
          failedPhotos: [],
          photoResults: [],
          requestedPhotoCount: 1,
        }),
        { status: 200 },
      );
    });
    global.fetch = fetchMock;
    const { container } = render(<Home />);

    await userEvent.upload(uploadInput(container), pngFile());
    await userEvent.click(
      screen.getAllByRole("button", { name: "Run AI Analysis" }).at(-1)!,
    );

    await screen.findByText("No analysis result was returned for this photo.");
    await userEvent.click(
      screen.getByRole("button", { name: "Retry Failed Photos" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstPayload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    ) as { photos: Array<{ id: string }> };
    const retryPayload = JSON.parse(
      String((fetchMock.mock.calls[1][1] as RequestInit).body),
    ) as { photos: Array<{ id: string }> };

    expect(firstPayload.photos).toHaveLength(1);
    expect(retryPayload.photos).toHaveLength(1);
    expect(retryPayload.photos[0].id).toBe(firstPayload.photos[0].id);
  });
});
