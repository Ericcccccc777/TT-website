import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { LegalDocView, type LegalDoc } from "@/components/legal-doc";

// Mirror of Token-Forest-P/SECURITY.md (same version). Edit the canonical
// file first, then mirror here — see docs/trust/PRIVACY_ARCHITECTURE.md.

const GITHUB_SECURITY = "https://github.com/Ericcccccc777/Token-Forest-P/security";

const EN: LegalDoc = {
  title: "Token Forest Security Policy",
  meta: ["Last updated 2026-07-08", "Publisher: Poietic Studio"],
  sections: [
    {
      blocks: [
        {
          p: "Token Forest is a proprietary desktop application published by Poietic Studio. We take reports about its security and privacy behaviour seriously — especially anything that contradicts our published Privacy Notice.",
        },
      ],
    },
    {
      h: "Supported versions",
      blocks: [
        {
          p: "Only the latest public release receives security fixes unless a release note states otherwise. Older releases and development snapshots are unsupported — please upgrade.",
        },
      ],
    },
    {
      h: "Reporting a vulnerability",
      blocks: [
        { p: "Please report suspected vulnerabilities privately:" },
        {
          list: [
            `Preferred: GitHub private vulnerability reporting — ${GITHUB_SECURITY}`,
            "Email: security@tokenforest.com.au (mailbox activating before the first public release)",
          ],
        },
        {
          p: "Please do not open a public issue for an unpatched vulnerability. Ordinary bugs and feature requests are welcome in the public issue tracker.",
        },
        {
          p: "Do not include in any report: your Claude/Codex logs, prompts or conversation content, source code, access/refresh tokens, or other users' leaderboard data. If we need artifacts, we will arrange a minimal, private way to share them.",
        },
      ],
    },
    {
      h: "What to include",
      blocks: [
        {
          list: [
            "Token Forest version and exact download filename (plus its SHA-256 if possible);",
            "operating system and architecture;",
            "clear impact description and reproducible steps or proof of concept;",
            "whether the leaderboard was Off, Paused or On;",
            "whether the issue has been disclosed anywhere else;",
            "how you would like to be credited (or anonymity).",
          ],
        },
      ],
    },
    {
      h: "In scope",
      blocks: [
        {
          list: [
            "any upload of local logs, prompts, conversation content or source-code files;",
            "any network request while the leaderboard is off (the app promises zero);",
            "a mismatch between the consent dialog / Privacy Notice and what is actually sent;",
            "leaderboard authentication or row-level-security bypass (reading or modifying another user's row);",
            "exposure of access/refresh tokens;",
            "local storage readable across OS user boundaries;",
            "arbitrary code execution, unsafe archive/update handling, DLL or library hijacking;",
            "tampering with official downloads, checksums or signatures;",
            "failure of the advertised leaderboard-deletion flow.",
          ],
        },
        { p: "Please use only your own accounts and test data, and stop once the issue is demonstrated." },
      ],
    },
    {
      h: "Out of scope (usually)",
      blocks: [
        {
          list: [
            "UI, animation or layout bugs; feature requests;",
            "token-count differences explained by our documented metric definitions;",
            "SmartScreen warning that a new file is “not commonly downloaded” when signature/hash are otherwise valid;",
            "issues requiring full prior control of the user's OS account;",
            "automated scanner output without demonstrated impact;",
            "social engineering of team members.",
          ],
        },
        { p: "We may still act on out-of-scope reports that expose real user risk." },
      ],
    },
    {
      h: "Our response",
      blocks: [
        {
          p: "Targets, not guarantees: acknowledge within 3 business days; initial assessment within 7 business days; status updates at least every 14 days for confirmed issues. For critical issues we may pull affected downloads immediately. Fixes are rebuilt from a clean commit, re-signed where applicable, republished with new checksums, and announced in the release notes; withdrawn binaries stay marked rather than silently rewritten.",
        },
        {
          p: "If you act in good faith — avoid privacy harm, use only your own data, allow reasonable time to fix — we will work with you, and with your permission credit you in the release notes.",
        },
      ],
    },
    {
      h: "Privacy requests",
      blocks: [
        {
          p: "Requests to delete a leaderboard entry or questions about data handling are not vulnerabilities — see the Privacy Notice contact section. Never send anyone your account.json tokens.",
        },
      ],
    },
    {
      h: "Release authenticity",
      blocks: [
        {
          p: "Official downloads come only from this website and the product repository's GitHub Releases, each with a SHA-256 checksum and a stated signing status. Do not run a download that fails verification — delete it, re-download from an official channel, and report it if the mismatch persists.",
        },
      ],
    },
  ],
};

const NOTE: Partial<Record<Locale, string>> = {
  zh: "安全政策以英文版为准;删除排行榜记录等隐私请求请见隐私声明页。",
  ja: "セキュリティポリシーは英語版が正文です。",
  ko: "보안 정책은 영어 원문을 기준으로 합니다.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata("/security", locale as Locale);
}

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalDocView doc={EN} note={NOTE[locale as Locale]} />;
}
