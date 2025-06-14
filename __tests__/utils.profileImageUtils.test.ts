/* eslint-disable */
import {
  getOrderedImages,
  mapApiImage,
} from "../src/lib/utils/profileImageUtils";

describe("profileImageUtils helpers", () => {
  describe("mapApiImage", () => {
    it("maps API image to UI format", () => {
      const apiImg = { _id: "1", storageId: "s1", url: "u" } as any;
      expect(mapApiImage(apiImg)).toEqual({
        _id: "1",
        storageId: "s1",
        url: "u",
      });
    });
  });

  describe("getOrderedImages", () => {
    const mapped = [
      { _id: "1", storageId: "1", url: "a" },
      { _id: "2", storageId: "2", url: "b" },
      { _id: "3", storageId: "3", url: "c" },
    ];

    it("returns mapped order when no order provided", () => {
      const result = getOrderedImages([], mapped);
      // should preserve original order & keep _id
      expect(result).toEqual(
        mapped.map((m) => ({ _id: m._id, storageId: m.storageId, url: m.url }))
      );
    });

    it("returns images in given order", () => {
      const order = ["3", "1"];
      const result = getOrderedImages(order, mapped);
      expect(result.map((i) => i.storageId)).toEqual(order);
    });
  });
});
