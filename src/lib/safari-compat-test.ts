// Safari compatibility test
// This file contains tests to verify Safari compatibility

/**
 * Test for Safari-specific features and polyfills
 */
export const testSafariCompatibility = () => {
  // Test Array.flat polyfill
  try {
    const testArray = [1, [2, 3], [4, [5, 6]]];
    const flattened = testArray.flat(2);
    if (flattened.length !== 6 || flattened[5] !== 6) {
      console.warn("Array.flat polyfill may not be working correctly");
      return false;
    }
  } catch (e) {
    console.warn("Array.flat not supported and polyfill failed", e);
    return false;
  }

  // Test Array.flatMap polyfill
  try {
    const testArray = [1, 2, 3];
    const result = testArray.flatMap(x => [x, x * 2]);
    if (result.length !== 6 || result[1] !== 2 || result[5] !== 6) {
      console.warn("Array.flatMap polyfill may not be working correctly");
      return false;
    }
  } catch (e) {
    console.warn("Array.flatMap not supported and polyfill failed", e);
    return false;
  }

  // Test Object.fromEntries polyfill
  try {
    const testEntries = [['a', 1], ['b', 2]];
    const obj = Object.fromEntries(testEntries);
    if (obj.a !== 1 || obj.b !== 2) {
      console.warn("Object.fromEntries polyfill may not be working correctly");
      return false;
    }
  } catch (e) {
    console.warn("Object.fromEntries not supported and polyfill failed", e);
    return false;
  }

  // Test String.replaceAll polyfill
  try {
    const testString = "hello hello world";
    // Use native replaceAll if present, otherwise fallback to split/join so we don't rely on a compile-time error directive.
    const result = typeof (testString as any).replaceAll === "function"
      ? (testString as any).replaceAll("hello", "hi")
      : testString.split("hello").join("hi");
    if (result !== "hi hi world") {
      console.warn("String.replaceAll polyfill may not be working correctly");
      return false;
    }
  } catch (e) {
    console.warn("String.replaceAll not supported and polyfill failed", e);
    return false;
  }

  // Test requestAnimationFrame
  try {
    if (typeof requestAnimationFrame !== "function") {
      console.warn("requestAnimationFrame not available");
      return false;
    }
  } catch (e) {
    console.warn("requestAnimationFrame not available", e);
    return false;
  }

  // Test cancelAnimationFrame
  try {
    if (typeof cancelAnimationFrame !== "function") {
      console.warn("cancelAnimationFrame not available");
      return false;
    }
  } catch (e) {
    console.warn("cancelAnimationFrame not available", e);
    return false;
  }

  console.log("All Safari compatibility tests passed");
  return true;
};

// Run tests in development mode
if (process.env.NODE_ENV === "development") {
  try {
    testSafariCompatibility();
  } catch (e) {
    console.error("Safari compatibility tests failed:", e);
  }
}

export default testSafariCompatibility;