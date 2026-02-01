penny/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/
│   │   │   │   └── route.ts
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   ├── logout/
│   │   │   │   └── route.ts
│   │   │   └── me/
│   │   │       └── route.ts
│   │   │
│   │   ├── gemini/
│   │   │   └── statement/
│   │   │       └── route.ts
│   │   │
│   │   └── statements/
│   │       └── month/
│   │           └── [monthIndex]/
│   │               └── route.ts
│   │
│   ├── login/
│   │   └── page.tsx
│   │
│   ├── signup/
│   │   └── page.tsx
│   │
│   ├── play/
│   │   └── page.tsx
│   │
│   ├── statement/
│   │   └── page.tsx
│   │
│   ├── help/
│   │   └── page.tsx
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── TopNav.tsx
│   ├── AuthGuard.tsx
│   ├── BankCard.tsx
│   ├── TaskCard.tsx
│   ├── UiModeBadge.tsx
│   └── LoadingScreen.tsx
│
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── store.ts
│   ├── narration.ts
│   ├── utils.ts
│   └── types.ts
│
├── models/
│   ├── User.ts
│   └── Statement.ts
│
├── public/
│   ├── assets/
│   │   ├── brand/
│   │   │   └── penny_logo.png
│   │   ├── coin/
│   │   │   ├── coin_idle.png
│   │   │   ├── coin_happy.png
│   │   │   └── coin_sad.png
│   │   ├── map/
│   │   │   └── world_bg.png
│   │   └── ui/
│   │       ├── button.png
│   │       └── card_bg.png
│   │
│   └── favicon.ico
│
├── middleware.ts
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
└── README.md
