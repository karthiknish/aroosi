/* eslint-disable */
require("@testing-library/jest-dom");

// Mock next/navigation for all tests (App Router hooks)
jest.mock("next/navigation", () => {
  const pushReplace = jest.fn();
  return {
    __esModule: true,
    useRouter: () => ({
      push: pushReplace,
      replace: pushReplace,
      prefetch: jest.fn(),
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
  };
});

// Minimal Fetch API polyfill for tests (avoid extra deps)
if (typeof global.Request === "undefined") {
  // Simple stub with writable url property
  global.Request = class {
    constructor(input, init = {}) {
      Object.defineProperty(this, "url", {
        value: String(input),
        writable: true,
      });
      this.method = init.method || "GET";
      this.headers = init.headers || {};
      this.body = init.body;
    }
  };
}

if (typeof global.Response === "undefined") {
  global.Response = class {
    constructor(body = null, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = init.headers || {};
    }
    json() {
      return Promise.resolve(this.body);
    }
  };
}

// Stub AuthProvider using static relative path to avoid hoisting issues
jest.mock("./src/components/AuthProvider", () => ({
  __esModule: true,
  useAuthContext: () => ({
    token: "jest-token",
    isLoaded: true,
    isSignedIn: true,
    isProfileComplete: true,
    isOnboardingComplete: true,
    isLoading: false,
  }),
}));

// Stub next/server exports used in API route unit tests
jest.mock("next/server", () => {
  class NextRequestMock {
    constructor(input, init = {}) {
      Object.defineProperty(this, "url", {
        value: String(input),
        writable: true,
      });
      this.method = init.method || "GET";
      const hdrs = init.headers || {};
      this.headers = {
        get: (key) => {
          const k = Object.keys(hdrs).find(
            (h) => h.toLowerCase() === key.toLowerCase()
          );
          return k ? hdrs[k] : null;
        },
      };
      this.body = init.body;
    }
  }
  class NextResponseMock {
    constructor(body = null, init = {}) {
      this.body = body;
      this.status = init.status || 200;
    }
    static json(data, init = {}) {
      return new NextResponseMock(data, { status: init.status || 200 });
    }
  }
  return {
    __esModule: true,
    NextRequest: NextRequestMock,
    NextResponse: NextResponseMock,
  };
});

// Ensure Request polyfill uses writable url property to avoid NextRequest mutation errors
if (typeof global.Request !== "undefined") {
  const OriginalReq = global.Request;
  global.Request = class extends OriginalReq {
    constructor(input, init = {}) {
      super(input, init);
      Object.defineProperty(this, "url", {
        value: String(input),
        writable: true,
      });
    }
  };
}

// Mock toast helpers globally to avoid actual UI & allow assertions
jest.mock("@/lib/ui/toast", () => {
  const actual = jest.requireActual("./src/lib/ui/toast");
  return {
    __esModule: true,
    ...actual,
    showErrorToast: jest.fn(actual.showErrorToast),
    showSuccessToast: jest.fn(actual.showSuccessToast),
    showInfoToast: jest.fn(actual.showInfoToast),
  };
});
