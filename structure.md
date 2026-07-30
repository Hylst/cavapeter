# Structure de Ça Va Péter

## Arborescence

```
ca-va-peter-game-development/
├── index.html              # template Vite + bloc SEO (lang=fr)
├── package.json            # ca-va-peter v1.0.0
├── vite.config.ts          # base '/cavapeter/', react + tailwind + singlefile
├── tsconfig.json
├── .gitignore                # deps, secrets, fichiers d'agents IA
├── about.md / README.md / structure.md / features.md / todo.md / changelog.md
├── og-image.png / favicon.png
├── public/
│   ├── favicon.png
│   ├── og-image.png / og-image.webp
│   └── icon.webp             # carte du menu, 128x128
└── src/
    ├── main.tsx
    ├── App.tsx                # HUD React, entrees clavier/souris/tactile, boucle RAF
    ├── index.css
    ├── utils/cn.ts             # non utilise
    └── game/
        ├── types.ts            # Ball, Paddle, Brick, PowerUp, GameState, GameConfig...
        ├── constants.ts         # CFG (dimensions/vitesses), les 24 LEVELS, couleurs, PU_CFG
        ├── engine.ts            # tick() et toute la logique de jeu, fonctions pures
        ├── renderer.ts           # dessin canvas (fond, briques, balle, HUD canvas, overlays)
        ├── animations.ts         # helpers couleur (lighten/darken/hslToHex) et rRect, sans
        │                         # aucune dependance a l'etat du jeu
        └── audio.ts              # SFX synthetises (Howler.js) + musique generative (classe)
```

## La qualite de code ici, en resume

C'est le jeu le mieux architecture du lot traite jusqu'ici (Hetris, Mine de Rien, Sapeur,
puis celui-ci) :

- **Separation stricte logique / rendu.** `engine.ts` ne touche jamais au canvas ; `renderer.ts`
  ne mute jamais l'etat du jeu. `animations.ts` est un module d'utilitaires visuels pur, sans
  aucune connaissance du jeu (juste des conversions de couleur et un helper de rectangle
  arrondi) — reutilisable pour n'importe quel canvas.
- **Pas de fermeture React perimee.** Le seul minuteur recurrent cote React est la boucle
  `requestAnimationFrame` elle-meme (`App.tsx`), qui relit `gsRef.current` (une ref, toujours a
  jour) a chaque frame plutot que de capturer une valeur d'etat. La musique (`AmbientMusic`,
  classe, pas un hook) fait de meme via `this.running`/`this.tempo`.
- **Etat immuable propre.** `tick()` prend un `GameState` et retourne un NOUVEL etat a chaque
  frame (spread + copies cibleees), sans jamais muter `s` directement (seulement `ns`, la copie
  de travail). Les bonus ramasses, les briques detruites, le score : tout passe par ce meme
  chemin unique, donc aucun des pieges de "ramassage oublie selon le chemin de revelation" vus
  dans Mine de Rien ou Sapeur ne s'applique ici.

## Points d'attention pour un audit futur

- **`moveBall`** resout la collision balle/brique en ne regardant que l'axe X pour decider
  d'un rebond lateral vs vertical (voir todo.md) — limitation connue et acceptee des
  casse-briques simples, pas un bug a corriger dans l'urgence.
- **Le combo se propage entre niveaux** (`launchLevel` ne le remet pas a zero, seule la perte
  d'une balle le fait) — comportement probablement intentionnel, a confirmer si besoin.
- **`setMusicEnabled()`** dans `audio.ts` ne fait rien : la vraie logique de demarrage/arret de
  la musique vit dans `App.tsx` via `ambientMusic.start()/.stop()` directement.

## Build

`vite-plugin-singlefile` inline le JS et le CSS dans `index.html` (~301 Ko, y compris Howler.js
et toute la synthese audio). `base: '/cavapeter/'` fait resoudre les assets sous
`https://games.hylst.fr/cavapeter/`.
