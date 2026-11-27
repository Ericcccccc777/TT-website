import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    // Design handoff artifacts (interactive mockups), not site source.
    // public/TMI: TMI's static site, built in its own repo and copied in as-is.
    ignores: ["dashboard-claudedesign/**", "public/TMI/**"],
  },
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default config;
