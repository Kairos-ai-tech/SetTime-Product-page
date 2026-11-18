// Source of truth for the /pricing/ (繁中) and /en/pricing/ (English) pages.
// Copy is from the approved draft (kairos-seo/page-drafts/2026-11-17-settime-pricing-page.md);
// do not reword it here. After editing, run: node scripts/build-pricing.mjs
// (CI runs it with --check). Never hand-edit pricing/index.html or en/pricing/index.html.

// ---------------------------------------------------------------------------
// PLACEHOLDERS: swap these when People/Legal finish the policies.
// They are the only unfinished items on the page (legal links, FAQ privacy line). Every link and line below is
// rendered from here, so changing a value updates both languages.
// ---------------------------------------------------------------------------
export const PLACEHOLDERS = {
  // Footer legal links (and the Privacy Policy link in the FAQ privacy answer).
  legal: {
    terms: "#TODO-terms",
    refund: "#TODO-refund",
    privacy: "#TODO-privacy",
  },
  // FAQ "Is my drawing data safe?": revised 11/17 against People/Legal's privacy policy draft
  // (not yet published or reviewed by Sean). Re-check once the policy is final.
  // {privacy} is replaced by a link to legal.privacy.
  faqPrivacy: {
    en: "We process your drawings on your behalf to produce your takeoff, and card details are handled by Paddle, not by us. See our {privacy} for how we use, keep and delete your data.",
    zh: "我們受你委託處理圖面，用來產出你的算料結果；信用卡資料由 Paddle 處理，我們不經手。資料如何使用、保存與刪除，請見{privacy}。",
  },
};

// ---------------------------------------------------------------------------
// PRICES (provisional, approved 11/17). Taiwan prices exclude the 5% 營業稅.
// "yearly" is the per-month price on an annual (12-month) commitment, billed monthly.
// ---------------------------------------------------------------------------
export const PRICES = {
  solo:     { usd: { yearly: "US$249",   monthly: "US$299",   overage: "US$1.00" }, ntd: { yearly: "NT$5,500",  monthly: "NT$6,500",  overage: "NT$20" } },
  team:     { usd: { yearly: "US$699",   monthly: "US$849",   overage: "US$0.80" }, ntd: { yearly: "NT$15,000", monthly: "NT$18,000", overage: "NT$15" } },
  business: { usd: { yearly: "US$1,790", monthly: "US$2,190", overage: "US$0.60" }, ntd: { yearly: "NT$39,000", monthly: "NT$47,000", overage: "NT$12" } },
  extraSeat: { usd: "US$249", ntd: "NT$5,500" }, // per seat per month, Team and Business only
  // The one-month pilot is free, so it has no price here.
};

// Support address used in the "How do I cancel?" FAQ ({supportEmail}, rendered as a mailto: link).
export const SUPPORT_EMAIL = "support@kairosaitech.com";

// Where the CTAs go: the existing pilot form and contact form on the product page.
// No checkout yet (billing will run on Paddle later).
export const LINKS = {
  en: { home: "/en/", pilot: "/en/#pilot", contact: "/en/#contact" },
  zh: { home: "/", pilot: "/#pilot", contact: "/#contact" },
};

// ---------------------------------------------------------------------------
// COPY. Strings with {monthly}, {yearly}, {overage}, {seat}
// get the figure for the selected currency / billing. "ntdSuffix" is appended
// only in the NT$ view (未稅 note, as in the copy doc).
// ---------------------------------------------------------------------------
export const COPY = {
  en: {
    htmlLang: "en",
    path: "/en/pricing/",
    defaultCurrency: "usd",
    meta: {
      title: "SetTime Pricing | AI Rebar Takeoff Plans",
      description: "SetTime plans from US$249/month on an annual commitment, billed monthly. Seats plus a shared monthly rebar tonnage. No AutoCAD license needed. Try it free for one month on your own drawings.",
    },
    nav: { product: "SetTime", otherLang: { label: "繁體中文", href: "/pricing/", lang: "zh-Hant" } },
    aria: { language: "Language", plans: "Plans", legal: "Legal" }, // screen-reader labels, not visible copy
    hero: {
      heading: "Pricing that scales with your rebar, not your headcount.",
      lead: "Every plan includes a monthly tonnage allowance shared across your team. No AutoCAD license needed.",
      taxNote: null,
    },
    toggles: {
      billing: { label: "Billing", yearly: "Annual commitment", monthly: "Monthly" }, // "yearly" = annual commitment, billed monthly
      // USD only: the English page has no currency toggle and shows no NT$ prices.
      currency: { label: "Currency", order: ["usd"], usd: "Global (USD)" },
    },
    price: {
      yearly: "<strong>{yearly}</strong> per month, billed monthly on an annual commitment ({monthly} month to month)",
      // Monthly view: composed from the doc's annual line (the doc only gives the annual-state wording).
      monthly: "<strong>{monthly}</strong> per month, month to month ({yearly} per month on an annual commitment)",
    },
    popular: "Most popular",
    plans: [
      { id: "solo", name: "Solo", tagline: "For an independent estimator or a small fabricator.",
        features: ["1 seat", "200 t of rebar per month", "Overage: {overage} per ton"],
        cta: { label: "Start with Solo", to: "contact" } },
      { id: "team", name: "Team", popular: true, tagline: "For estimating teams that bid every week.",
        features: ["Up to 3 seats", "1,000 t of rebar per month, shared", "Overage: {overage} per ton", "Extra seats: {seat} per seat per month"],
        cta: { label: "Start with Team", to: "contact" } },
      { id: "business", name: "Business", tagline: "For contractors and fabricators running many projects at once.",
        features: ["Up to 8 seats", "3,000 t of rebar per month, shared", "Overage: {overage} per ton", "Extra seats: {seat} per seat per month"],
        cta: { label: "Start with Business", to: "contact" } },
      { id: "enterprise", name: "Enterprise / API", tagline: "For larger teams, custom workflows, or system integration.",
        features: ["Custom seats and tonnage", "API integration built to fit your systems"],
        cta: { label: "Contact us", to: "contact" } },
    ],
    ntdSuffix: "",
    includes: {
      heading: "Every plan includes",
      items: [
        "Rebar quantities and bar-bending schedules generated from your structural drawings",
        "Vector PDF drawing input",
        "Runs on its own, no AutoCAD license needed",
        "Your estimator reviews and makes the final call. SetTime does the counting.",
      ],
    },
    pilot: {
      label: "Free pilot",
      heading: "Try it on your own drawings first.",
      body: [
        "Try any plan free for 1 month, full usage, no tonnage cap. One free trial per company. A card is required to start the trial, and you won't be charged during it. It auto-renews into your plan unless you cancel before the trial ends, and we'll email you a reminder at least 7 days before it ends.",
        "Pick a plan and run SetTime on your real projects for one month at no charge.",
        "When the free month ends, your pilot automatically renews into the plan and billing cycle you chose, and billing starts. To stop, cancel any time before your pilot ends and you won't be charged.",
      ],
      cta: "Start your free pilot",
    },
    why: {
      heading: "Why teams switch",
      items: [
        ["About 95% accuracy", ", measured in pilot testing on real structural drawings."],
        ["About 70x faster drawing analysis.", " Manual takeoff typically takes around 2 weeks of work hours. SetTime analyzes the drawings in about 1 hour. Including a final manual check, the full process is about 20x faster."],
      ],
    },
    faq: {
      heading: "FAQ",
      privacyLinkText: "Privacy Policy",
      items: [
        ["What counts as a ton?", "The tons of rebar in your final accepted takeoff, added up across all seats on your account each month. Re-running a revised drawing of the same project within 30 days doesn't count against your tons."],
        ["What happens if I go over my monthly tons?", "You keep working. Extra tons are billed at your plan's overage rate."],
        ["Do I need AutoCAD?", "No. SetTime works on its own. No AutoCAD license needed."],
        ["What drawing formats do you support?", "Vector PDF is supported today. Tell us what you work with, and we'll let you know what fits."],
        ["Can SetTime connect to our own systems?", "API integration isn't a self-serve feature yet, but we can build a custom integration for your workflow. Contact us to talk it through."],
        ["What happens when my free pilot ends?", "Your pilot renews automatically into the plan and billing cycle you chose, and billing starts. If you don't want to continue, cancel before the pilot ends and you won't be charged."],
        ["How do I cancel?", "Cancel any time before your free month ends from Settings > Billing in your SetTime account, or email us at {supportEmail}. You won't be charged, and your access ends as soon as you cancel. Once you're on a paid plan, cancelling stops your next renewal. Annual plans run for the full 12 months, and we'll email you a reminder 30 days before an annual plan renews."],
        ["Can I get a refund?", "Refunds are available within 14 days of your first paid charge after the free trial and within 14 days of each annual renewal; other charges are non-refundable except for billing errors or where the law requires. See our {refund}."],
        ["Can I add more seats?", "Yes. On Team and Business, extra seats are {seat} per seat per month."],
        ["Can I switch plans or billing?", "Yes. You can move between plans, and between month to month and an annual commitment."],
        ["How does billing work?", "Payments are processed securely by Paddle, our reseller. Annual plans are a 12-month commitment billed monthly, not paid upfront. Prices exclude applicable taxes, which are calculated at checkout."],
        ["Is my drawing data safe?", "{faqPrivacy}"],
      ],
    },
    closing: {
      heading: "Bring your toughest drawing.",
      body: "Start a free one-month pilot and see the quantities on your own project.",
      pilot: "Start your free pilot",
      contact: "Contact us",
    },
    legal: { terms: "Terms of Service", refund: "Refund Policy", privacy: "Privacy Policy" },
    rights: "© 2026 SetTime. All rights reserved.",
  },

  zh: {
    htmlLang: "zh-Hant",
    path: "/pricing/",
    defaultCurrency: "ntd",
    meta: {
      title: "SetTime 方案與價格｜AI 鋼筋算料",
      description: "SetTime 年約每月 NT$5,500 起（按月扣款），依席位加每月共用鋼筋噸數計價，無需 AutoCAD 授權。可先免費試用一個月，用你自己的圖驗證。",
    },
    nav: { product: "SetTime", otherLang: { label: "English", href: "/en/pricing/", lang: "en" } },
    aria: { language: "語言", plans: "方案", legal: "法律條款" },
    hero: {
      heading: "依鋼筋量計價，不是依人頭。",
      lead: "每個方案都含每月鋼筋噸數，團隊共用。無需 AutoCAD 授權。",
      taxNote: "價格皆為未稅，5% 營業稅另計。", // shown in the NT$ view only
    },
    toggles: {
      billing: { label: "繳費方式", yearly: "年約", monthly: "月繳" },
      currency: { label: "幣別", order: ["ntd", "usd"], usd: "全球 (USD)", ntd: "台灣 (NT$)" },
    },
    price: {
      yearly: "年約每月 <strong>{yearly}</strong>，按月扣款（不綁約月繳 {monthly}）",
      // 月繳狀態：依文件的年約句型組成（文件只提供年約狀態的寫法）。
      monthly: "不綁約月繳 <strong>{monthly}</strong>（年約每月 {yearly}，按月扣款）",
    },
    popular: "最多人選",
    plans: [
      { id: "solo", name: "個人 Solo", tagline: "適合獨立估算人員或小型加工廠。",
        features: ["1 個席位", "每月含 200 公噸鋼筋", "超量：每公噸 {overage}"],
        cta: { label: "選擇個人方案", to: "contact" } },
      { id: "team", name: "團隊 Team", popular: true, tagline: "適合每週都在投標估價的團隊。",
        features: ["最多 3 個席位", "每月含 1,000 公噸鋼筋，團隊共用", "超量：每公噸 {overage}", "加購席位：每席每月 {seat}{ntdSuffix}"],
        cta: { label: "選擇團隊方案", to: "contact" } },
      { id: "business", name: "企業 Business", tagline: "適合同時跑多個案子的營造廠與加工廠。",
        features: ["最多 8 個席位", "每月含 3,000 公噸鋼筋，團隊共用", "超量：每公噸 {overage}", "加購席位：每席每月 {seat}{ntdSuffix}"],
        cta: { label: "選擇企業方案", to: "contact" } },
      { id: "enterprise", name: "客製 / API", tagline: "適合大型團隊、客製流程或系統串接。",
        features: ["席位與噸數依需求規劃", "依你的系統客製 API 串接"],
        cta: { label: "聯絡我們", to: "contact" } },
    ],
    ntdSuffix: "（未稅）",
    includes: {
      heading: "所有方案都包含",
      items: [
        "從結構圖產出鋼筋數量與加工料單",
        "支援向量 PDF 圖面",
        "獨立運作，無需 AutoCAD 授權",
        "最後由你的估算人員檢查把關，算的部分交給 SetTime",
      ],
    },
    pilot: {
      label: "免費試用",
      heading: "先用你自己的圖試試看。",
      body: [
        "任選方案免費試用 1 個月，功能全開，不限噸數。每家公司限試用一次。開始試用需綁定信用卡，試用期間不會扣款。試用結束後自動續訂為你的方案，除非你在試用結束前取消；試用結束前至少 7 天，我們會寄信提醒你。",
        "選好方案，用你真實的案子免費跑一個月。",
        "免費期結束後，會自動續訂為你選擇的方案與繳費週期，並開始計費。如不續用，請在試用結束前隨時取消，就不會收取任何費用。",
      ],
      cta: "開始免費試用",
    },
    why: {
      heading: "為什麼換成 SetTime",
      items: [
        ["準確率約 95%", "，來自實際結構圖的試用測試。"],
        ["圖面分析快約 70 倍。", " 人工算料平均約需 2 週工時，SetTime 分析圖面約 1 小時。加上最後的人工檢查，整體流程約快 20 倍。"],
      ],
    },
    faq: {
      heading: "常見問題",
      privacyLinkText: "隱私權政策",
      items: [
        ["噸數怎麼算？", "以最終確認的算料結果中的鋼筋公噸數計算，帳號內所有席位每月合併計算。同一案子的修改圖 30 天內重新計算，不重複計噸。"],
        ["超過每月噸數會怎樣？", "可以照常使用，超出的噸數依方案的超量單價計費。"],
        ["需要 AutoCAD 嗎？", "不需要。SetTime 獨立運作，無需 AutoCAD 授權。"],
        ["支援哪些圖檔格式？", "目前支援向量 PDF。告訴我們你平常用的格式，我們會說明怎麼配合。"],
        ["可以串接我們自己的系統嗎？", "API 串接目前還不是自助功能，但可以依你的流程客製。歡迎聯絡我們討論。"],
        ["免費試用結束後會怎樣？", "會自動續訂為你選擇的方案與繳費週期，並開始計費。如不續用，請在試用結束前取消，就不會收取任何費用。"],
        ["要怎麼取消？", "免費期結束前，隨時可以在 SetTime 帳號的「設定 > 帳務」取消，或寄信到 {supportEmail}。不會收取任何費用，取消後即停止使用。轉為付費方案後取消，則會停止下一期續訂。年約方案以 12 個月為一期，續約前 30 天我們會寄信提醒你。"],
        ["可以退款嗎？", "免費試用結束後之首次扣款起 14 日內，及每次年約續訂扣款起 14 日內，均可申請退款；其他扣款除帳務錯誤或法律另有規定外，恕不退款。詳見{refund}。"],
        ["可以加購席位嗎？", "可以。團隊與企業方案可加購席位，每席每月 {seat}{ntdSuffix}。"],
        ["可以換方案或改繳費方式嗎？", "可以，方案之間、月繳與年約之間都能調整。"],
        ["怎麼付款？", "付款由我們的經銷商 Paddle 安全處理。年約為 12 個月合約，按月扣款，不需一次付清。台灣價格皆為未稅價，5% 營業稅另計。"],
        ["圖面資料安全嗎？", "{faqPrivacy}"],
      ],
    },
    closing: {
      heading: "帶你最難算的那張圖來。",
      body: "免費試用一個月，在你自己的案子上看結果。",
      pilot: "開始免費試用",
      contact: "聯絡我們",
    },
    legal: { terms: "服務條款", refund: "退款政策", privacy: "隱私權政策" },
    rights: "© 2026 SetTime. All rights reserved.",
  },
};
