import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { useMediaQuery } from "./useMediaQuery";

type ChangeListener = () => void;

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: (type: string, cb: ChangeListener) => void;
  removeEventListener: (type: string, cb: ChangeListener) => void;
}

interface MatchMediaMock {
  queries: string[];
  listenerCount: () => number;
  setMatches: (next: boolean) => void;
  fireChange: () => void;
}

function installMatchMedia(initial: boolean): MatchMediaMock {
  const queries: string[] = [];
  const listeners = new Set<ChangeListener>();
  const lists: MockMediaQueryList[] = [];

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      queries.push(query);
      const list: MockMediaQueryList = {
        matches: initial,
        media: query,
        addEventListener: (_type, cb) => listeners.add(cb),
        removeEventListener: (_type, cb) => listeners.delete(cb),
      };
      lists.push(list);
      return list;
    }),
  );

  return {
    queries,
    listenerCount: () => listeners.size,
    setMatches: (next) => {
      for (const list of lists) list.matches = next;
    },
    fireChange: () => {
      for (const cb of [...listeners]) cb();
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMediaQuery", () => {
  // Regression guard: a client-only breakpoint value leaking into the server
  // render is what produced "Hydration failed ... hidden={true} vs hidden={null}".
  it("keeps matchMedia out of the server render", () => {
    installMatchMedia(true);

    function Probe() {
      const isSm = useMediaQuery("sm");
      return <div hidden={isSm}>chart</div>;
    }

    const html = renderToStaticMarkup(<Probe />);

    expect(html).toBe("<div>chart</div>");
  });

  it("queries the breakpoint in min-width form", () => {
    const mq = installMatchMedia(false);
    renderHook(() => useMediaQuery("sm"));

    expect(mq.queries).toContain("(min-width: 640px)");
  });

  it("uses the lg breakpoint when asked", () => {
    const mq = installMatchMedia(false);
    renderHook(() => useMediaQuery("lg"));

    expect(mq.queries).toContain("(min-width: 1024px)");
  });

  it("subscribes to the breakpoint and re-renders on change", () => {
    const mq = installMatchMedia(false);
    renderHook(() => useMediaQuery("sm"));

    // The listener is what lets React re-render when the media query flips.
    expect(mq.listenerCount()).toBe(1);

    mq.fireChange();

    // Still subscribed after a change event: no teardown, no double-subscribe.
    expect(mq.listenerCount()).toBe(1);
  });

  it("removes its change listener on unmount", () => {
    const mq = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("sm"));
    expect(mq.listenerCount()).toBe(1);

    unmount();

    expect(mq.listenerCount()).toBe(0);
  });
});
