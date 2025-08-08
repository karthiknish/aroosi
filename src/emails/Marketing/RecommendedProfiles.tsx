import React from "react";
import { BaseMarketingEmail } from "./BaseMarketingEmail";

export function RecommendedProfiles({ name, recommendations, unsubscribeToken }: { name: string; recommendations: Array<{ id: string; fullName: string; city: string; country: string; profileImageUrl: string; compatibilityScore: number; aboutMe: string }>; unsubscribeToken: string }) {
  return (
    <BaseMarketingEmail
      footer={
        <>
          You&apos;re receiving this email because you opted in to marketing
          communications from <strong>Aroosi</strong>.
          <br />
          <a
            href={`https://aroosi.app/unsubscribe?token=${unsubscribeToken}`}
            style={{ color: "#666", textDecoration: "underline" }}
          >
            Unsubscribe
          </a>
          {" | "}
          <a
            href={`https://aroosi.app/email-preferences?token=${unsubscribeToken}`}
            style={{ color: "#666", textDecoration: "underline" }}
          >
            Update preferences
          </a>
        </>
      }
    >
      <h1 style={{ marginTop: 0 }}>🌟 New Matches for You!</h1>
      <p style={{ fontSize: 16, lineHeight: 1.6 }}>
        Hi {name}, we&apos;ve found some great potential matches based on your
        preferences. Check out these recommended profiles:
      </p>
      {recommendations.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 16,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", padding: 16 }}>
            <div style={{ flex: "0 0 80px", marginRight: 16 }}>
              <img
                src={p.profileImageUrl}
                alt={p.fullName}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  objectFit: "cover",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#222" }}>
                {p.fullName}
              </h3>
              <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: 14 }}>
                {p.city}, {p.country}
              </p>
              <p style={{ margin: "0 0 8px 0", color: "#888", fontSize: 14 }}>
                Compatibility: {p.compatibilityScore}%
              </p>
              <p
                style={{
                  margin: 0,
                  color: "#444",
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                {p.aboutMe.substring(0, 120)}
                {p.aboutMe.length > 120 ? "..." : ""}
              </p>
            </div>
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            <a
              href={`https://aroosi.app/profile/${p.id}`}
              style={{
                display: "inline-block",
                background: "#BFA67A",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              View Profile
            </a>
          </div>
        </div>
      ))}
      <p style={{ fontSize: 16, lineHeight: 1.6, marginTop: 24 }}>
        Don&apos;t miss out on connecting with these amazing people. The best
        relationships start with a simple hello.
      </p>
      <a
        href="https://aroosi.app/search"
        style={{
          display: "inline-block",
          background: "#BFA67A",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: 6,
          textDecoration: "none",
        }}
      >
        See More Matches
      </a>
    </BaseMarketingEmail>
  );
}


