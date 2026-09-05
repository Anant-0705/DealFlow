import { describe, expect, it } from "vitest";
import { uploadToStorage, getFromStorage, deleteFromStorage } from "./storage";

describe("Storage module", () => {
  it("uploads buffer to storage and retrieves it", async () => {
    const testContent = Buffer.from("test-image-content-dealflow");
    const result = await uploadToStorage({
      file: testContent,
      filename: "test-logo.png",
      contentType: "image/png",
      folder: "company",
    });

    expect(result.url).toBeDefined();
    expect(result.key).toContain("company/test-logo");

    const retrieved = await getFromStorage(result.key);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.contentType).toBe("image/png");
    expect(retrieved?.buffer.toString()).toBe("test-image-content-dealflow");

    // Clean up
    await deleteFromStorage(result.key);
  });

  it("handles empty key gracefully in delete and get", async () => {
    expect(await getFromStorage("")).toBeNull();
    await expect(deleteFromStorage("")).resolves.not.toThrow();
  });
});
