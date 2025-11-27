import React from "react";

export function SearchHeader() {
  return (
    <section className="mb-10 text-center">
      <div className="inline-block relative mb-4">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-primary mb-2">
          Search Profiles
        </h1>
        {/* Pink wavy SVG underline */}
        <svg
          className="absolute -bottom-2 left-0 w-full"
          height="6"
          viewBox="0 0 200 6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 3C50 0.5 150 0.5 200 3"
            stroke="#FDA4AF"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-lg text-neutral-light max-w-2xl mx-auto mb-8 font-nunito">
        Browse and filter profiles to find your ideal match on Aroosi.
      </p>
    </section>
  );
}
