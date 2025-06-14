import { getOrderedImages } from "../src/lib/utils/profileImageUtils";

describe("getOrderedImages", () => {
  const images = [
    { _id: "1", storageId: "1", url: "u1" },
    { _id: "2", storageId: "2", url: "u2" },
    { _id: "3", storageId: "3", url: "u3" },
  ];

  it("returns ordered array matching imageOrder", () => {
    const order = ["3", "1", "2"];
    const result = getOrderedImages(order, images);
    expect(result.map((i) => i.storageId)).toEqual(order);
  });

  it("falls back to natural order when order array empty", () => {
    const result = getOrderedImages([], images);
    expect(result.map((i) => i.storageId)).toEqual(["1", "2", "3"]);
  });
});
