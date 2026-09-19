# 🚜 FMS PRECISION 3.0 — Wdrożenie (Netlify / Railway / własny hosting)

Aplikacja jest w 100% frontendowa (React + TypeScript + Vite), dane trzyma lokalnie w przeglądarce
(`localStorage`) i działa jako PWA. Do uruchomienia wystarczy zbudować statyczne pliki i je hostować —
**nie potrzebujesz serwera ani bazy danych**.

Pogoda pobierana jest na żywo z **Open-Meteo** (bez klucza API). Mapy: OpenStreetMap (bez klucza).

---

## 1. Uruchomienie lokalne

```bash
cd frontend        # katalog z package.json
yarn install       # lub: npm install
yarn dev           # start serwera deweloperskiego (http://localhost:3000)
```

Budowa produkcyjna:

```bash
yarn build         # tworzy katalog dist/  (tsc -b && vite build)
yarn preview       # podgląd wersji produkcyjnej
```

---

## 2. Netlify (najprościej)

**Opcja A — z repozytorium GitHub (zalecana):**
1. Wypchnij projekt na GitHub.
2. Netlify → *Add new site* → *Import from Git* → wybierz repo.
3. Ustawienia budowania (już w `netlify.toml`):
   - **Base directory:** `frontend`
   - **Build command:** `yarn build`
   - **Publish directory:** `frontend/dist`
4. *Deploy*. Plik `public/_redirects` zapewnia poprawny routing SPA.

**Opcja B — ręczne przeciągnięcie (drag & drop):**
1. Lokalnie: `cd frontend && yarn build`
2. Wejdź na https://app.netlify.com/drop i przeciągnij katalog `frontend/dist`.

---

## 3. Railway

Railway najlepiej hostuje statykę przez prosty serwer:

1. Railway → *New Project* → *Deploy from GitHub repo*.
2. Root directory: `frontend`.
3. Ustaw komendy:
   - **Build:** `yarn install && yarn build`
   - **Start:** `npx serve -s dist -l $PORT`
   (dodaj `serve` do zależności: `yarn add serve`, lub użyj `vite preview --host --port $PORT`)
4. Deploy. Railway sam wykryje `$PORT`.

---

## 4. Inny hosting statyczny (Vercel, Cloudflare Pages, GitHub Pages, nginx)

- **Build command:** `yarn build`
- **Output/publish:** `dist`
- **Przekierowanie SPA:** wszystkie ścieżki → `/index.html` (jest w `_redirects` / `netlify.toml`).
- Dla GitHub Pages / podkatalogu: w `vite.config.ts` `base: './'` jest już ustawione.

---

## 5. PWA / Offline

- `public/manifest.webmanifest` + `public/sw.js` — aplikację można „Dodać do ekranu głównego”.
- Service Worker buforuje powłokę aplikacji; podstawowe moduły (GIS, Dziennik, Field Pilot,
  Magazyn) działają przy chwilowej utracie sieci. Kafelki map i pogoda wymagają internetu.

---

## 6. Uwaga o danych

Dane demonstracyjne (12 pól, maszyny, magazyn, dzierżawy, historia) ładują się automatycznie.
W **Ustawieniach** można je zresetować lub wyczyścić. Dane zapisują się w `localStorage` przeglądarki —
architektura jest przygotowana pod podłączenie backendu (Supabase / Firebase / PostgreSQL) w przyszłości.
