/**
 * scaffold-domains.js
 * Tạo toàn bộ cấu trúc DDD + MVVM cho 36 domains
 * Run: node scripts/scaffold-domains.js
 */

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../src');

// ─── 36 Domains (mirror từ client/src) ────────────────────────────────────────
const DOMAINS = [
  // Core Auth & User
  { name: 'auth',        phase: 1 },
  { name: 'profile',     phase: 1 },
  { name: 'settings',    phase: 1 },

  // Social Core
  { name: 'feed',        phase: 1 },
  { name: 'messages',    phase: 1 },
  { name: 'notifications', phase: 1 },
  { name: 'community',   phase: 1 },
  { name: 'pages',       phase: 1 },
  { name: 'search',      phase: 1 },
  { name: 'stories',     phase: 1 },

  // Content
  { name: 'explore',     phase: 2 },
  { name: 'photos',      phase: 2 },
  { name: 'reels',       phase: 2 },
  { name: 'blogs',       phase: 2 },
  { name: 'events',      phase: 2 },
  { name: 'live',        phase: 2 },
  { name: 'movies',      phase: 2 },
  { name: 'games',       phase: 2 },
  { name: 'popular',     phase: 2 },
  { name: 'memories',    phase: 2 },
  { name: 'saved',       phase: 2 },
  { name: 'poke',        phase: 2 },

  // Commerce
  { name: 'product',     phase: 3 },
  { name: 'orders',      phase: 3 },
  { name: 'checkout',    phase: 3 },
  { name: 'market',      phase: 3 },
  { name: 'funding',     phase: 3 },
  { name: 'wallet',      phase: 3 },
  { name: 'withdrawal',  phase: 3 },
  { name: 'go-pro',      phase: 3 },

  // Misc
  { name: 'jobs',        phase: 3 },
  { name: 'forum',       phase: 3 },
  { name: 'directory',   phase: 3 },

  // Infrastructure domains
  { name: 'shared-kernel', phase: 0 },
  { name: 'foundation',    phase: 0 },
  { name: 'navigation',    phase: 0 },
];

// ─── Boilerplate templates ─────────────────────────────────────────────────────

function domainTypesTemplate(domain) {
  const D = toPascal(domain);
  return `// ${D} domain types
// Port từ: client/src/${domain}/domain/types/

export interface ${D}Item {
  id: string | number;
  // TODO: thêm fields từ API response
}
`;
}

function repositoryInterfaceTemplate(domain) {
  const D = toPascal(domain);
  return `// ${D} Repository Interface
// Port từ: client/src/${domain}/domain/repositories/

import type { ${D}Item } from '../types/${domain}.types';

export interface ${D}Repository {
  // TODO: định nghĩa các methods từ API docs
  // getAll(): Promise<${D}Item[]>;
  // getById(id: string | number): Promise<${D}Item | null>;
}
`;
}

function apiRepositoryTemplate(domain) {
  const D = toPascal(domain);
  return `// ${D} API Repository (Infrastructure)
// Port từ: client/src/${domain}/infrastructure/repositories/

import type { ${D}Repository } from '../../domain/repositories/${D}Repository';
import apiClient from '../../../shared-kernel/infrastructure/api/client';

export function create${D}Repository(): ${D}Repository {
  return {
    // TODO: implement methods
  };
}
`;
}

function viewModelTemplate(domain, vmName) {
  const D = toPascal(domain);
  return `// ${D} - ${vmName} ViewModel
// Port từ: client/src/${domain}/application/view-models/

import { useState, useCallback } from 'react';
import { create${D}Repository } from '../../infrastructure/repositories/Api${D}Repository';

const repository = create${D}Repository();

export function ${vmName}() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
`;
}

function sharedKernelApiClientTemplate() {
  return `// Shared Kernel — Axios API Client
// Đây là single source of truth cho mọi HTTP call

import axios from 'axios';

export const BASE_URL = 'https://v2.vnseea.com';
const SERVER_KEY = process.env.VNSEEA_SERVER_KEY ?? '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-inject access_token (GET) + server_key (POST)
apiClient.interceptors.request.use(config => {
  // TODO: lấy token từ MMKV
  // const token = mmkvStorage.getString('access_token');
  // if (token) config.params = { ...config.params, access_token: token };
  if (config.data) {
    config.data = { ...config.data, server_key: SERVER_KEY };
  }
  return config;
});

// Handle WoWonder api_status error pattern
apiClient.interceptors.response.use(response => {
  const { data } = response;
  if (String(data?.api_status) === '400') {
    const msg = data?.errors?.error_text ?? 'Unknown API error';
    throw new Error(msg);
  }
  return response;
});

export default apiClient;
`;
}

function routeRegistryTemplate() {
  return `// Shared Kernel — Route Registry
// Mirror từ: client/src/shared-kernel/application/constants/route-registry.ts

export const apiRoutes = {
  auth: {
    login:           '/api/auth',
    register:        '/api/create-account',
    socialLogin:     '/api/social-login',
    logout:          '/api/delete-access-token',
    forgotPassword:  '/api/send-reset-password-email',
    resetPassword:   '/api/reset_password',
    confirmAccount:  '/api/active_account_sms',
    me:              '/api/get-current-user',
  },
  user: {
    get:             '/api/get-user-data',
    update:          '/api/update-user-data',
    suggestions:     '/api/get-user-suggestions',
    nearby:          '/api/get-nearby-users',
  },
  feed: {
    posts:           '/api/posts',
    newPost:         '/api/new_post',
    postActions:     '/api/post-actions',
    getPost:         '/api/get-post-data',
    generalData:     '/api/get-general-data',
  },
  social: {
    follow:          '/api/follow-user',
    followRequest:   '/api/follow-request-action',
    block:           '/api/block-user',
    friends:         '/api/get-friends',
  },
  stories: {
    get:             '/api/get-stories',
    create:          '/api/create-story',
    delete:          '/api/delete-story',
    react:           '/api/react_story',
  },
  messages: {
    chats:           '/api/get_chats',
    send:            '/api/send-message',
    messages:        '/api/get_user_messages',
    typing:          '/api/set-chat-typing-status',
    delete:          '/api/delete-conversation',
  },
  // TODO: thêm các domains còn lại
};

export const appRoutes = {
  login:          'Login',
  register:       'Register',
  forgotPassword: 'ForgotPassword',
  feed:           'Feed',
  profile:        'Profile',
  settings:       'Settings',
  messages:       'Messages',
  chat:           'Chat',
};
`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPascal(str) {
  return str
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function mkdir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function writeFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    console.log(`  ⏭  skip (exists): ${path.relative(SRC, filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ created: ${path.relative(SRC, filePath)}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function scaffoldSharedKernel() {
  const root = path.join(SRC, 'shared-kernel');
  const dirs = [
    'domain/types',
    'application/constants',
    'infrastructure/api',
    'presentation/components',
    'presentation/hooks',
  ];
  dirs.forEach(d => mkdir(path.join(root, d)));

  writeFile(
    path.join(root, 'infrastructure/api/client.ts'),
    sharedKernelApiClientTemplate(),
  );
  writeFile(
    path.join(root, 'application/constants/route-registry.ts'),
    routeRegistryTemplate(),
  );
  writeFile(
    path.join(root, 'domain/types/api.types.ts'),
    `// Shared API response types\n\nexport interface ApiSuccessResponse<T = unknown> {\n  api_status: 200;\n  data?: T;\n}\n\nexport interface ApiErrorResponse {\n  api_status: '400' | 400;\n  errors: { error_id: string; error_text: string };\n}\n`,
  );
}

function scaffoldDomain(domain) {
  const D = toPascal(domain);
  const root = path.join(SRC, domain);

  // Folder structure
  const dirs = [
    'domain/types',
    'domain/repositories',
    'application/use-cases',
    'application/view-models',
    'infrastructure/repositories',
    'presentation/screens',
    'presentation/components',
  ];
  dirs.forEach(d => mkdir(path.join(root, d)));

  // domain/types
  writeFile(
    path.join(root, `domain/types/${domain}.types.ts`),
    domainTypesTemplate(domain),
  );

  // domain/repositories (interface)
  writeFile(
    path.join(root, `domain/repositories/${D}Repository.ts`),
    repositoryInterfaceTemplate(domain),
  );

  // infrastructure/repositories (implementation)
  writeFile(
    path.join(root, `infrastructure/repositories/Api${D}Repository.ts`),
    apiRepositoryTemplate(domain),
  );

  // application/view-models (1 default VM)
  const defaultVM = `use${D}ViewModel`;
  writeFile(
    path.join(root, `application/view-models/${defaultVM}.ts`),
    viewModelTemplate(domain, defaultVM),
  );

  // index.ts barrel
  writeFile(
    path.join(root, 'index.ts'),
    `// ${D} domain barrel exports\nexport * from './domain/types/${domain}.types';\nexport * from './domain/repositories/${D}Repository';\nexport { create${D}Repository } from './infrastructure/repositories/Api${D}Repository';\nexport { ${defaultVM} } from './application/view-models/${defaultVM}';\n`,
  );

  // README
  writeFile(
    path.join(root, 'README.md'),
    `# ${D} Domain\n\nPort từ: \`client/src/${domain}/\`\n\n## Structure\n- \`domain/\` — Types & Repository interfaces\n- \`application/\` — Use Cases & ViewModels\n- \`infrastructure/\` — API implementations\n- \`presentation/\` — Screens & Components\n`,
  );
}

function scaffoldFoundationAndNav(domain) {
  const root = path.join(SRC, domain);
  mkdir(path.join(root, 'presentation'));
  writeFile(
    path.join(root, 'README.md'),
    `# ${toPascal(domain)}\n\nShared ${domain} utilities.\n`,
  );
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log('\n🚀 Scaffolding VnseeaRn domain structure...\n');
console.log(`📁 Target: ${SRC}\n`);

// Shared kernel first
console.log('📦 shared-kernel');
scaffoldSharedKernel();

// Foundation & Navigation (no DDD layers needed)
['foundation', 'navigation'].forEach(d => {
  console.log(`📦 ${d}`);
  scaffoldFoundationAndNav(d);
});

// All business domains
DOMAINS
  .filter(d => !['shared-kernel', 'foundation', 'navigation'].includes(d.name))
  .forEach(({ name, phase }) => {
    const label = phase === 1 ? '🟢' : phase === 2 ? '🟡' : '🔵';
    console.log(`${label} [Phase ${phase}] ${name}`);
    scaffoldDomain(name);
  });

console.log('\n✨ Done! All domains scaffolded.\n');
console.log('Legend: 🟢 Phase 1 (MVP) | 🟡 Phase 2 | 🔵 Phase 3\n');
