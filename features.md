# Fonctionnalités de Ça Va Péter

## Gameplay

- ✅ Casse-briques classique : raquette, balle, briques, rebonds
- ✅ 24 niveaux avec 24 motifs de briques distincts (damier, pyramide, diamant, forteresse,
  croix, sablier, serpent, vagues, tunnel, arche, escalier, hexagone, cœur, flèche, chaos...)
- ✅ Briques multi-coups à partir du niveau 7, briques blindées à partir du niveau 13
- ✅ 11 power-ups : Élargir, Rétrécir, Multi-Balle, Ralenti, Rapide, +1 Vie, Boule Feu, Aimant,
  Bouclier, Laser, Bombe
- ✅ Système de combo qui multiplie les points (jusqu'à ×12)
- ✅ Contrôle souris, clavier (flèches / A-D) et tactile
- ⬜ Détection de collision balle/brique par un seul axe (X) — approximation classique, coups
  de coin parfois imprécis (voir todo.md)

## Score et progression

- ✅ Score par brique, multiplié par le combo
- ✅ Record personnel en `localStorage`
- ✅ 3 vies de départ, jusqu'à 9 avec le power-up +1 Vie
- ⬜ Pas de sauvegarde de partie en cours (redémarrer l'app repart du niveau 1)
- ⬜ Pas de classement par niveau atteint

## Audio

- ✅ Tout est synthétisé en Web Audio (via Howler.js pour les SFX), aucun fichier son externe
- ✅ Musique adaptative : gamme et progression d'accords changent tous les 6 niveaux, tempo
  qui accélère avec le niveau
- ✅ SFX pour chaque action : raquette, mur, brique, brique blindée, power-up, vie, niveau
  terminé, game over, laser, explosion
- ✅ Coupure indépendante musique / effets sonores

## Interface

- ✅ HUD complet : score, niveau, record, vies, progression, combo, laser, bouclier
- ✅ Écrans d'accueil, pause, game over, niveau terminé, victoire
- ✅ Effets visuels : particules (étincelles, fumée, éclats, lueur), ondes de choc, tremblement
  d'écran, traînée de la balle, fond en dégradé animé avec étoiles et nébuleuses
- ✅ Mode plein écran
- ✅ Aucun débordement horizontal, y compris en 390×844

## Technique

- ✅ Build en un seul fichier (~301 Ko), fonctionne hors ligne
- ✅ TypeScript strict
- ✅ Architecture modulaire exemplaire : `engine.ts` (logique pure), `renderer.ts` (dessin),
  `animations.ts` (helpers visuels sans dépendance au jeu), `audio.ts`, `constants.ts`, `types.ts`
- ✅ Bloc SEO complet, favicon, og-image (capture réelle du jeu)
- ⬜ `setMusicEnabled()` est un no-op trompeur (voir todo.md)
- ⬜ Tests unitaires sur la logique de plateau
