import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { ArticleDocView, type ArticleDoc } from "@/components/article-doc";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "@/components/json-ld";

const PATH = "/badge";

// The snippet the app copies for the user; YOUR_ID is filled in by the app.
const SNIPPET =
  "[![My Token Forest](https://tokenforest.com.au/badge/YOUR_ID.svg)](https://tokenforest.com.au/en/leaderboard)";

// Screenshots live under /badge-guide/ (NOT /badge/, which is the live SVG
// route app/badge/[userId]). src/dims are shared; alt is localized per doc.
const IMG = {
  // The live badge endpoint's sample — always the current badge design, no stale
  // screenshot to maintain. (menu/dialog stay static: they show the desktop app.)
  example: { src: "/badge/demo.svg", width: 460, height: 140 },
  menu: { src: "/badge-guide/app-menu.png", width: 820, height: 670 },
  dialog: { src: "/badge-guide/setup-dialog.png", width: 860, height: 568 },
} as const;

// App UI labels, quoted verbatim per locale so each page names the button the
// reader actually sees (the desktop app is localized into the same 4 locales).
// Source of truth: Token-Forest/src/i18n.py (menu_leaderboard / lb_badge_setup /
// lb_copy_badge). If those labels change in the app, update them here too.
const APP = {
  en: { menu: "🏆 Leaderboard", setup: "Badge Setup…", copy: "Copy My Leaderboard Badge" },
  zh: { menu: "🏆 排行榜", setup: "徽章设置…", copy: "复制我的排行榜徽章" },
  ja: { menu: "🏆 ランキング", setup: "バッジ設定…", copy: "自分のランキングバッジをコピー" },
  ko: { menu: "🏆 리더보드", setup: "배지 설정…", copy: "내 리더보드 배지 복사" },
} as const;

const EN: ArticleDoc = {
  eyebrow: "BADGE",
  title: "Show your Token Forest on your GitHub README",
  intro:
    "A live badge showing your display name, tree species, growth stage, total tokens, and worldwide rank — pasted once into your GitHub profile README. It updates itself as your forest grows; you never touch the README again.",
  updated: "Updated 2026-07-17",
  sections: [
    {
      img: {
        ...IMG.example,
        alt: "Example Token Forest badge: a pixel tree, a username, a bold token count, the tree species and stage, and worldwide rank.",
      },
    },
    { h2: "What it is" },
    {
      p: "The badge is a small image served from a URL, so it always shows your current stats — you never edit your README to keep it fresh. It shows only what is already public on the leaderboard for players who opted in, and reveals nothing new about you.",
    },

    { h2: "Step 1 — Turn on the leaderboard" },
    {
      p: `Your badge only exists once you have joined the leaderboard. Open Token Forest, open its menu, and under “${APP.en.menu}” switch it to On. The app shows a one-time dialog listing exactly what it will upload — confirm it. Until you do this, “${APP.en.setup}” stays greyed out, and your badge would show a generic Token Forest image instead of your stats.`,
    },

    { h2: "Step 2 — Open Badge Setup in the app" },
    { p: `In the menu, open “${APP.en.menu}”, then choose “${APP.en.setup}”.` },
    {
      img: {
        ...IMG.menu,
        alt: `The Token Forest app menu, with ${APP.en.menu} expanded and ${APP.en.setup} highlighted.`,
      },
    },

    { h2: "Step 3 — Copy your badge" },
    {
      p: `In the Badge Setup window, click “${APP.en.copy}”. It copies one line of Markdown to your clipboard — your own ID is already filled in, so there is nothing to edit.`,
    },
    {
      img: {
        ...IMG.dialog,
        alt: `The Badge Setup window explaining the steps, with a green “${APP.en.copy}” button.`,
      },
    },

    { h2: "Step 4 — Paste it into your GitHub profile" },
    {
      steps: [
        "On GitHub, create a new repository named exactly after your username (username/username) — this is your special “profile” repo. It must be Public, or the README won't show on your profile. Tick “Add a README” when you create it.",
        "Open that repo's README.md, paste the line you copied, and save.",
        "Refresh your GitHub profile — the badge appears, and updates itself as your leaderboard score grows.",
      ],
    },
    { p: "The line you paste looks like this — the app fills in your ID for you:" },
    { code: SNIPPET },

    { h2: "Not showing your stats?" },
    {
      list: [
        "It shows a plain tree instead of your name: the leaderboard is off, or you just turned it on and it hasn't synced yet (the app syncs about every 30 minutes). Turn it on, wait, then reload.",
        "It looks out of date: the image is cached for about 10 minutes so READMEs stay fast. Your next visit shows the fresh numbers.",
        "Nothing appears on your profile: the repo must be named exactly like your username (username/username), be Public, and contain a README.",
      ],
    },

    { h2: "Privacy" },
    {
      p: "The badge shows only your display name, tree species, growth stage, token total, and rank — the same fields already visible on the public leaderboard, and only if you opted in. It never exposes your code, your prompts, or any time-of-day breakdown. If you leave the leaderboard, the badge reverts to a generic Token Forest image — already-cached copies refresh within about 10 minutes.",
    },
  ],
  faq: [
    {
      q: "Do I need a Token Forest account?",
      a: "No account and no login. The badge is tied to the anonymous ID the app already holds on your device — that is why you copy it from inside the app rather than from this website.",
    },
    {
      q: "Can I put the badge somewhere other than a GitHub README?",
      a: "Yes. It is an ordinary image URL, so it works anywhere that allows images — a GitLab README, a personal site, a blog. The Markdown snippet is just the GitHub-friendly form of the same image.",
    },
    {
      q: "Why does my badge show a generic tree instead of my stats?",
      a: "Either the leaderboard is off (turn it on in the app), you enabled it moments ago and it has not synced yet, or the ID is not recognised. The generic image is also what a stranger sees, so it never reveals whether an account exists.",
    },
  ],
  faqHeading: "Questions",
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
    "一张实时徽章——显示你的展示昵称、树种、成长阶段、总 token 和全球排名——只需贴进你的 GitHub 个人主页 README 一次。它会随你的森林成长自己更新,你再也不用碰 README。",
  updated: "更新于 2026-07-17",
  sections: [
    {
      img: {
        ...IMG.example,
        alt: "Token Forest 徽章示例:一棵像素树、用户名、加粗的 token 数量、树种与阶段,以及全球排名。",
      },
    },
    { h2: "它是什么" },
    {
      p: "徽章是一张从网址实时生成的小图片,所以永远显示你当前的数据——你不用为了保持最新去改 README。它只显示那些已 opt-in 的玩家在排行榜上本就公开的字段,不会暴露任何关于你的新信息。",
    },

    { h2: "第 1 步 — 先开启排行榜" },
    {
      p: `只有加入排行榜之后,你才有徽章。打开 Token Forest,点开菜单,在「${APP.zh.menu}」下把它切到「开启」。App 会弹一次窗,列出它将上传的确切内容——确认即可。在此之前,「${APP.zh.setup}」是灰的点不动,而且你的徽章只会显示一张通用的 Token Forest 图,而不是你的数据。`,
    },

    { h2: "第 2 步 — 在 App 里打开徽章设置" },
    { p: `在菜单里点开「${APP.zh.menu}」,然后选「${APP.zh.setup}」。` },
    {
      img: {
        ...IMG.menu,
        alt: `Token Forest 的 App 菜单,展开了 ${APP.zh.menu},并高亮「${APP.zh.setup}」。`,
      },
    },

    { h2: "第 3 步 — 复制你的徽章" },
    {
      p: `在「徽章设置」窗口里,点「${APP.zh.copy}」。它会把一行 Markdown 复制到你的剪贴板——你自己的 ID 已经填好了,不用改任何东西。`,
    },
    {
      img: {
        ...IMG.dialog,
        alt: `徽章设置窗口,说明了操作步骤,还有一个绿色的「${APP.zh.copy}」按钮。`,
      },
    },

    { h2: "第 4 步 — 粘进你的 GitHub 主页" },
    {
      steps: [
        "在 GitHub 新建一个与你用户名完全同名的仓库(username/username)——这是你的专属「个人主页」仓库。它必须设为 Public(公开),否则 README 不会显示在你的主页上。建仓时勾选「Add a README」。",
        "打开这个仓库的 README.md,把刚复制的那行粘进去,保存。",
        "刷新你的 GitHub 主页——徽章就出现了,并随你的排行榜成绩自动更新。",
      ],
    },
    { p: "你粘进去的那行长这样——App 会替你填好 ID:" },
    { code: SNIPPET },

    { h2: "没显示你的数据?" },
    {
      list: [
        "显示的是一棵普通树而不是你的名字:排行榜没开,或你刚开还没同步(App 大约每 30 分钟同步一次)。开启、稍等,再刷新。",
        "看起来是旧数据:图片会缓存约 10 分钟,好让 README 加载够快。下次再看就是最新数字了。",
        "主页上什么都没出现:仓库名必须与你的用户名完全一致(username/username),必须是 Public(公开),并且带有 README。",
      ],
    },

    { h2: "隐私" },
    {
      p: "徽章只显示你的展示昵称、树种、成长阶段、总 token 和排名——都是公开排行榜上本就可见、且只在你 opt-in 后才有的字段。它绝不暴露你的代码、prompt 或任何按时段的明细。你若退出排行榜,徽章会回退成一张通用的 Token Forest 图——已缓存的副本约 10 分钟内刷新。",
    },
  ],
  faq: [
    {
      q: "我需要 Token Forest 账号吗?",
      a: "不需要账号,也不用登录。徽章绑定的是 App 已经保存在你设备上的匿名 ID——所以这一步只能在 App 里复制,而不是在本网站。",
    },
    {
      q: "徽章能放到 GitHub README 以外的地方吗?",
      a: "可以。它就是一个普通的图片网址,任何允许放图片的地方都能用——GitLab 的 README、个人网站、博客都行。那行 Markdown 只是同一张图对 GitHub 友好的写法。",
    },
    {
      q: "为什么我的徽章显示的是一棵通用的树,而不是我的数据?",
      a: "要么排行榜没开(去 App 里开启),要么你刚开还没同步,要么 ID 未被识别。那张通用图也正是陌生人看到的样子——所以它绝不会透露某个账号是否存在。",
    },
  ],
  faqHeading: "常见问题",
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
    "表示名・樹種・成長段階・合計トークン・世界ランクを示すライブバッジを、GitHub プロフィールの README に一度貼るだけ。森が育つにつれて自動更新され、README を触り直す必要はありません。",
  updated: "2026-07-17 更新",
  sections: [
    {
      img: {
        ...IMG.example,
        alt: "Token Forest バッジの例:ピクセルの木、ユーザー名、太字のトークン数、樹種と成長段階、そして世界ランク。",
      },
    },
    { h2: "これは何か" },
    {
      p: "バッジは URL から生成される小さな画像なので、常に最新の数値を表示します——README を編集して更新する必要はありません。オプトインしたプレイヤーがリーダーボードで既に公開している項目だけを表示し、あなたについて新しい情報を公開することはありません。",
    },

    { h2: "ステップ 1 — まずリーダーボードをオンにする" },
    {
      p: `バッジはリーダーボードに参加して初めて存在します。Token Forest を開き、メニューを開いて「${APP.ja.menu}」からオンに切り替えます。アプリはアップロードする内容を正確に示す一度きりのダイアログを表示します——確認してください。それまでは「${APP.ja.setup}」はグレーアウトのままで、バッジはあなたの数値ではなく汎用の Token Forest 画像を表示します。`,
    },

    { h2: "ステップ 2 — アプリでバッジ設定を開く" },
    { p: `メニューで「${APP.ja.menu}」を開き、「${APP.ja.setup}」を選びます。` },
    {
      img: {
        ...IMG.menu,
        alt: `Token Forest のアプリメニュー。${APP.ja.menu} が展開され、「${APP.ja.setup}」がハイライトされている。`,
      },
    },

    { h2: "ステップ 3 — バッジをコピーする" },
    {
      p: `バッジ設定ウィンドウで「${APP.ja.copy}」をクリックします。Markdown が 1 行クリップボードにコピーされます——あなた自身の ID は既に埋め込まれているので、編集は不要です。`,
    },
    {
      img: {
        ...IMG.dialog,
        alt: `手順を説明するバッジ設定ウィンドウと、緑色の「${APP.ja.copy}」ボタン。`,
      },
    },

    { h2: "ステップ 4 — GitHub プロフィールに貼る" },
    {
      steps: [
        "GitHub でユーザー名と完全に同じ名前のリポジトリ(username/username)を作成します——これがあなた専用の「プロフィール」リポジトリです。Public(公開)にしないと README はプロフィールに表示されません。作成時に「Add a README」にチェックを入れます。",
        "そのリポジトリの README.md を開き、コピーした行を貼り付けて保存します。",
        "GitHub プロフィールを更新すると、バッジが表示され、スコアに合わせて自動更新されます。",
      ],
    },
    { p: "貼り付ける行はこのような形です——ID はアプリが埋めてくれます:" },
    { code: SNIPPET },

    { h2: "数値が表示されない?" },
    {
      list: [
        "名前ではなく普通の木が表示される:リーダーボードがオフか、オンにしたばかりでまだ同期されていません(アプリは約 30 分ごとに同期)。オンにして待ってから再読み込みしてください。",
        "古く見える:画像は README を速く保つため約 10 分キャッシュされます。次に見るときは最新の数値になります。",
        "プロフィールに何も出ない:リポジトリ名がユーザー名と完全一致(username/username)で、Public(公開)であり、README があるか確認してください。",
      ],
    },

    { h2: "プライバシー" },
    {
      p: "バッジが表示するのは表示名・樹種・成長段階・合計トークン・ランクだけ——いずれも公開リーダーボードで既に見え、オプトインした場合にのみ存在する項目です。コードやプロンプト、時間帯別の内訳を公開することは決してありません。リーダーボードから抜けると、バッジは汎用の Token Forest 画像に戻ります(キャッシュ済みの画像は約 10 分で更新)。",
    },
  ],
  faq: [
    {
      q: "Token Forest のアカウントは必要ですか?",
      a: "アカウントもログインも不要です。バッジは、アプリがあなたの端末に既に保持している匿名 ID に紐づきます——だからこの Web サイトではなく、アプリ内でコピーします。",
    },
    {
      q: "GitHub の README 以外の場所にバッジを置けますか?",
      a: "はい。普通の画像 URL なので、画像を許可する場所ならどこでも動きます——GitLab の README、個人サイト、ブログなど。Markdown スニペットは同じ画像の GitHub 向けの書き方にすぎません。",
    },
    {
      q: "なぜバッジが数値ではなく汎用の木を表示するのですか?",
      a: "リーダーボードがオフ(アプリでオンにする)、オンにした直後でまだ同期されていない、または ID が認識されていないかのいずれかです。汎用画像は他人が見るものと同じなので、アカウントの有無を明かすことはありません。",
    },
  ],
  faqHeading: "よくある質問",
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
    "표시 이름, 수종, 성장 단계, 총 토큰, 세계 순위를 보여주는 실시간 배지를 GitHub 프로필 README에 한 번만 붙이면 됩니다. 숲이 자라면 스스로 업데이트되며, README를 다시 손댈 필요가 없습니다.",
  updated: "2026-07-17 업데이트",
  sections: [
    {
      img: {
        ...IMG.example,
        alt: "Token Forest 배지 예시: 픽셀 나무, 사용자 이름, 굵은 토큰 수, 수종과 단계, 그리고 세계 순위.",
      },
    },
    { h2: "이게 뭔가요" },
    {
      p: "배지는 URL에서 생성되는 작은 이미지라 항상 현재 수치를 보여줍니다——최신 상태를 위해 README를 고칠 필요가 없습니다. 옵트인한 플레이어가 리더보드에서 이미 공개한 항목만 표시하며, 당신에 대한 새로운 정보는 전혀 공개하지 않습니다.",
    },

    { h2: "1단계 — 먼저 리더보드를 켜세요" },
    {
      p: `배지는 리더보드에 참여해야 생깁니다. Token Forest를 열고 메뉴를 연 다음 「${APP.ko.menu}」에서 켜기로 전환하세요. 앱은 업로드할 내용을 정확히 보여주는 일회성 대화상자를 표시합니다——확인하세요. 그 전까지 「${APP.ko.setup}」는 비활성 상태이며, 배지는 당신의 수치 대신 일반 Token Forest 이미지를 보여줍니다.`,
    },

    { h2: "2단계 — 앱에서 배지 설정 열기" },
    { p: `메뉴에서 「${APP.ko.menu}」를 열고 「${APP.ko.setup}」를 선택하세요.` },
    {
      img: {
        ...IMG.menu,
        alt: `Token Forest 앱 메뉴. ${APP.ko.menu}가 펼쳐지고 「${APP.ko.setup}」가 강조됨.`,
      },
    },

    { h2: "3단계 — 배지 복사하기" },
    {
      p: `배지 설정 창에서 「${APP.ko.copy}」를 클릭하세요. Markdown 한 줄이 클립보드에 복사됩니다——당신의 ID가 이미 채워져 있으므로 수정할 것이 없습니다.`,
    },
    {
      img: {
        ...IMG.dialog,
        alt: `단계를 설명하는 배지 설정 창과 초록색 「${APP.ko.copy}」 버튼.`,
      },
    },

    { h2: "4단계 — GitHub 프로필에 붙여넣기" },
    {
      steps: [
        "GitHub에서 사용자 이름과 정확히 같은 이름의 저장소(username/username)를 만드세요——이것이 당신의 특별한 「프로필」 저장소입니다. Public(공개)이 아니면 README가 프로필에 표시되지 않습니다. 만들 때 「Add a README」를 체크하세요.",
        "그 저장소의 README.md를 열고 복사한 줄을 붙여넣은 뒤 저장하세요.",
        "GitHub 프로필을 새로고침하면 배지가 나타나고 점수에 따라 자동으로 갱신됩니다.",
      ],
    },
    { p: "붙여넣는 줄은 이렇게 생겼습니다——ID는 앱이 채워 줍니다:" },
    { code: SNIPPET },

    { h2: "수치가 안 보이나요?" },
    {
      list: [
        "이름 대신 평범한 나무가 보임: 리더보드가 꺼져 있거나, 방금 켜서 아직 동기화되지 않았습니다(앱은 약 30분마다 동기화). 켜고 기다린 뒤 새로고침하세요.",
        "오래된 것처럼 보임: 이미지는 README를 빠르게 유지하려고 약 10분간 캐시됩니다. 다음에 보면 최신 수치가 나옵니다.",
        "프로필에 아무것도 안 나옴: 저장소 이름이 사용자 이름과 정확히 같고(username/username), Public(공개)이며, README가 있는지 확인하세요.",
      ],
    },

    { h2: "개인정보" },
    {
      p: "배지는 표시 이름, 수종, 성장 단계, 총 토큰, 순위만 보여줍니다——모두 공개 리더보드에서 이미 보이고, 옵트인한 경우에만 존재하는 항목입니다. 코드나 프롬프트, 시간대별 내역을 공개하는 일은 절대 없습니다. 리더보드에서 나가면 배지는 일반 Token Forest 이미지로 돌아갑니다(캐시된 이미지는 약 10분 내 갱신).",
    },
  ],
  faq: [
    {
      q: "Token Forest 계정이 필요한가요?",
      a: "계정도 로그인도 필요 없습니다. 배지는 앱이 당신의 기기에 이미 보유한 익명 ID에 연결됩니다——그래서 이 웹사이트가 아니라 앱 안에서 복사합니다.",
    },
    {
      q: "GitHub README가 아닌 다른 곳에 배지를 둘 수 있나요?",
      a: "네. 평범한 이미지 URL이라 이미지를 허용하는 곳이면 어디서든 작동합니다——GitLab README, 개인 사이트, 블로그 등. Markdown 스니펫은 같은 이미지의 GitHub 친화적 표현일 뿐입니다.",
    },
    {
      q: "왜 배지가 제 수치가 아니라 일반 나무를 보여주나요?",
      a: "리더보드가 꺼져 있거나(앱에서 켜세요), 방금 켜서 아직 동기화되지 않았거나, ID가 인식되지 않는 경우입니다. 일반 이미지는 낯선 사람이 보는 것과 같아서 계정 존재 여부를 드러내지 않습니다.",
    },
  ],
  faqHeading: "자주 묻는 질문",
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
        dateModified="2026-07-17"
      />
      {doc.faq && <FaqJsonLd items={doc.faq.map((f) => ({ question: f.q, answer: f.a }))} />}
      <ArticleDocView doc={doc} />
    </>
  );
}
