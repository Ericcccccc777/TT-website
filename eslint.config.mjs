import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    // Design handoff artifacts (interactive mockups), not site source.
    // public/tmi: TMI's static site, built in its own repo and copied in as-is.
    ignores: ["dashboard-claudedesign/**", "public/tmi/**"],
  },
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default config;
