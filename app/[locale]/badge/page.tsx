import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { ArticleDocView, type ArticleDoc } from "@/components/article-doc";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "@/components/json-ld";

const PATH = "/badge";
const DEMO = { src: "/badge/demo.svg", alt: "Example Token Forest README badge", width: 460, height: 140 };
const SNIPPET =
  "[![My Token Forest](https://tokenforest.com.au/badge/YOUR_ID.svg)](https://tokenforest.com.au/en/leaderboard)";

const EN: ArticleDoc = {
  eyebrow: "BADGE",
  title: "Show your Token Forest on your GitHub README",
  intro:
    "A live badge of your tree — species, growth stage, total tokens, and worldwide rank — that you can paste into your GitHub profile README. It updates itself as your forest grows.",
  sections: [
    { img: DEMO },
    { h2: "What it is" },
    {
      p: "The badge is a small image served from a URL, so it always shows your current stats — you never edit your README to keep it fresh. It reads only what is already public on the leaderboard for players who have opted in, and reveals nothing new.",
    },
    { h2: "How to get yours" },
    {
      steps: [
        "Open Token Forest and turn the leaderboard On (it is off by default). Your badge only exists once you have opted in.",
        "In the app menu, choose “Copy my leaderboard badge” — it copies a one-line Markdown snippet with your own ID.",
        "Paste it into your GitHub profile README (the README in the repo named after your username).",
      ],
    },
    {
      p: "The snippet looks like this — the app fills in your ID for you:",
    },
    { code: SNIPPET },
    { h2: "Privacy" },
    {
      p: "The badge shows only your display name, tree species, token total, and rank — the same fields already visible on the public leaderboard, and only if you opted in. It never exposes your code, prompts, or any per-time-of-day breakdown. If you leave the leaderboard, the badge falls back to a generic Token Forest image.",
    },
  ],
  cta: {
    heading: "Grow a forest worth showing off",
    body: "Token Forest turns the Claude Code and Codex tokens you spend into a living pixel tree, with a global leaderboard behind it. Free, Windows and macOS.",
    primaryLabel: "Download Token Forest",
    primaryHref: "/download",
    secondaryLabel: "See the leaderboard",
    secondaryHref: "/leaderboard",
  },
};

const ZH: ArticleDoc = {
  eyebrow: "徽章",
  title: "把你的 Token Forest 秀到 GitHub README 上",
  intro:
    "一张实时的树徽章——树种、成长阶段、总 token、全球排名——贴进你的 GitHub 个人主页 README。它会随你的森林成长自己更新。",
  sections: [
    { img: DEMO },
    { h2: "它是什么" },
    {
      p: "徽章是一张从网址实时生成的小图片,所以永远显示你当前的数据——你不用为了保持最新去改 README。它只读取那些已 opt-in 的玩家在排行榜上本就公开的字段,不暴露任何新东西。",
    },
    { h2: "怎么拿到你自己的" },
    {
      steps: [
        "打开 Token Forest,把排行榜开启(默认关闭)。只有 opt-in 之后你才有徽章。",
        "在 App 菜单里选「复制我的排行榜徽章」——它会复制一行带你自己 ID 的 Markdown。",
        "把它粘进你的 GitHub 个人主页 README(那个和你用户名同名的仓库里的 README)。",
      ],
    },
    { p: "这行代码长这样——App 会替你填上你的 ID:" },
    { code: SNIPPET },
    { h2: "隐私" },
    {
      p: "徽章只显示你的展示昵称、树种、总 token 和排名——都是公开排行榜上本就可见、且只在你 opt-in 后才有的字段。它绝不暴露你的代码、prompt 或任何按时段的明细。你若退出排行榜,徽章会回退成一张通用的 Token Forest 图。",
    },
  ],
  cta: {
    heading: "养一片值得炫耀的森林",
    body: "Token Forest 把你花掉的 Claude Code 和 Codex token 变成一棵会生长的像素树,背后是一个全球排行榜。免费,支持 Windows 与 macOS。",
    primaryLabel: "下载 Token Forest",
    primaryHref: "/download",
    secondaryLabel: "看看排行榜",
    secondaryHref: "/leaderboard",
  },
};

const JA: ArticleDoc = {
  eyebrow: "バッジ",
  title: "あなたの Token Forest を GitHub README に飾ろう",
  intro:
    "木のライブバッジ——樹種・成長段階・合計トークン・世界ランク——を GitHub プロフィールの README に貼れます。森が育つにつれて自動で更新されます。",
  sections: [
    { img: DEMO },
    { h2: "これは何か" },
    {
      p: "バッジは URL から生成される小さな画像なので、常に最新の数値を表示します——README を編集して更新する必要はありません。オプトインしたプレイヤーがリーダーボードで既に公開している項目だけを読み、新しい情報は一切公開しません。",
    },
    { h2: "自分のバッジを取得する" },
    {
      steps: [
        "Token Forest を開き、リーダーボードをオンにします(既定はオフ)。オプトインして初めてバッジが存在します。",
        "アプリのメニューで「自分のリーダーボードバッジをコピー」を選ぶと、あなた自身の ID 入りの 1 行の Markdown がコピーされます。",
        "それを GitHub プロフィールの README(ユーザー名と同名のリポジトリの README)に貼り付けます。",
      ],
    },
    { p: "スニペットはこのような形です——ID はアプリが埋めてくれます:" },
    { code: SNIPPET },
    { h2: "プライバシー" },
    {
      p: "バッジが表示するのは表示名・樹種・合計トークン・ランクだけ——いずれも公開リーダーボードで既に見え、オプトインした場合にのみ存在する項目です。コードやプロンプト、時間帯別の内訳を公開することは決してありません。リーダーボードから抜けると、バッジは汎用の Token Forest 画像に戻ります。",
    },
  ],
  cta: {
    heading: "見せたくなる森を育てよう",
    body: "Token Forest は、あなたが消費した Claude Code と Codex のトークンを生きたピクセルの木に変え、その裏にグローバルなリーダーボードを備えます。無料、Windows と macOS 対応。",
    primaryLabel: "Token Forest をダウンロード",
    primaryHref: "/download",
    secondaryLabel: "リーダーボードを見る",
    secondaryHref: "/leaderboard",
  },
};

const KO: ArticleDoc = {
  eyebrow: "배지",
  title: "당신의 Token Forest를 GitHub README에 자랑하세요",
  intro:
    "나무의 실시간 배지——수종, 성장 단계, 총 토큰, 세계 순위——를 GitHub 프로필 README에 붙일 수 있습니다. 숲이 자라면 스스로 업데이트됩니다.",
  sections: [
    { img: DEMO },
    { h2: "이게 뭔가요" },
    {
      p: "배지는 URL에서 생성되는 작은 이미지라 항상 현재 수치를 보여줍니다——최신 상태를 위해 README를 고칠 필요가 없습니다. 옵트인한 플레이어가 리더보드에서 이미 공개한 항목만 읽으며, 새로운 정보는 전혀 공개하지 않습니다.",
    },
    { h2: "내 배지 받기" },
    {
      steps: [
        "Token Forest를 열고 리더보드를 켭니다(기본은 꺼짐). 옵트인해야 배지가 생깁니다.",
        "앱 메뉴에서 「내 리더보드 배지 복사」를 선택하면, 본인 ID가 들어간 한 줄 Markdown이 복사됩니다.",
        "그것을 GitHub 프로필 README(사용자 이름과 같은 이름의 저장소의 README)에 붙여넣습니다.",
      ],
    },
    { p: "스니펫은 이렇게 생겼습니다——ID는 앱이 채워 줍니다:" },
    { code: SNIPPET },
    { h2: "개인정보" },
    {
      p: "배지는 표시 이름, 수종, 총 토큰, 순위만 보여줍니다——모두 공개 리더보드에서 이미 보이고, 옵트인한 경우에만 존재하는 항목입니다. 코드나 프롬프트, 시간대별 내역을 공개하는 일은 절대 없습니다. 리더보드에서 나가면 배지는 일반 Token Forest 이미지로 돌아갑니다.",
    },
  ],
  cta: {
    heading: "자랑할 만한 숲을 키우세요",
    body: "Token Forest는 여러분이 소비한 Claude Code와 Codex 토큰을 살아 있는 픽셀 나무로 바꾸고, 그 뒤에 글로벌 리더보드를 둡니다. 무료, Windows와 macOS 지원.",
    primaryLabel: "Token Forest 다운로드",
    primaryHref: "/download",
    secondaryLabel: "리더보드 보기",
    secondaryHref: "/leaderboard",
  },
};

const BREADCRUMB: Record<Locale, string> = {
  en: "README badge",
  zh: "README 徽章",
  ja: "README バッジ",
  ko: "README 배지",
};

const DOCS: Record<Locale, ArticleDoc> = { en: EN, zh: ZH, ja: JA, ko: KO };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata(PATH, locale as Locale);
}

export default async function BadgePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tnav = await getTranslations("TopBar");

  const doc = DOCS[locale as Locale] ?? EN;
  const breadcrumbLabel = BREADCRUMB[locale as Locale] ?? BREADCRUMB.en;

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tnav("home"), path: "/" },
          { name: breadcrumbLabel, path: PATH },
        ]}
      />
      <ArticleJsonLd
        locale={locale as Locale}
        headline={doc.title}
        description={doc.intro}
        path={PATH}
        datePublished="2026-07-16"
        dateModified="2026-07-16"
      />
      {doc.faq && <FaqJsonLd items={doc.faq.map((f) => ({ question: f.q, answer: f.a }))} />}
      <ArticleDocView doc={doc} />
    </>
  );
}
