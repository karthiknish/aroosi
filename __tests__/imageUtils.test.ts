import {
  mapApiImage,
  getOrderedImages,
} from "../src/lib/utils/profileImageUtils";

describe("mapApiImage", () => {
  it("maps API image to UI image", () => {
    const api = { _id: "1", storageId: "s1", url: "u" };
    expect(mapApiImage(api)).toEqual({ _id: "1", storageId: "s1", url: "u" });
  });
});

describe("getOrderedImages", () => {
  const images = [
    { _id: "1", storageId: "a", url: "u1" },
    { _id: "2", storageId: "b", url: "u2" },
  ];
  it("returns mapped images when no order", () => {
    expect(getOrderedImages([], images)).toEqual([
      { _id: "a", storageId: "a", url: "u1" },
      { _id: "b", storageId: "b", url: "u2" },
    ]);
  });
  it("orders images when order provided", () => {
    const result = getOrderedImages(["b", "a"], images);
    expect(result.map((i) => i.storageId)).toEqual(["b", "a"]);
  });
});
