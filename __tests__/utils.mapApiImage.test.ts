import { mapApiImage } from "../src/lib/utils/profileImageUtils";

test("mapApiImage basic", () => {
  const apiImg = { _id: "1", storageId: "s1", url: "u" } as any;
  const mapped = mapApiImage(apiImg);
  expect(mapped).toEqual({ _id: "1", storageId: "s1", url: "u" });
});
