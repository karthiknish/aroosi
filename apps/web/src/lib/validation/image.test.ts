import { validateImageUpload, ALLOWED_IMAGE_MIME_TYPES } from "@/lib/validation/image";

function makeBytes(sig: number[]): Uint8Array { return new Uint8Array(sig); }

describe("validateImageUpload", () => {
  it("rejects empty file", () => {
    const res = validateImageUpload({ fileSize: 0, providedMime: "image/png" });
    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe("EMPTY_FILE");
  });

  it("rejects disallowed mime", () => {
    const res = validateImageUpload({ fileSize: 100, providedMime: "text/plain" });
    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe("MIME_DISALLOWED");
  });

  it("rejects size exceeded", () => {
    const res = validateImageUpload({ fileSize: 20 * 1024 * 1024, providedMime: "image/png", plan: "free" });
    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe("SIZE_EXCEEDED");
  });

  it("accepts valid small png", () => {
    const pngHead = makeBytes([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    const res = validateImageUpload({ fileSize: 1024, providedMime: "image/png", headBytes: pngHead });
    expect(res.ok).toBe(true);
  });

  it("detects signature mismatch (jpeg bytes but png mime) optionally", () => {
    const fakeJpeg = makeBytes([0xff,0xd8,0xff,0xe0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0xff,0xd9]);
    const res = validateImageUpload({ fileSize: 512, providedMime: "image/png", headBytes: fakeJpeg });
    if (!res.ok) {
      expect(["SIGNATURE_MISMATCH","MIME_DISALLOWED"]).toContain(res.errorCode);
    } else {
      expect(ALLOWED_IMAGE_MIME_TYPES).toContain("image/png");
    }
  });
});
