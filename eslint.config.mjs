import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    // Design handoff artifacts (interactive mockups), not site source.
    ignores: ["dashboard-claudedesign/**"],
  },
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default config;
