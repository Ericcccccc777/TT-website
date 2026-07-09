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
        {
          p: "Please use only your own accounts and test data, and stop once the issue is demonstrated.",
        },
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

const ZH: LegalDoc = {
  title: "Token Forest 安全政策",
  meta: ["最后更新 2026-07-08", "发布者:Poietic Studio"],
  sections: [
    {
      blocks: [
        {
          p: "Token Forest 是由 Poietic Studio 发布的闭源桌面应用。我们认真对待有关其安全与隐私行为的报告——尤其是任何与我们已发布的《隐私声明》不一致的情形。",
        },
      ],
    },
    {
      h: "受支持的版本",
      blocks: [
        {
          p: "除非发布说明另有说明,否则只有最新的公开版本会获得安全修复。较旧的版本和开发快照不受支持——请升级。",
        },
      ],
    },
    {
      h: "报告漏洞",
      blocks: [
        { p: "请私下报告疑似漏洞:" },
        {
          list: [
            `首选:GitHub 私密漏洞报告——${GITHUB_SECURITY}`,
            "邮件:security@tokenforest.com.au(邮箱将在首个公开版本前启用)",
          ],
        },
        {
          p: "请不要为未修复的漏洞开公开 issue。普通的 bug 和功能建议欢迎提交到公开 issue 跟踪器。",
        },
        {
          p: "报告中请勿包含:你的 Claude/Codex 日志、提示词或对话内容、源代码、access/refresh 令牌,或其他用户的排行榜数据。如需相关材料,我们会安排一种最小化的私密方式来分享。",
        },
      ],
    },
    {
      h: "报告应包含的内容",
      blocks: [
        {
          list: [
            "Token Forest 版本及确切的下载文件名(若可能,附上其 SHA-256);",
            "操作系统与架构;",
            "清晰的影响说明,以及可复现的步骤或概念验证;",
            "报告时排行榜处于关闭、暂停还是开启;",
            "该问题是否已在其他地方披露;",
            "你希望以何种方式署名(或选择匿名)。",
          ],
        },
      ],
    },
    {
      h: "受理范围",
      blocks: [
        {
          list: [
            "任何对本地日志、提示词、对话内容或源代码文件的上传;",
            "排行榜关闭时的任何网络请求(应用承诺为零);",
            "同意确认/《隐私声明》与实际发送内容之间的不一致;",
            "排行榜认证或行级安全绕过(读取或修改其他用户的记录);",
            "access/refresh 令牌泄露;",
            "本地存储可被操作系统的其他用户跨账户读取;",
            "任意代码执行、不安全的归档/更新处理、DLL 或库劫持;",
            "篡改官方下载、校验值或签名;",
            "已宣称的排行榜删除流程失效。",
          ],
        },
        { p: "请只使用你自己的账户和测试数据,并在问题得到证实后立即停止。" },
      ],
    },
    {
      h: "通常不在受理范围",
      blocks: [
        {
          list: [
            "UI、动画或布局 bug;功能建议;",
            "可由我们已记录的度量定义解释的 token 计数差异;",
            "在签名/哈希本身有效时,SmartScreen 提示新文件“不常被下载”的警告;",
            "需要事先完全控制用户操作系统账户才能触发的问题;",
            "没有实际影响证明的自动化扫描器输出;",
            "针对团队成员的社会工程。",
          ],
        },
        { p: "对于暴露真实用户风险的范围外报告,我们仍可能采取行动。" },
      ],
    },
    {
      h: "我们的响应",
      blocks: [
        {
          p: "以下是目标而非保证:在 3 个工作日内确认收到;在 7 个工作日内完成初步评估;对已确认的问题至少每 14 天同步一次进展。对于严重问题,我们可能立即下架受影响的下载。修复会从干净的提交重新构建,在适用时重新签名,以新的校验值重新发布,并在发布说明中公告;被撤下的二进制文件会保留标记,而不会被悄悄改写。",
        },
        {
          p: "如果你出于善意行事——避免造成隐私损害、只使用你自己的数据、给予合理的修复时间——我们会与你合作,并在征得你同意后在发布说明中致谢。",
        },
      ],
    },
    {
      h: "隐私请求",
      blocks: [
        {
          p: "删除排行榜记录的请求或有关数据处理的问题不属于漏洞——请参见《隐私声明》的联系方式部分。切勿将你的 account.json 令牌发送给任何人。",
        },
      ],
    },
    {
      h: "发行真实性",
      blocks: [
        {
          p: "官方下载只来自本网站和产品仓库的 GitHub Releases,每个都附带 SHA-256 校验值和已声明的签名状态。请不要运行未通过校验的下载——将其删除,从官方渠道重新下载,若不一致仍然存在请报告。",
        },
      ],
    },
  ],
};

const JA: LegalDoc = {
  title: "Token Forest セキュリティポリシー",
  meta: ["最終更新 2026-07-08", "発行者:Poietic Studio"],
  sections: [
    {
      blocks: [
        {
          p: "Token Forest は Poietic Studio が提供するプロプライエタリ(非公開ソース)のデスクトップアプリです。当社は、そのセキュリティおよびプライバシーの挙動に関する報告を真剣に受け止めます——とりわけ、公開している《プライバシー通知》と矛盾する事項を重視します。",
        },
      ],
    },
    {
      h: "サポート対象バージョン",
      blocks: [
        {
          p: "リリースノートに別段の記載がない限り、セキュリティ修正を受けられるのは最新の公開リリースのみです。それより古いリリースや開発版スナップショットはサポート対象外です——アップグレードしてください。",
        },
      ],
    },
    {
      h: "脆弱性の報告",
      blocks: [
        { p: "脆弱性の疑いは非公開で報告してください:" },
        {
          list: [
            `推奨:GitHub の非公開脆弱性報告——${GITHUB_SECURITY}`,
            "メール:security@tokenforest.com.au(最初の公開リリース前に有効化されるメールボックス)",
          ],
        },
        {
          p: "未修正の脆弱性について公開 issue を開かないでください。通常のバグや機能要望は公開の issue トラッカーで歓迎します。",
        },
        {
          p: "報告には次を含めないでください:あなたの Claude/Codex ログ、プロンプトや会話内容、ソースコード、access/refresh トークン、他のユーザーのリーダーボードデータ。証跡が必要な場合は、最小限かつ非公開の共有方法を当社が用意します。",
        },
      ],
    },
    {
      h: "報告に含める内容",
      blocks: [
        {
          list: [
            "Token Forest のバージョンと正確なダウンロードファイル名(可能であれば SHA-256 も);",
            "オペレーティングシステムとアーキテクチャ;",
            "明確な影響の説明と、再現手順または概念実証(PoC);",
            "報告時点でリーダーボードがオフ・一時停止・オンのいずれであったか;",
            "その問題が他の場所で公開されているかどうか;",
            "どのようにクレジットされたいか(または匿名希望か)。",
          ],
        },
      ],
    },
    {
      h: "対象範囲",
      blocks: [
        {
          list: [
            "ローカルログ、プロンプト、会話内容、ソースコードファイルのあらゆるアップロード;",
            "リーダーボードがオフの間のあらゆるネットワークリクエスト(アプリはゼロを約束しています);",
            "同意ダイアログ/《プライバシー通知》と実際に送信される内容との不一致;",
            "リーダーボードの認証または行レベルセキュリティの回避(他のユーザーの記録の閲覧・改変);",
            "access/refresh トークンの露出;",
            "OS のユーザー境界を越えて読み取れるローカルストレージ;",
            "任意コード実行、安全でないアーカイブ/更新の処理、DLL またはライブラリのハイジャック;",
            "公式ダウンロード、チェックサム、署名の改ざん;",
            "公表しているリーダーボード削除フローの不具合。",
          ],
        },
        {
          p: "ご自身のアカウントとテストデータのみを使用し、問題が実証できた時点で中止してください。",
        },
      ],
    },
    {
      h: "対象外(通常)",
      blocks: [
        {
          list: [
            "UI・アニメーション・レイアウトのバグ;機能要望;",
            "当社が文書化した指標の定義で説明できるトークン数の差異;",
            "署名/ハッシュ自体は有効であるのに、新しいファイルが「あまりダウンロードされていない」と SmartScreen が警告すること;",
            "ユーザーの OS アカウントを事前に完全に掌握していることを必要とする問題;",
            "実証された影響のない自動スキャナーの出力;",
            "チームメンバーへのソーシャルエンジニアリング。",
          ],
        },
        {
          p: "実際のユーザーリスクを露呈する対象外の報告についても、当社が対応する場合があります。",
        },
      ],
    },
    {
      h: "当社の対応",
      blocks: [
        {
          p: "保証ではなく目標です:3 営業日以内に受領を確認、7 営業日以内に初期評価、確認済みの問題については少なくとも 14 日ごとに状況を更新します。重大な問題については、影響を受けるダウンロードを直ちに取り下げる場合があります。修正はクリーンなコミットから再ビルドし、必要に応じて再署名し、新しいチェックサムとともに再公開し、リリースノートで告知します;取り下げたバイナリは、ひそかに書き換えるのではなく、印を付けたまま残します。",
        },
        {
          p: "誠実に行動していただける場合——プライバシーへの害を避け、ご自身のデータのみを使用し、修正に合理的な時間を与えていただける場合——当社は協力し、ご同意のうえでリリースノートに謝辞を記します。",
        },
      ],
    },
    {
      h: "プライバシーに関する要望",
      blocks: [
        {
          p: "リーダーボードの記録削除の依頼やデータの取り扱いに関する質問は脆弱性ではありません——《プライバシー通知》のお問い合わせ欄をご覧ください。account.json のトークンを誰にも送らないでください。",
        },
      ],
    },
    {
      h: "リリースの真正性",
      blocks: [
        {
          p: "公式のダウンロードは本ウェブサイトおよびプロダクトリポジトリの GitHub Releases からのみ提供され、それぞれに SHA-256 チェックサムと署名ステータスの表示が付きます。検証に失敗したダウンロードは実行しないでください——削除し、公式チャネルから再ダウンロードし、不一致が続く場合は報告してください。",
        },
      ],
    },
  ],
};

const KO: LegalDoc = {
  title: "Token Forest 보안 정책",
  meta: ["최종 업데이트 2026-07-08", "발행자: Poietic Studio"],
  sections: [
    {
      blocks: [
        {
          p: "Token Forest는 Poietic Studio가 발행하는 독점(비공개 소스) 데스크톱 애플리케이션입니다. 당사는 그 보안 및 개인정보 관련 동작에 대한 신고를 진지하게 받아들입니다 — 특히 당사가 게시한 《개인정보 보호정책》과 모순되는 사항을 중요하게 다룹니다.",
        },
      ],
    },
    {
      h: "지원 버전",
      blocks: [
        {
          p: "릴리스 노트에 달리 명시되지 않는 한, 보안 수정은 최신 공개 릴리스에만 제공됩니다. 이전 릴리스와 개발 스냅샷은 지원되지 않습니다 — 업그레이드해 주십시오.",
        },
      ],
    },
    {
      h: "취약점 신고",
      blocks: [
        { p: "의심되는 취약점은 비공개로 신고해 주십시오:" },
        {
          list: [
            `권장: GitHub 비공개 취약점 신고 — ${GITHUB_SECURITY}`,
            "이메일: security@tokenforest.com.au(최초 공개 릴리스 전에 활성화되는 메일함)",
          ],
        },
        {
          p: "패치되지 않은 취약점에 대해 공개 이슈를 열지 마십시오. 일반적인 버그와 기능 요청은 공개 이슈 트래커에서 환영합니다.",
        },
        {
          p: "신고에 다음을 포함하지 마십시오: 사용자의 Claude/Codex 로그, 프롬프트나 대화 내용, 소스 코드, access/refresh 토큰, 다른 사용자의 리더보드 데이터. 증적이 필요한 경우, 당사가 최소한의 비공개 공유 방법을 마련하겠습니다.",
        },
      ],
    },
    {
      h: "신고에 포함할 내용",
      blocks: [
        {
          list: [
            "Token Forest 버전과 정확한 다운로드 파일 이름(가능하면 SHA-256도);",
            "운영 체제와 아키텍처;",
            "명확한 영향 설명과 재현 단계 또는 개념 증명(PoC);",
            "신고 시점에 리더보드가 꺼짐·일시정지·켜짐 중 어느 상태였는지;",
            "해당 문제가 다른 곳에 공개되었는지 여부;",
            "어떻게 크레딧을 받고 싶은지(또는 익명 희망 여부).",
          ],
        },
      ],
    },
    {
      h: "대상 범위",
      blocks: [
        {
          list: [
            "로컬 로그, 프롬프트, 대화 내용 또는 소스 코드 파일의 모든 업로드;",
            "리더보드가 꺼져 있는 동안의 모든 네트워크 요청(앱은 0을 약속합니다);",
            "동의 창/《개인정보 보호정책》과 실제로 전송되는 내용 간의 불일치;",
            "리더보드 인증 또는 행 수준 보안 우회(다른 사용자의 기록 열람 또는 수정);",
            "access/refresh 토큰 노출;",
            "운영 체제 사용자 경계를 넘어 읽을 수 있는 로컬 저장소;",
            "임의 코드 실행, 안전하지 않은 아카이브/업데이트 처리, DLL 또는 라이브러리 하이재킹;",
            "공식 다운로드, 체크섬 또는 서명의 변조;",
            "공지된 리더보드 삭제 절차의 실패.",
          ],
        },
        { p: "본인 계정과 테스트 데이터만 사용하고, 문제가 입증되면 즉시 중단해 주십시오." },
      ],
    },
    {
      h: "대상 외(일반적으로)",
      blocks: [
        {
          list: [
            "UI, 애니메이션 또는 레이아웃 버그; 기능 요청;",
            "당사가 문서화한 지표 정의로 설명되는 토큰 수 차이;",
            "서명/해시 자체는 유효한데도 새 파일이 「자주 다운로드되지 않음」이라고 SmartScreen이 경고하는 경우;",
            "사용자의 OS 계정을 사전에 완전히 장악해야 하는 문제;",
            "입증된 영향이 없는 자동 스캐너 출력;",
            "팀 구성원에 대한 사회공학.",
          ],
        },
        { p: "실제 사용자 위험을 드러내는 대상 외 신고에 대해서도 당사가 조치할 수 있습니다." },
      ],
    },
    {
      h: "당사의 대응",
      blocks: [
        {
          p: "보증이 아니라 목표입니다: 3 영업일 이내에 접수 확인, 7 영업일 이내에 초기 평가, 확인된 문제에 대해서는 최소 14일마다 진행 상황을 업데이트합니다. 중대한 문제의 경우 영향을 받는 다운로드를 즉시 내릴 수 있습니다. 수정은 깨끗한 커밋에서 다시 빌드하고, 해당하는 경우 다시 서명하며, 새로운 체크섬과 함께 다시 게시하고, 릴리스 노트에 공지합니다; 내려진 바이너리는 몰래 재작성하지 않고 표시된 상태로 남겨 둡니다.",
        },
        {
          p: "선의로 행동해 주시는 경우 — 개인정보 피해를 피하고, 본인 데이터만 사용하며, 수정에 합리적인 시간을 주시는 경우 — 당사는 협력하며, 동의하에 릴리스 노트에 감사를 표합니다.",
        },
      ],
    },
    {
      h: "개인정보 관련 요청",
      blocks: [
        {
          p: "리더보드 기록 삭제 요청이나 데이터 처리에 관한 질문은 취약점이 아닙니다 — 《개인정보 보호정책》의 문의 항목을 참조하십시오. account.json 토큰을 누구에게도 보내지 마십시오.",
        },
      ],
    },
    {
      h: "릴리스 진위성",
      blocks: [
        {
          p: "공식 다운로드는 본 웹사이트와 제품 저장소의 GitHub Releases에서만 제공되며, 각각 SHA-256 체크섬과 명시된 서명 상태가 첨부됩니다. 검증에 실패한 다운로드는 실행하지 마십시오 — 삭제하고 공식 채널에서 다시 다운로드하며, 불일치가 계속되면 신고해 주십시오.",
        },
      ],
    },
  ],
};

const NOTE: Partial<Record<Locale, string>> = {
  zh: "本页为英文版《安全政策》的中文翻译。如中英文之间存在任何歧义,以英文版为准;删除排行榜记录等隐私请求请见《隐私声明》页。",
  ja: "本ページは英語版《セキュリティポリシー》の日本語訳です。相違がある場合は英語版が優先します。リーダーボードの記録削除などプライバシーに関する要望は《プライバシー通知》ページをご覧ください。",
  ko: "본 페이지는 영문 《보안 정책》의 한국어 번역본입니다. 차이가 있는 경우 영문판이 우선합니다. 리더보드 기록 삭제 등 개인정보 관련 요청은 《개인정보 보호정책》 페이지를 참조하십시오.",
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
  const byLocale: Partial<Record<Locale, LegalDoc>> = { zh: ZH, ja: JA, ko: KO };
  const doc = byLocale[locale as Locale] ?? EN;
  return <LegalDocView doc={doc} note={NOTE[locale as Locale]} />;
}
