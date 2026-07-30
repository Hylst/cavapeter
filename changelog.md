# Changelog de Ça Va Péter

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage
[SemVer](https://semver.org/lang/fr/).

## [1.0.0] 2026-07-31

Première version intégrable à Hylst.Games, partie d'un export brut audité.

### Ajouté
- Bloc SEO complet dans `index.html` (description, keywords, og, twitter, robots, canonical,
  theme-color) et `lang="fr"`
- `favicon.png` 32×32, `og-image.png` 1024×576 (vraie capture de gameplay) et sa variante
  `og-image.webp`, `icon.webp` 128×128 pour la carte du menu
- `base: '/cavapeter/'` dans `vite.config.ts`
- La doc : `about.md`, `README.md`, `structure.md`, `features.md`, `todo.md`, `changelog.md`

### Modifié
- Renommé en **Ça Va Péter**. Le nom précédent, « Breakout Arcade », reprenait le nom
  générique du genre. Titre affiché, titre de page, clé `localStorage` (`bk_hs` → `cvp_hs`,
  pour éviter toute collision avec un autre jeu du hub partageant le même domaine).
- `package.json` : `react-vite-tailwind` v0.0.0 devenu `ca-va-peter` v1.0.0
- Tirets longs retirés des textes du jeu (crédits, écrans de fin de niveau)

### Audit
- Lecture complète du moteur, du rendu et de l'audio : aucun bug fonctionnel majeur détecté,
  contrairement aux jeux précédents du même lot. Boucle centrale (collision balle/brique,
  score, perte de vie, combo) vérifiée en navigateur avec une vraie partie jouée : score passé
  de 0 à 75 sur un impact réel, record mis à jour, vie perdue naturellement, HUD cohérent avec
  l'état du jeu à chaque étape.
