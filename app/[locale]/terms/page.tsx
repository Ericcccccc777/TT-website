import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { LegalDocView, type LegalDoc } from "@/components/legal-doc";

// Canonical EULA text. English is authoritative; the zh/ja/ko docs are
// faithful translations. Keep in sync with any future Poietic-TokenForest/EULA.md.

const EN: LegalDoc = {
  title: "Token Forest End User License Agreement (EULA)",
  meta: [
    "Version 1.0-beta (pre-release draft) · Last updated 2026-07-09 · Effective at first public release",
    "Publisher: Poietic Studio",
  ],
  sections: [
    {
      blocks: [
        {
          p: "This End User License Agreement (“Agreement”) is a binding contract between you (“you”) and the developers of Token Forest, operating under the name “Poietic Studio” (“we”, “us”, or the “Licensor”), for the Token Forest software (the “Software”). Poietic Studio is a trading name used by the developers and is not, at present, a separate registered legal entity; the Licensor under this Agreement is the individual developer(s) who operate it. Please read this Agreement carefully before installing or using the Software. By downloading, installing, accessing, or using the Software, you confirm that you have read, understood, and agree to be bound by this Agreement. If you do not agree, do not install or use the Software, and delete all copies you have obtained. If you accept this Agreement on behalf of an organization, you represent that you have authority to bind that organization.",
        },
      ],
    },
    {
      h: "1. Definitions",
      blocks: [
        {
          list: [
            "“Software” — the Token Forest desktop application (Windows and macOS), including its executables, bundled assets, documentation, and any updates we provide.",
            "“Leaderboard Service” — the optional, opt-in online global leaderboard and its backend.",
            "“Documentation” — the guidance, Privacy Notice, and Security Policy provided with the Software or on the official website.",
            "“Official channels” — https://www.tokenforest.com.au and our designated official repository (GitHub Releases).",
          ],
        },
      ],
    },
    {
      h: "2. License grant",
      blocks: [
        {
          p: "Subject to your continued compliance with this Agreement, the Licensor grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to: (a) download and install the Software on devices you own or control; and (b) run and use the Software for your personal or internal business purposes, in the manner it is intended to be used.",
        },
        {
          p: "During the public beta, the Software is provided free of charge. See Section 9 regarding the beta nature and possible future pricing.",
        },
      ],
    },
    {
      h: "3. License restrictions",
      blocks: [
        {
          p: "Except to the extent permitted by mandatory applicable law or expressly authorized in writing, you must not (and must not allow any third party to):",
        },
        {
          list: [
            "copy, distribute, sell, rent, lease, lend, transfer, or sublicense the Software, or otherwise commercially exploit it;",
            "reverse engineer, decompile, or disassemble the Software, or attempt to derive its source code or underlying structure (except to the limited extent this cannot be prohibited under mandatory law);",
            "modify, translate, or create derivative works based on the Software;",
            "remove, obscure, or alter any copyright, trademark, or other proprietary notices;",
            "circumvent, disable, or interfere with any security, authentication, or technical protection of the Software or Leaderboard Service;",
            "use the Software for any unlawful purpose or in a way that infringes the rights of others;",
            "use the Software to build a competing product or service.",
          ],
        },
      ],
    },
    {
      h: "4. Ownership and intellectual property",
      blocks: [
        {
          p: "The Software is licensed, not sold. The Licensor and its licensors retain all right, title, and interest in and to the Software and Documentation, including all intellectual property rights. No rights are granted to you except as expressly set out in this Agreement. The pixel art, icons, names, logos, and branding are protected by copyright and trademark and are additionally governed by the LICENSE (art and branding terms) published in the official repository.",
        },
      ],
    },
    {
      h: "5. Third-party tools and no affiliation",
      blocks: [
        {
          p: "The Software reads the usage logs that Claude Code and OpenAI Codex write locally on your machine in order to function. Those third-party tools are operated by their respective providers and governed by their own terms. Token Forest is not affiliated with, sponsored by, or endorsed by Anthropic, OpenAI, or their affiliates; those names are used only to describe compatibility. You are responsible for using those third-party tools lawfully.",
        },
      ],
    },
    {
      h: "6. Optional Leaderboard Service",
      blocks: [
        {
          p: "The Leaderboard Service is off by default and runs only after you enable it through the in-app consent dialog. When using the Leaderboard Service, you agree:",
        },
        {
          list: [
            "not to upload false, misleading, fabricated, or artificially inflated data (including cheating or faking token counts);",
            "not to set an unlawful, infringing, abusive, hateful, sexual, or otherwise inappropriate display name or content;",
            "not to interfere with, attack, probe, or attempt unauthorized access to the Leaderboard Service or other users' records;",
            "that data synced by the Leaderboard Service, how it is displayed, and how it is deleted are handled as described in the Privacy Notice.",
          ],
        },
        {
          p: "We may remove offending entries or names and suspend or terminate any user's access to the Leaderboard Service without prior notice. The Leaderboard Service is provided on an “as is” and “as available” basis; we do not guarantee it will be continuously available, timely, accurate, or retained indefinitely.",
        },
      ],
    },
    {
      h: "7. Privacy",
      blocks: [
        {
          p: "Your use of the Software is also governed by the Privacy Notice (published on the official website), which is incorporated into this Agreement by reference. Core features run locally on your device; uploads occur only when you enable the Leaderboard Service, as detailed in the Privacy Notice and the in-app consent dialog.",
        },
      ],
    },
    {
      h: "8. Updates",
      blocks: [
        {
          p: "The Licensor may (but is not obliged to) provide updates, upgrades, patches, or new versions from time to time. Unless an update is accompanied by separate terms, this Agreement applies to it. Some updates may be necessary to fix security issues; we recommend installing them promptly. We may cease supporting older versions at any time.",
        },
      ],
    },
    {
      h: "9. Beta status; availability",
      blocks: [
        {
          p: "You understand and agree that the Software is currently a pre-release beta that may contain defects, errors, or instability, and may change, be interrupted, or be discontinued at any time. The Licensor does not warrant that the Software is suitable for any production or critical use.",
        },
        {
          p: "The Software is provided free of charge during the beta. The Licensor reserves the right to introduce paid features, subscriptions, or price changes in future versions; any such change will be announced before it takes effect and will not affect your use of an existing version.",
        },
      ],
    },
    {
      h: "10. Disclaimer of warranties",
      blocks: [
        {
          p: "To the maximum extent permitted by applicable law, the Software and the Leaderboard Service are provided “as is” and “as available”, without warranty of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement. The Licensor does not warrant that the Software will be error-free or uninterrupted, that its results are accurate or reliable, or that all defects will be corrected.",
        },
        {
          p: "Any cost or spend estimates shown by the Software are approximate figures based on a bundled price table, not a bill or financial record, and must not be relied upon as the sole basis for any decision. Some jurisdictions do not allow the exclusion of implied warranties, so some of the above exclusions may not apply to you; in that case you may have statutory rights that this Agreement does not seek to limit. In particular, nothing in this Agreement excludes, restricts, or modifies any consumer guarantee, right, or remedy you may have under the Australian Consumer Law or other applicable law that cannot lawfully be excluded.",
        },
      ],
    },
    {
      h: "11. Limitation of liability",
      blocks: [
        {
          p: "To the maximum extent permitted by applicable law, and regardless of the legal theory, the Licensor and its members will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, data, goodwill, or opportunity, even if advised of the possibility of such damages.",
        },
        {
          p: "In no event will the Licensor's total cumulative liability arising out of or relating to this Agreement or the Software exceed the amount you paid for the relevant Software (and because the Software is free during the beta, the minimum amount permitted by applicable law). This section does not exclude or limit any liability that cannot be excluded or limited under applicable law (such as liability for death or personal injury caused by negligence, or for fraud).",
        },
      ],
    },
    {
      h: "12. Indemnification",
      blocks: [
        {
          p: "To the extent permitted by applicable law, you agree to defend, indemnify, and hold the Licensor harmless from any third-party claims, losses, or costs (including reasonable legal fees) arising out of or related to your breach of this Agreement or your misuse of the Software or Leaderboard Service.",
        },
      ],
    },
    {
      h: "13. Export and compliance",
      blocks: [
        {
          p: "You represent that you are not located in a country subject to applicable trade sanctions or embargo, are not on any restricted-party list, and will comply with all applicable export-control and sanctions laws, and will not use the Software for any purpose prohibited by those laws.",
        },
      ],
    },
    {
      h: "14. Governing law and disputes",
      blocks: [
        {
          p: "This Agreement is governed by and construed under the laws of New South Wales, Australia, without regard to conflict-of-laws rules. The courts of New South Wales, Australia have exclusive jurisdiction over any dispute arising out of or relating to this Agreement. Nothing in this section affects any non-waivable rights you have as a consumer under the mandatory law of your place of residence, including the Australian Consumer Law where it applies.",
        },
      ],
    },
    {
      h: "15. Termination",
      blocks: [
        {
          p: "This Agreement is effective when you first install or use the Software and continues until terminated. It will terminate automatically, without notice, if you breach any of its terms. You may terminate it at any time by ceasing all use and deleting all copies of the Software.",
        },
        {
          p: "Upon termination, the license granted in Section 2 ends immediately and you must stop using and delete all copies of the Software. Provisions that by their nature should survive (including Sections 4, 10, 11, 12, and 14) survive termination. To delete a Leaderboard Service record, follow the process described in the Privacy Notice.",
        },
      ],
    },
    {
      h: "16. General",
      blocks: [
        {
          list: [
            "Entire agreement — This Agreement, together with the Privacy Notice, the Security Policy, and the LICENSE, is the entire agreement between you and the Licensor regarding the Software and supersedes any prior understanding.",
            "Severability — If any provision is held invalid or unenforceable, the remaining provisions stay in full effect.",
            "No waiver — A failure or delay in exercising any right is not a waiver of it.",
            "Assignment — You may not assign or transfer this Agreement; the Licensor may assign it in connection with a merger, acquisition, or transfer of assets.",
            "Force majeure — The Licensor is not liable for delay or failure to perform due to events beyond its reasonable control.",
          ],
        },
      ],
    },
    {
      h: "17. Language",
      blocks: [
        {
          p: "The English version of this Agreement prevails. We may provide translations (for example Chinese, Japanese, and Korean) for convenience; in the event of any discrepancy or conflict between a translation and the English version, the English version governs.",
        },
      ],
    },
    {
      h: "18. Contact",
      blocks: [
        {
          code: "Publisher: Poietic Studio — trading name of the developers of Token Forest (New South Wales, Australia)\nGeneral/legal: contact@tokenforest.com.au\nPrivacy:  see the Privacy Notice\nSecurity: see the Security Policy\nWebsite:  https://www.tokenforest.com.au",
        },
      ],
    },
  ],
};

const ZH: LegalDoc = {
  title: "Token Forest 最终用户许可协议(EULA)",
  meta: [
    "版本 1.0-beta(发布前草案) · 最后更新 2026-07-09 · 首个公开版本发布时生效",
    "发布者:Poietic Studio",
  ],
  sections: [
    {
      blocks: [
        {
          p: "本最终用户许可协议(“本协议”)是您(“您”)与 Token Forest 的开发者(以“Poietic Studio”之名运营,以下称“我们”或“许可方”)之间就 Token Forest 软件(“本软件”)订立的具有法律约束力的协议。“Poietic Studio”是开发者使用的字号,目前并非独立注册的法律实体;本协议项下的许可方为运营该项目的开发者个人。请在安装或使用前仔细阅读本协议。一旦您下载、安装、访问或以任何方式使用本软件,即表示您已阅读、理解并同意受本协议约束;若您不同意,请勿安装或使用,并删除已获取的所有副本。若您代表某一组织接受本协议,您声明您有权使该组织受本协议约束。",
        },
      ],
    },
    {
      h: "1. 定义",
      blocks: [
        {
          list: [
            "“本软件” —— Token Forest 桌面应用程序(Windows 与 macOS),包括其可执行文件、内置资源、文档,以及我们提供的任何更新。",
            "“排行榜服务” —— 本软件中可选的、需您主动开启的在线全球排行榜及其后端。",
            "“文档” —— 随本软件或在官网提供的说明、《隐私声明》与《安全政策》。",
            "“官方渠道” —— https://www.tokenforest.com.au 及我们指定的官方仓库(GitHub Releases)。",
          ],
        },
      ],
    },
    {
      h: "2. 许可授予",
      blocks: [
        {
          p: "在您持续遵守本协议的前提下,许可方授予您一项有限的、非独占的、不可转让、不可再许可、可撤销的许可,允许您:(a) 在您拥有或控制的设备上下载并安装本软件;(b) 为您个人或组织内部之目的,以本软件预期的方式运行和使用本软件。",
        },
        {
          p: "在公开测试期间,本软件免费提供。有关测试性质与未来可能的收费,见第 9 条。",
        },
      ],
    },
    {
      h: "3. 许可限制",
      blocks: [
        {
          p: "除非适用法律强制允许、或经我们书面明确许可,您不得(亦不得允许任何第三方):",
        },
        {
          list: [
            "复制、分发、出售、出租、出借、转让或再许可本软件,或以其他方式对其进行商业利用;",
            "反向工程、反编译、反汇编本软件,或试图获取其源代码或底层结构(在强制性法律明确不能禁止的最低限度内除外);",
            "修改、翻译本软件,或基于本软件制作衍生作品;",
            "删除、遮蔽或更改任何版权、商标或其他所有权声明;",
            "规避、破解或干扰本软件或排行榜服务的任何安全、验证或技术保护措施;",
            "将本软件用于任何违法目的,或以侵犯他人权利的方式使用;",
            "使用本软件开发与之实质竞争的产品或服务。",
          ],
        },
      ],
    },
    {
      h: "4. 所有权与知识产权",
      blocks: [
        {
          p: "本软件系授权使用,而非出售。许可方及其许可人保留对本软件及文档的全部权利、所有权与利益,包括其中一切知识产权。除本协议明确授予的权利外,您不获得任何权利。本软件的像素美术、图标、名称、标识与品牌元素受版权与商标保护,并另受官方仓库中发布的 LICENSE(美术与品牌条款)约束。",
        },
      ],
    },
    {
      h: "5. 第三方工具与无关联声明",
      blocks: [
        {
          p: "本软件读取 Claude Code 与 OpenAI Codex 在您本机生成的用量日志以实现其功能。这些第三方工具由其各自的提供方运营,并受其各自条款约束。Token Forest 与 Anthropic、OpenAI 及其任何关联方无从属、赞助或背书关系;相关名称仅用于说明兼容性。您应自行合法地使用这些第三方工具。",
        },
      ],
    },
    {
      h: "6. 可选排行榜服务",
      blocks: [
        {
          p: "排行榜服务默认关闭,仅在您通过应用内的同意确认主动开启后才会运行。使用排行榜服务时,您同意:",
        },
        {
          list: [
            "不上传虚假、误导、伪造或以人为方式夸大的数据(包括刷分或伪造 token 数);",
            "不设置违法、侵权、辱骂、仇恨、色情或其他不当的昵称或内容;",
            "不干扰、攻击、探测或试图未经授权访问排行榜服务或其他用户的记录;",
            "排行榜服务同步的数据、其展示方式及删除机制,依《隐私声明》所述处理。",
          ],
        },
        {
          p: "我们可在不事先通知的情况下移除违规的记录或昵称,并暂停或终止任何用户对排行榜服务的访问。排行榜服务按“现状”及“可用状态”提供,我们不保证其持续可用、及时、准确或永久保留。",
        },
      ],
    },
    {
      h: "7. 隐私",
      blocks: [
        {
          p: "您对本软件的使用同时受《隐私声明》(发布于官网)约束,该声明以引用方式并入本协议。核心功能在您的设备本地运行;仅当您开启排行榜服务时才会发生上传,具体内容以《隐私声明》与应用内同意确认为准。",
        },
      ],
    },
    {
      h: "8. 更新",
      blocks: [
        {
          p: "许可方可(但无义务)不时提供更新、升级、补丁或新版本。除非更新随附单独条款,否则本协议同样适用。部分更新可能为修复安全问题所必需,建议您及时安装。我们可在任何时候停止对旧版本的支持。",
        },
      ],
    },
    {
      h: "9. 测试版性质;可用性",
      blocks: [
        {
          p: "您理解并同意:本软件目前为发布前测试版,可能包含缺陷、错误或不稳定之处,并可能随时变更、中断或停止提供。许可方不保证本软件适用于任何生产或关键用途。",
        },
        {
          p: "本软件在测试期间免费提供。许可方保留在未来版本中引入付费功能、订阅或价格变动的权利;任何该等变更将在生效前另行告知,且不影响您对既有版本的使用。",
        },
      ],
    },
    {
      h: "10. 免责声明",
      blocks: [
        {
          p: "在适用法律允许的最大范围内,本软件与排行榜服务均按“现状”及“可用状态”提供,不附带任何明示或默示的保证,包括但不限于对适销性、特定用途适用性、所有权及不侵权的默示保证。许可方不保证本软件无错误或不中断运行、其结果准确可靠,或所有缺陷都将被修正。",
        },
        {
          p: "本软件所显示的成本/花费估算,仅为基于内置价格表的近似值,并非账单或财务凭据,不应作为任何决策的唯一依据。部分司法辖区不允许排除默示保证,故上述部分排除可能不适用于您;在此情形下,您可能享有本协议无意限制的法定权利。特别地,本协议中的任何内容均不排除、限制或变更您依《澳大利亚消费者法》或其他适用法律所享有的、依法不得排除的任何消费者保障、权利或救济。",
        },
      ],
    },
    {
      h: "11. 责任限制",
      blocks: [
        {
          p: "在适用法律允许的最大范围内,无论基于何种法律理论,许可方及其成员均不对任何间接的、附带的、特殊的、后果性的或惩罚性的损害,或利润、数据、商誉或机会的损失承担责任,即使已被告知该等损害的可能性。",
        },
        {
          p: "在任何情况下,许可方就本协议或本软件产生的全部累计责任,不超过您为相关软件实际支付的金额(因本软件在测试期间免费,故以适用法律允许的最低限额为准)。本条不排除或限制依法不得排除或限制的任何责任(例如因过失致人死亡或人身伤害的责任,或因欺诈产生的责任)。",
        },
      ],
    },
    {
      h: "12. 赔偿",
      blocks: [
        {
          p: "在适用法律允许的范围内,对于因您违反本协议或滥用本软件/排行榜服务而引起或与之相关的任何第三方主张、损失或费用(包括合理的律师费),您同意为许可方抗辩、予以赔偿并使其免受损害。",
        },
      ],
    },
    {
      h: "13. 出口与合规",
      blocks: [
        {
          p: "您声明:您不位于任何受适用贸易制裁或禁运的国家/地区,亦未被列入任何受限方名单,并将遵守所有适用的出口管制与制裁法律,不将本软件用于该等法律所禁止的用途。",
        },
      ],
    },
    {
      h: "14. 适用法律与争议解决",
      blocks: [
        {
          p: "本协议受澳大利亚新南威尔士州法律管辖并据其解释,不适用其法律冲突规则。因本协议引起或与之相关的任何争议,由澳大利亚新南威尔士州法院专属管辖。前述约定不影响您作为消费者依住所地强制性法律所享有的任何不可放弃的权利,包括在适用时的《澳大利亚消费者法》。",
        },
      ],
    },
    {
      h: "15. 期限与终止",
      blocks: [
        {
          p: "本协议自您首次安装或使用本软件时生效,并持续至被终止。若您违反本协议任何条款,本协议将自动终止,无需通知。您也可随时通过停止使用并删除本软件的全部副本来终止本协议。",
        },
        {
          p: "终止后,第 2 条授予的许可立即消灭,您应停止使用并删除本软件的所有副本。就其性质应当存续的条款(包括第 4、10、11、12、14 条)在终止后继续有效。如需删除排行榜服务的记录,请依《隐私声明》所述办理。",
        },
      ],
    },
    {
      h: "16. 一般条款",
      blocks: [
        {
          list: [
            "完整协议 —— 本协议连同《隐私声明》《安全政策》及 LICENSE,构成您与许可方之间就本软件的完整协议,并取代此前一切谅解。",
            "可分割性 —— 若本协议任一条款被认定为无效或不可执行,其余条款仍完全有效。",
            "不弃权 —— 未行使或迟延行使任何权利,不构成对该权利的放弃。",
            "转让 —— 您不得转让或转移本协议;许可方可在合并、收购或资产转让时转让本协议。",
            "不可抗力 —— 对于因超出合理控制范围的事件导致的履行迟延或不能,许可方不承担责任。",
          ],
        },
      ],
    },
    {
      h: "17. 语言",
      blocks: [
        {
          p: "本协议以英文版本为准。为方便理解,我们可能提供中文、日文、韩文等译本;若译本与英文版存在任何歧义或冲突,以英文版本为准。",
        },
      ],
    },
    {
      h: "18. 联系我们",
      blocks: [
        {
          code: "发布者:Poietic Studio —— Token Forest 开发者使用的字号(澳大利亚新南威尔士州)\n一般/法务:contact@tokenforest.com.au\n隐私:  见《隐私声明》\n安全:  见《安全政策》\n官网:  https://www.tokenforest.com.au",
        },
      ],
    },
  ],
};

const JA: LegalDoc = {
  title: "Token Forest エンドユーザーライセンス契約(EULA)",
  meta: [
    "バージョン 1.0-beta(プレリリース草案) · 最終更新 2026-07-09 · 最初の公開リリース時に発効",
    "発行者:Poietic Studio",
  ],
  sections: [
    {
      blocks: [
        {
          p: "本エンドユーザーライセンス契約(以下「本契約」)は、あなた(以下「あなた」)と、Token Forest の開発者(「Poietic Studio」の名称で運営。以下「当社」または「許諾者」)との間で、Token Forest ソフトウェア(以下「本ソフトウェア」)について締結される、法的拘束力のある契約です。「Poietic Studio」は開発者が用いる商号であり、現時点では独立して登記された法人ではありません。本契約における許諾者は、これを運営する個人の開発者です。インストールまたは使用の前に、本契約をよくお読みください。本ソフトウェアをダウンロード、インストール、アクセス、または使用することにより、あなたは本契約を読み、理解し、これに拘束されることに同意したものとみなされます。同意されない場合は、本ソフトウェアをインストール・使用せず、取得したすべての複製を削除してください。組織を代表して本契約に同意する場合、あなたはその組織を拘束する権限を有することを表明します。",
        },
      ],
    },
    {
      h: "1. 定義",
      blocks: [
        {
          list: [
            "「本ソフトウェア」——Token Forest デスクトップアプリケーション(Windows および macOS)。実行ファイル、同梱アセット、ドキュメント、および当社が提供する更新を含みます。",
            "「リーダーボードサービス」——本ソフトウェアの任意かつオプトインのオンライングローバルリーダーボードおよびそのバックエンド。",
            "「ドキュメント」——本ソフトウェアに付属し、または公式ウェブサイトで提供される説明、プライバシー通知、およびセキュリティポリシー。",
            "「公式チャネル」——https://www.tokenforest.com.au および当社が指定する公式リポジトリ(GitHub Releases)。",
          ],
        },
      ],
    },
    {
      h: "2. ライセンスの許諾",
      blocks: [
        {
          p: "あなたが本契約を継続的に遵守することを条件として、許諾者はあなたに対し、限定的・非独占的・譲渡不可・再許諾不可・撤回可能なライセンスを許諾します。これにより、あなたは、(a) あなたが所有または管理する端末に本ソフトウェアをダウンロードおよびインストールし、(b) 本ソフトウェアを、その予定された方法で、あなた個人または組織内部の目的のために実行・使用することができます。",
        },
        {
          p: "公開ベータ期間中、本ソフトウェアは無償で提供されます。ベータの性質および将来の課金の可能性については第 9 条をご覧ください。",
        },
      ],
    },
    {
      h: "3. ライセンスの制限",
      blocks: [
        {
          p: "強行的な適用法により認められる場合、または当社の書面による明示的な許可がある場合を除き、あなたは次の行為を行ってはならず、第三者にも行わせてはなりません:",
        },
        {
          list: [
            "本ソフトウェアの複製、配布、販売、賃貸、貸与、譲渡もしくは再許諾、またはその他の方法による商業的利用;",
            "本ソフトウェアのリバースエンジニアリング、逆コンパイル、逆アセンブル、またはソースコードもしくは基盤構造を導き出そうとする行為(強行法規により禁止できない最小限の範囲を除く);",
            "本ソフトウェアの改変、翻訳、または二次的著作物の作成;",
            "著作権、商標その他の権利表示の削除、隠蔽または変更;",
            "本ソフトウェアまたはリーダーボードサービスのセキュリティ、認証もしくは技術的保護の回避、無効化または妨害;",
            "本ソフトウェアの違法な目的での使用、または他者の権利を侵害する方法での使用;",
            "本ソフトウェアを用いて競合する製品またはサービスを開発する行為。",
          ],
        },
      ],
    },
    {
      h: "4. 所有権および知的財産権",
      blocks: [
        {
          p: "本ソフトウェアは販売されるのではなく、使用が許諾されるものです。許諾者およびそのライセンサーは、本ソフトウェアおよびドキュメントに関する一切の権利、権原および利益(すべての知的財産権を含む)を保持します。本契約で明示的に付与された権利を除き、あなたにいかなる権利も付与されません。ピクセルアート、アイコン、名称、ロゴおよびブランド要素は著作権および商標により保護され、加えて公式リポジトリで公開される LICENSE(アートおよびブランドの条件)に従います。",
        },
      ],
    },
    {
      h: "5. 第三者ツールおよび非提携",
      blocks: [
        {
          p: "本ソフトウェアは、機能を実現するために、Claude Code および OpenAI Codex があなたのマシン上でローカルに書き出す使用ログを読み取ります。これらの第三者ツールはそれぞれの提供者により運営され、それぞれの規約に従います。Token Forest は Anthropic、OpenAI またはそれらの関連会社と提携・出資・推奨の関係にはなく、これらの名称は互換性を説明するためにのみ使用しています。これらの第三者ツールを適法に使用する責任はあなたにあります。",
        },
      ],
    },
    {
      h: "6. 任意のリーダーボードサービス",
      blocks: [
        {
          p: "リーダーボードサービスは既定でオフであり、アプリ内の同意ダイアログを通じてあなたが有効にした場合にのみ動作します。リーダーボードサービスを利用する場合、あなたは次に同意します:",
        },
        {
          list: [
            "虚偽・誤解を招く・捏造された・人為的に水増しされたデータ(スコアの不正操作やトークン数の偽装を含む)をアップロードしないこと;",
            "違法・権利侵害・侮辱的・差別的・性的、その他の不適切な表示名またはコンテンツを設定しないこと;",
            "リーダーボードサービスや他のユーザーの記録を妨害・攻撃・探索し、または不正にアクセスしようとしないこと;",
            "リーダーボードサービスが同期するデータ、その表示方法および削除方法は、プライバシー通知に記載のとおり取り扱われること。",
          ],
        },
        {
          p: "当社は、違反する記録または名前を削除し、いかなるユーザーのリーダーボードサービスへのアクセスも、事前の通知なく停止または終了することができます。リーダーボードサービスは「現状有姿(as is)」かつ「提供可能な状態(as available)」で提供され、当社は、その継続的な可用性、適時性、正確性、または永続的な保持を保証しません。",
        },
      ],
    },
    {
      h: "7. プライバシー",
      blocks: [
        {
          p: "本ソフトウェアの使用は、公式ウェブサイトで公開されるプライバシー通知にも従うものとし、同通知は引用により本契約に組み込まれます。中核機能はあなたの端末上でローカルに動作し、アップロードは、プライバシー通知およびアプリ内の同意ダイアログに詳述されるとおり、リーダーボードサービスを有効にした場合にのみ発生します。",
        },
      ],
    },
    {
      h: "8. 更新",
      blocks: [
        {
          p: "許諾者は、随時、更新、アップグレード、パッチまたは新バージョンを提供することができます(ただし義務ではありません)。更新に別段の条件が付されない限り、本契約は当該更新にも適用されます。一部の更新はセキュリティ問題の修正に必要な場合があり、速やかなインストールを推奨します。当社はいつでも旧バージョンのサポートを終了できます。",
        },
      ],
    },
    {
      h: "9. ベータの性質;可用性",
      blocks: [
        {
          p: "あなたは、本ソフトウェアが現在プレリリースのベータであり、欠陥、エラーまたは不安定さを含む可能性があり、いつでも変更・中断・提供終了され得ることを理解し、同意します。許諾者は、本ソフトウェアが本番環境または重要な用途に適することを保証しません。",
        },
        {
          p: "本ソフトウェアはベータ期間中は無償で提供されます。許諾者は、将来のバージョンで有料機能、サブスクリプションまたは価格変更を導入する権利を留保します。かかる変更は発効前に告知され、既存バージョンの使用には影響しません。",
        },
      ],
    },
    {
      h: "10. 保証の否認",
      blocks: [
        {
          p: "適用法により認められる最大限の範囲で、本ソフトウェアおよびリーダーボードサービスは「現状有姿(as is)」かつ「提供可能な状態(as available)」で提供され、明示黙示を問わず、商品性、特定目的への適合性、権原および非侵害の黙示の保証を含め、いかなる種類の保証も伴いません。許諾者は、本ソフトウェアが無欠陥または無中断であること、その結果が正確または信頼できること、またはすべての欠陥が修正されることを保証しません。",
        },
        {
          p: "本ソフトウェアが表示する費用・支出の見積もりは、同梱の価格表に基づく概算であり、請求書や財務記録ではなく、いかなる判断の唯一の根拠としても依拠してはなりません。一部の法域では黙示の保証の排除が認められないため、上記の排除の一部があなたに適用されない場合があります。その場合、あなたは本契約が制限しようとしない法定の権利を有することがあります。特に、本契約のいかなる規定も、オーストラリア消費者法その他の適用法により法的に排除できない消費者保証、権利または救済を、排除・制限・変更するものではありません。",
        },
      ],
    },
    {
      h: "11. 責任の制限",
      blocks: [
        {
          p: "適用法により認められる最大限の範囲で、法的根拠のいかんを問わず、許諾者およびその構成員は、間接的・付随的・特別・結果的または懲罰的損害、または利益、データ、信用もしくは機会の損失について、たとえその可能性を知らされていたとしても、一切責任を負いません。",
        },
        {
          p: "いかなる場合も、本契約または本ソフトウェアに起因または関連する許諾者の累積的な責任の総額は、あなたが当該ソフトウェアについて支払った金額(本ソフトウェアはベータ期間中無償であるため、適用法が認める最低額)を超えないものとします。本条は、適用法上排除または制限できない責任(過失による死亡もしくは人身傷害、または詐欺に対する責任など)を排除または制限するものではありません。",
        },
      ],
    },
    {
      h: "12. 補償",
      blocks: [
        {
          p: "適用法により認められる範囲で、あなたによる本契約違反、または本ソフトウェアもしくはリーダーボードサービスの誤用に起因または関連する第三者からの請求、損失または費用(合理的な弁護士費用を含む)について、あなたは許諾者を防御し、補償し、損害を被らせないことに同意します。",
        },
      ],
    },
    {
      h: "13. 輸出およびコンプライアンス",
      blocks: [
        {
          p: "あなたは、適用される貿易制裁または禁輸の対象国に所在せず、いかなる制限対象者リストにも掲載されておらず、適用されるすべての輸出管理および制裁法を遵守し、これらの法により禁止される目的で本ソフトウェアを使用しないことを表明します。",
        },
      ],
    },
    {
      h: "14. 準拠法および紛争解決",
      blocks: [
        {
          p: "本契約は、オーストラリア・ニューサウスウェールズ州の法に準拠し、これに従って解釈されるものとし、法の抵触に関する規則は適用されません。本契約に起因または関連する紛争は、オーストラリア・ニューサウスウェールズ州の裁判所の専属管轄に服します。本条は、消費者としてのあなたの居住地の強行法(適用される場合はオーストラリア消費者法を含む)により放棄できない権利には影響しません。",
        },
      ],
    },
    {
      h: "15. 期間および終了",
      blocks: [
        {
          p: "本契約は、あなたが本ソフトウェアを最初にインストールまたは使用した時点で効力を生じ、終了するまで存続します。あなたが本契約のいずれかの条項に違反した場合、本契約は通知なく自動的に終了します。あなたは、いつでも、すべての使用を停止し本ソフトウェアのすべての複製を削除することにより、本契約を終了できます。",
        },
        {
          p: "終了時には、第 2 条で許諾されたライセンスは直ちに消滅し、あなたは本ソフトウェアの使用を停止し、すべての複製を削除しなければなりません。その性質上存続すべき条項(第 4、10、11、12、14 条を含む)は、終了後も存続します。リーダーボードサービスの記録を削除するには、プライバシー通知に記載の手順に従ってください。",
        },
      ],
    },
    {
      h: "16. 一般条項",
      blocks: [
        {
          list: [
            "完全合意 —— 本契約は、プライバシー通知、セキュリティポリシーおよび LICENSE とともに、本ソフトウェアに関するあなたと許諾者との間の完全な合意を構成し、従前の一切の了解に優先します。",
            "可分性 —— いずれかの条項が無効または執行不能と判断された場合でも、残りの条項は完全に有効なまま存続します。",
            "権利不放棄 —— いずれかの権利の行使を怠りまたは遅延しても、当該権利の放棄とはなりません。",
            "譲渡 —— あなたは本契約を譲渡または移転できません。許諾者は、合併、買収または資産譲渡に関連して本契約を譲渡できます。",
            "不可抗力 —— 合理的な支配を超える事由による履行の遅延または不能について、許諾者は責任を負いません。",
          ],
        },
      ],
    },
    {
      h: "17. 言語",
      blocks: [
        {
          p: "本契約は英語版が優先します。当社は便宜のために翻訳(例:中国語、日本語、韓国語)を提供する場合があります。翻訳と英語版との間に相違または矛盾がある場合は、英語版が優先します。",
        },
      ],
    },
    {
      h: "18. お問い合わせ",
      blocks: [
        {
          code: "発行者:Poietic Studio —— Token Forest の開発者が用いる商号(オーストラリア・ニューサウスウェールズ州)\n一般/法務:contact@tokenforest.com.au\nプライバシー:プライバシー通知を参照\nセキュリティ:セキュリティポリシーを参照\nウェブサイト:https://www.tokenforest.com.au",
        },
      ],
    },
  ],
};

const KO: LegalDoc = {
  title: "Token Forest 최종 사용자 라이선스 계약(EULA)",
  meta: [
    "버전 1.0-beta(사전 공개 초안) · 최종 업데이트 2026-07-09 · 최초 공개 릴리스 시 발효",
    "발행자: Poietic Studio",
  ],
  sections: [
    {
      blocks: [
        {
          p: "본 최종 사용자 라이선스 계약(이하 “본 계약”)은 귀하(이하 “귀하”)와 Token Forest의 개발자(“Poietic Studio”라는 이름으로 운영, 이하 “당사” 또는 “라이선서”) 사이에 Token Forest 소프트웨어(이하 “본 소프트웨어”)에 관하여 체결되는 법적 구속력이 있는 계약입니다. “Poietic Studio”는 개발자가 사용하는 상호이며 현재는 별도로 등록된 법인이 아닙니다. 본 계약상 라이선서는 이를 운영하는 개인 개발자입니다. 설치 또는 사용 전에 본 계약을 주의 깊게 읽어 주십시오. 본 소프트웨어를 다운로드, 설치, 접근 또는 사용함으로써 귀하는 본 계약을 읽고 이해하였으며 이에 구속되는 데 동의한 것으로 봅니다. 동의하지 않는 경우 본 소프트웨어를 설치·사용하지 말고, 취득한 모든 사본을 삭제하십시오. 조직을 대표하여 본 계약에 동의하는 경우, 귀하는 해당 조직을 구속할 권한이 있음을 진술합니다.",
        },
      ],
    },
    {
      h: "1. 정의",
      blocks: [
        {
          list: [
            "“본 소프트웨어” — Token Forest 데스크톱 애플리케이션(Windows 및 macOS)으로, 실행 파일, 내장 자산, 문서 및 당사가 제공하는 모든 업데이트를 포함합니다.",
            "“리더보드 서비스” — 본 소프트웨어의 선택적이고 옵트인 방식인 온라인 글로벌 리더보드 및 그 백엔드.",
            "“문서” — 본 소프트웨어와 함께 또는 공식 웹사이트에서 제공되는 안내, 개인정보 보호정책 및 보안 정책.",
            "“공식 채널” — https://www.tokenforest.com.au 및 당사가 지정한 공식 저장소(GitHub Releases).",
          ],
        },
      ],
    },
    {
      h: "2. 라이선스 부여",
      blocks: [
        {
          p: "귀하가 본 계약을 지속적으로 준수하는 것을 조건으로, 라이선서는 귀하에게 제한적·비독점적·양도 불가·재라이선스 불가·철회 가능한 라이선스를 부여합니다. 이에 따라 귀하는 (a) 귀하가 소유하거나 통제하는 기기에 본 소프트웨어를 다운로드하고 설치할 수 있으며, (b) 본 소프트웨어를 그 의도된 방식으로 귀하의 개인적 또는 조직 내부 목적을 위해 실행하고 사용할 수 있습니다.",
        },
        {
          p: "공개 베타 기간 동안 본 소프트웨어는 무료로 제공됩니다. 베타의 성격 및 향후 과금 가능성에 관하여는 제9조를 참조하십시오.",
        },
      ],
    },
    {
      h: "3. 라이선스 제한",
      blocks: [
        {
          p: "강행적인 적용 법률이 허용하는 경우 또는 당사의 서면 명시적 허가가 있는 경우를 제외하고, 귀하는 다음 행위를 해서는 안 되며 제3자가 하도록 허용해서도 안 됩니다:",
        },
        {
          list: [
            "본 소프트웨어의 복제, 배포, 판매, 임대, 대여, 양도 또는 재라이선스, 기타 방법에 의한 상업적 이용;",
            "본 소프트웨어의 리버스 엔지니어링, 디컴파일, 디스어셈블, 또는 소스 코드나 기반 구조를 도출하려는 시도(강행 법규상 금지할 수 없는 최소한의 범위 제외);",
            "본 소프트웨어의 수정, 번역 또는 2차적 저작물 작성;",
            "저작권, 상표 기타 소유권 고지의 삭제, 은폐 또는 변경;",
            "본 소프트웨어 또는 리더보드 서비스의 보안, 인증 또는 기술적 보호의 우회, 무력화 또는 방해;",
            "본 소프트웨어의 불법적 목적 사용, 또는 타인의 권리를 침해하는 방식의 사용;",
            "본 소프트웨어를 이용하여 경쟁 제품 또는 서비스를 개발하는 행위.",
          ],
        },
      ],
    },
    {
      h: "4. 소유권 및 지식재산권",
      blocks: [
        {
          p: "본 소프트웨어는 판매되는 것이 아니라 사용이 허가되는 것입니다. 라이선서와 그 라이선서들은 본 소프트웨어 및 문서에 관한 모든 권리, 권원 및 이익(모든 지식재산권 포함)을 보유합니다. 본 계약에서 명시적으로 부여된 권리를 제외하고는 귀하에게 어떠한 권리도 부여되지 않습니다. 픽셀 아트, 아이콘, 명칭, 로고 및 브랜드 요소는 저작권과 상표로 보호되며, 추가로 공식 저장소에 게시된 LICENSE(아트 및 브랜드 조건)의 적용을 받습니다.",
        },
      ],
    },
    {
      h: "5. 제3자 도구 및 비제휴",
      blocks: [
        {
          p: "본 소프트웨어는 기능 구현을 위해 Claude Code 및 OpenAI Codex가 귀하의 기기에 로컬로 기록하는 사용 로그를 읽습니다. 이러한 제3자 도구는 각 제공자가 운영하며 각자의 약관의 적용을 받습니다. Token Forest는 Anthropic, OpenAI 또는 그 계열사와 제휴·후원·보증 관계가 없으며, 해당 명칭은 오직 호환성을 설명하기 위해 사용됩니다. 이러한 제3자 도구를 적법하게 사용할 책임은 귀하에게 있습니다.",
        },
      ],
    },
    {
      h: "6. 선택형 리더보드 서비스",
      blocks: [
        {
          p: "리더보드 서비스는 기본적으로 꺼져 있으며, 앱 내 동의 창을 통해 귀하가 활성화한 경우에만 작동합니다. 리더보드 서비스를 이용할 때 귀하는 다음에 동의합니다:",
        },
        {
          list: [
            "허위·오해를 유발하는·조작된·인위적으로 부풀린 데이터(점수 부정 조작 또는 토큰 수 위조 포함)를 업로드하지 않을 것;",
            "불법·침해·모욕·혐오·성적, 기타 부적절한 표시 이름이나 콘텐츠를 설정하지 않을 것;",
            "리더보드 서비스나 다른 사용자의 기록을 방해·공격·탐지하거나 무단으로 접근하려 하지 않을 것;",
            "리더보드 서비스가 동기화하는 데이터, 그 표시 방식 및 삭제 방식은 개인정보 보호정책에 기재된 대로 처리된다는 것.",
          ],
        },
        {
          p: "당사는 위반하는 기록이나 이름을 삭제하고, 어떤 사용자의 리더보드 서비스 접근도 사전 통지 없이 정지하거나 종료할 수 있습니다. 리더보드 서비스는 “있는 그대로(as is)” 및 “이용 가능한 상태(as available)”로 제공되며, 당사는 그 지속적 가용성, 적시성, 정확성 또는 영구적 보존을 보장하지 않습니다.",
        },
      ],
    },
    {
      h: "7. 개인정보",
      blocks: [
        {
          p: "본 소프트웨어의 사용은 공식 웹사이트에 게시된 개인정보 보호정책의 적용도 받으며, 해당 정책은 인용에 의해 본 계약에 편입됩니다. 핵심 기능은 귀하의 기기에서 로컬로 실행되며, 업로드는 개인정보 보호정책 및 앱 내 동의 창에 상세히 기재된 바와 같이 리더보드 서비스를 활성화한 경우에만 발생합니다.",
        },
      ],
    },
    {
      h: "8. 업데이트",
      blocks: [
        {
          p: "라이선서는 수시로 업데이트, 업그레이드, 패치 또는 새 버전을 제공할 수 있습니다(다만 의무는 아닙니다). 업데이트에 별도의 약관이 수반되지 않는 한 본 계약이 해당 업데이트에도 적용됩니다. 일부 업데이트는 보안 문제 해결에 필요할 수 있으며, 신속한 설치를 권장합니다. 당사는 언제든지 이전 버전에 대한 지원을 중단할 수 있습니다.",
        },
      ],
    },
    {
      h: "9. 베타 성격; 가용성",
      blocks: [
        {
          p: "귀하는 본 소프트웨어가 현재 사전 공개 베타로서 결함, 오류 또는 불안정성을 포함할 수 있으며 언제든지 변경·중단·제공 종료될 수 있음을 이해하고 이에 동의합니다. 라이선서는 본 소프트웨어가 어떠한 프로덕션 또는 중요 용도에 적합함을 보증하지 않습니다.",
        },
        {
          p: "본 소프트웨어는 베타 기간 동안 무료로 제공됩니다. 라이선서는 향후 버전에서 유료 기능, 구독 또는 가격 변경을 도입할 권리를 보유합니다. 그러한 변경은 발효 전에 공지되며 기존 버전의 사용에는 영향을 미치지 않습니다.",
        },
      ],
    },
    {
      h: "10. 보증의 부인",
      blocks: [
        {
          p: "적용 법률이 허용하는 최대 범위에서, 본 소프트웨어 및 리더보드 서비스는 “있는 그대로(as is)” 및 “이용 가능한 상태(as available)”로 제공되며, 상품성, 특정 목적 적합성, 권원 및 비침해에 대한 묵시적 보증을 포함하여 명시적이든 묵시적이든 어떠한 종류의 보증도 하지 않습니다. 라이선서는 본 소프트웨어가 오류가 없거나 중단되지 않을 것, 그 결과가 정확하거나 신뢰할 수 있을 것, 또는 모든 결함이 수정될 것을 보증하지 않습니다.",
        },
        {
          p: "본 소프트웨어가 표시하는 비용·지출 추정치는 내장 가격표에 기반한 근사치이며 청구서나 재무 기록이 아니고, 어떠한 결정의 유일한 근거로 의존해서는 안 됩니다. 일부 관할에서는 묵시적 보증의 배제를 허용하지 않으므로 위 배제의 일부가 귀하에게 적용되지 않을 수 있으며, 그 경우 귀하는 본 계약이 제한하려 하지 않는 법정 권리를 가질 수 있습니다. 특히 본 계약의 어떠한 내용도 오스트레일리아 소비자법 또는 기타 적용 법률에 따라 법적으로 배제할 수 없는 소비자 보증, 권리 또는 구제를 배제·제한·변경하지 않습니다.",
        },
      ],
    },
    {
      h: "11. 책임의 제한",
      blocks: [
        {
          p: "적용 법률이 허용하는 최대 범위에서, 법적 이론을 불문하고, 라이선서와 그 구성원은 간접적·부수적·특별·결과적 또는 징벌적 손해, 또는 이익·데이터·영업권·기회의 손실에 대하여, 그러한 손해의 가능성을 통지받았더라도 책임을 지지 않습니다.",
        },
        {
          p: "어떠한 경우에도 본 계약 또는 본 소프트웨어에 기인하거나 관련된 라이선서의 누적 책임 총액은 귀하가 해당 소프트웨어에 대해 실제로 지불한 금액(본 소프트웨어는 베타 기간 동안 무료이므로 적용 법률이 허용하는 최소 금액)을 초과하지 않습니다. 본 조는 적용 법률상 배제하거나 제한할 수 없는 책임(과실로 인한 사망 또는 신체 상해, 또는 사기에 대한 책임 등)을 배제하거나 제한하지 않습니다.",
        },
      ],
    },
    {
      h: "12. 손해 보전",
      blocks: [
        {
          p: "적용 법률이 허용하는 범위에서, 귀하의 본 계약 위반 또는 본 소프트웨어·리더보드 서비스의 오용에 기인하거나 관련된 제3자의 청구, 손실 또는 비용(합리적인 변호사 비용 포함)에 대하여, 귀하는 라이선서를 방어하고 보전하며 손해를 입지 않도록 하는 데 동의합니다.",
        },
      ],
    },
    {
      h: "13. 수출 및 준법",
      blocks: [
        {
          p: "귀하는 적용되는 무역 제재 또는 금수 대상 국가에 소재하지 않으며, 어떠한 제한 대상자 목록에도 등재되어 있지 않고, 적용되는 모든 수출 통제 및 제재 법률을 준수하며, 그러한 법률이 금지하는 목적으로 본 소프트웨어를 사용하지 않을 것을 진술합니다.",
        },
      ],
    },
    {
      h: "14. 준거법 및 분쟁 해결",
      blocks: [
        {
          p: "본 계약은 오스트레일리아 뉴사우스웨일스주의 법에 의해 규율되고 해석되며, 법의 저촉에 관한 규칙은 적용되지 않습니다. 본 계약에 기인하거나 관련된 분쟁은 오스트레일리아 뉴사우스웨일스주 법원의 전속 관할에 따릅니다. 본 조는 소비자로서 귀하의 거주지 강행 법률(적용되는 경우 오스트레일리아 소비자법 포함)에 따라 포기할 수 없는 권리에는 영향을 미치지 않습니다.",
        },
      ],
    },
    {
      h: "15. 기간 및 종료",
      blocks: [
        {
          p: "본 계약은 귀하가 본 소프트웨어를 처음 설치하거나 사용하는 시점에 효력이 발생하며 종료될 때까지 유효합니다. 귀하가 본 계약의 어느 조항이라도 위반하면 본 계약은 통지 없이 자동으로 종료됩니다. 귀하는 언제든지 모든 사용을 중단하고 본 소프트웨어의 모든 사본을 삭제함으로써 본 계약을 종료할 수 있습니다.",
        },
        {
          p: "종료 시 제2조에서 부여된 라이선스는 즉시 소멸하며, 귀하는 본 소프트웨어의 사용을 중단하고 모든 사본을 삭제해야 합니다. 그 성격상 존속되어야 하는 조항(제4, 10, 11, 12, 14조 포함)은 종료 후에도 존속합니다. 리더보드 서비스 기록을 삭제하려면 개인정보 보호정책에 기재된 절차를 따르십시오.",
        },
      ],
    },
    {
      h: "16. 일반 조항",
      blocks: [
        {
          list: [
            "완전 합의 — 본 계약은 개인정보 보호정책, 보안 정책 및 LICENSE와 함께 본 소프트웨어에 관한 귀하와 라이선서 간의 완전한 합의를 구성하며, 이전의 모든 양해에 우선합니다.",
            "가분성 — 어느 조항이 무효 또는 집행 불가능으로 판단되더라도 나머지 조항은 완전한 효력을 유지합니다.",
            "권리 불포기 — 어떤 권리의 행사를 하지 않거나 지연하더라도 해당 권리의 포기가 되지 않습니다.",
            "양도 — 귀하는 본 계약을 양도하거나 이전할 수 없습니다. 라이선서는 합병, 인수 또는 자산 이전과 관련하여 본 계약을 양도할 수 있습니다.",
            "불가항력 — 합리적인 통제를 벗어난 사유로 인한 이행 지연 또는 불능에 대하여 라이선서는 책임을 지지 않습니다.",
          ],
        },
      ],
    },
    {
      h: "17. 언어",
      blocks: [
        {
          p: "본 계약은 영문판이 우선합니다. 당사는 편의를 위해 번역본(예: 중국어, 일본어, 한국어)을 제공할 수 있습니다. 번역본과 영문판 사이에 차이나 충돌이 있는 경우 영문판이 우선합니다.",
        },
      ],
    },
    {
      h: "18. 문의",
      blocks: [
        {
          code: "발행자: Poietic Studio — Token Forest 개발자가 사용하는 상호(오스트레일리아 뉴사우스웨일스주)\n일반/법무: contact@tokenforest.com.au\n개인정보: 개인정보 보호정책 참조\n보안: 보안 정책 참조\n웹사이트: https://www.tokenforest.com.au",
        },
      ],
    },
  ],
};

const NOTE: Partial<Record<Locale, string>> = {
  zh: "本页为英文版《最终用户许可协议(EULA)》的中文翻译,便于阅读。如中英文之间存在任何歧义,以英文版为准。",
  ja: "本ページは英語版《エンドユーザーライセンス契約(EULA)》の日本語訳(参考)です。相違がある場合は英語版が優先します。",
  ko: "본 페이지는 영문 《최종 사용자 라이선스 계약(EULA)》의 한국어 번역본(참고용)입니다. 차이가 있는 경우 영문판이 우선합니다.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata("/terms", locale as Locale);
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const byLocale: Partial<Record<Locale, LegalDoc>> = { zh: ZH, ja: JA, ko: KO };
  const doc = byLocale[locale as Locale] ?? EN;
  return <LegalDocView doc={doc} note={NOTE[locale as Locale]} />;
}
