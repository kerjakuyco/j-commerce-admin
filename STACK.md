# j-commerce-admin — Tech Stack

Dokumen ini adalah **sumber kebenaran** untuk semua teknologi, package, dan versi yang dipakai di project `j-commerce-admin`.

---

## 1. Runtime

| Item | Versi / Catatan |
|---|---|
| Node.js | 20 LTS (minimum 18.x) |
| npm | 10.x |
| TypeScript | `~6.0.2` |
| Vite | `^8.0.12` |

---

## 2. Core UI

| Package | Versi | Fungsi |
|---|---|---|
| `react` | `^19.2.6` | UI library |
| `react-dom` | `^19.2.6` | React DOM renderer |
| `react-router-dom` | `^7.17.0` | Routing |

---

## 3. State Management

| Package | Versi | Fungsi |
|---|---|---|
| `@tanstack/react-query` | `^5.101.0` | Server-state fetching, caching, mutation |
| `react-hook-form` | `^7.79.0` | Form state |
| `@hookform/resolvers` | `^5.4.0` | Zod resolver untuk React Hook Form |
| `zod` | `^4.4.3` | Schema validation |

---

## 4. Data & Visualization

| Package | Versi | Fungsi |
|---|---|---|
| `recharts` | `^3.8.1` | Dashboard charts |
| `date-fns` | `^4.4.0` | Date formatting |

---

## 5. UX & Utilities

| Package | Versi | Fungsi |
|---|---|---|
| `sonner` | `^2.0.7` | Toast notifications |
| `lucide-react` | `^1.18.0` | Iconography |
| `clsx` | `^2.1.1` | Conditional class names |

---

## 6. API Integration

| Source | URL |
|---|---|
| Default API base | `http://localhost:3000/api/v1` |
| Admin login | `POST /auth/login` |

API base URL di-resolve di `src/lib/api.ts`:

```ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
```

---

## 7. Dev / Lint

| Package | Versi | Fungsi |
|---|---|---|
| `vite` | `^8.0.12` | Dev server & bundler |
| `@vitejs/plugin-react` | `^6.0.1` | React Fast Refresh |
| `eslint` | `^10.3.0` | Linting |
| `@eslint/js` | `^10.0.1` | ESLint core config |
| `typescript-eslint` | `^8.59.2` | TypeScript ESLint rules |
| `eslint-plugin-react-hooks` | `^7.1.1` | React Hooks lint rules |
| `eslint-plugin-react-refresh` | `^0.5.2` | React Refresh lint rules |
| `globals` | `^17.6.0` | Global identifiers for ESLint |
| `vitest` | `^4.1.9` | Unit test runner |
| `@types/react` | `^19.2.14` | React type definitions |
| `@types/react-dom` | `^19.2.3` | React DOM type definitions |
| `@types/node` | `^24.12.3` | Node.js type definitions |

---

## 8. Scripts

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "test": "vitest run",
  "preview": "vite preview"
}
```

---

## 9. Prinsip Update

1. **Tambah dependency baru?** → Update file ini dulu, baru `package.json`.
2. **Naik versi major React/Vite?** → Cek migration guide dan update `ARCHITECTURE.md` jika ada perubahan pattern.
3. **Lock versions:** Commit `package-lock.json` untuk reproducibility.

---

## 10. Related Repositories

- `j-commerce` — Flutter mobile app
- `j-commerce-api` — NestJS + Prisma backend
- `j-commerce-admin` — Vite + React admin console (repo ini)
