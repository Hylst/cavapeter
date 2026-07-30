# TODO de Ça Va Péter

Audit fait le 2026-07-31 sur l'export brut (`build-breakout-game (2).zip`), suivi d'une passe
QA navigateur (Playwright + Chromium) avec observation réelle de la boucle de jeu.

---

## Constat de l'audit

Ce jeu est nettement mieux structuré que les autres jeux du lot traités jusqu'ici :
architecture modulaire propre (`engine.ts` / `renderer.ts` / `animations.ts` / `audio.ts` /
`constants.ts` / `types.ts`, chacun avec une responsabilité claire), pas de fermeture React
périmée dans les timers, gestion de score cohérente à travers les 24 niveaux, physique de
balle/briques/power-ups sans état perdu détecté. **Aucun bug fonctionnel majeur trouvé** après
lecture complète du moteur, du rendu et de l'audio, contrairement aux 3 jeux précédents du
lot (Hetris, Mine de Rien, Sapeur) qui avaient chacun au moins un bug réel de fermeture ou
d'état perdu.

Deux points mineurs relevés (pas des bugs, des remarques de conception) :
- La résolution de collision balle/brique (`moveBall`, calcul de `hitFromSide`) ne regarde que
  la position X précédente pour décider si le rebond est latéral ou vertical, sans vérifier Y.
  C'est l'approximation classique des casse-briques simples : les coups de coin peuvent
  parfois rebondir dans le mauvais axe. Comportement connu et accepté dans ce genre de jeu, pas
  une régression à corriger dans l'urgence.
- Le combo (`s.combo`) n'est pas remis à zéro entre deux niveaux (seulement à la perte d'une
  bille) : terminer un niveau sans perdre de bille conserve le combo au niveau suivant. Semble
  intentionnel (récompense un parcours sans faute), à confirmer si besoin.

## ✅ Corrigé — cohérence et intégration

- [x] Renommé en **Ça Va Péter** — le nom d'origine, « Breakout Arcade », reprenait le nom
  générique du genre sans originalité. Titre affiché (en-tête et écran d'accueil), titre de
  la page, clé `localStorage` (`bk_hs` → `cvp_hs`, pour éviter toute collision avec un autre
  jeu du hub qui partage le même domaine donc le même espace `localStorage`).
- [x] `base: '/cavapeter/'` ajouté dans `vite.config.ts`, il n'y en avait aucun.
- [x] `index.html` : `lang="en"` corrigé en `lang="fr"`, titre générique remplacé, bloc SEO
  complet (description, keywords, og, twitter, robots, canonical, theme-color),
  `<link rel="icon">`.
- [x] `package.json` : `react-vite-tailwind` v0.0.0 devenu `ca-va-peter` v1.0.0.
- [x] Tirets longs (—) retirés du code source (crédits, textes d'écran) : le hub évite ce
  signe de ponctuation partout, y compris dans le code des jeux.

## ✅ La passe QA navigateur

- [x] 0 erreur console, 0 exception non gérée
- [x] Écran d'accueil, démarrage au clic
- [x] **Mécanique centrale observée réellement** : le score est passé de 0 à 75 après un vrai
  impact bille/brique (pas juste "ne plante pas"), le record affiché s'est mis à jour en
  conséquence, une vie a été perdue naturellement quand la bille a dépassé la raquette
  (3 → 2 cœurs), le combo affiché correspondait à l'état réel
- [x] Pause (`P`) et reprise vérifiées, l'overlay « PAUSE » s'affiche et se retire correctement
- [x] Aucun débordement horizontal en 390×844
- [x] Screenshot de gameplay réel capturé pour `og-image.png`/`.webp` et `icon.webp`

---

## ⬜ Idées d'amélioration

### Game design
- [ ] Vérifier si la conservation du combo entre deux niveaux est voulue (voir plus haut)
- [ ] La détection de collision balle/brique par axe unique (X seulement) peut mal résoudre
  certains coups de coin — envisager de comparer aussi la position Y précédente si des retours
  utilisateurs signalent des rebonds qui semblent « faux »

### Fonctionnalités
- [ ] Pas de sauvegarde de partie en cours (seul le meilleur score persiste) — recommencer
  l'app en cours de partie repart du niveau 1
- [ ] Pas de classement par niveau atteint, seulement un score global

### Technique
- [ ] `setMusicEnabled()` dans `audio.ts` est un no-op (le paramètre `_v` n'est jamais utilisé,
  la fonction ne fait rien) — la logique réelle de start/stop de la musique vit entièrement
  dans `App.tsx` via `ambientMusic.start()/.stop()`. Fonctionne, mais la fonction exportée est
  trompeuse : on croirait qu'elle contrôle quelque chose.
- [ ] Les listeners souris/tactile (`useEffect` avec dépendances `[doStart, doNext, doRestart]`)
  sont détruits et recréés à chaque bascule de `musicOn` (puisque ces callbacks dépendent de
  `musicOn` via `useCallback`) — sans impact fonctionnel observé, mais un peu de travail inutile
  à chaque clic sur le bouton musique.
- [ ] Aucun test automatisé sur la logique pure (`buildBricks`, `cellVisible`, `moveBall`,
  `checkWinCondition` implicite via `tick`), qui s'y prêterait bien puisqu'elle ne dépend pas
  de React.
