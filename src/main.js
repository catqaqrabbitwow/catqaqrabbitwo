import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/500-italic.css';
import '@fontsource/bodoni-moda/600.css';
import '@fontsource/bodoni-moda/600-italic.css';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/ibm-plex-mono/300.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/noto-serif-tc/400.css';
import '@fontsource/noto-serif-tc/600.css';
import '@fontsource/noto-serif-tc/700.css';

import './styles/base.css';
import './styles/panels.css';
import './styles/transitions.css';
import './styles/lobby.css';
import './styles/game.css';
import './styles/archive.css';
import './styles/campus.css';

import gsap from 'gsap';
import { GameManager } from './core/GameManager.js';

const QA = new URLSearchParams(window.location.search).has('qa');
if (QA) gsap.ticker.lagSmoothing(0);

const game = new GameManager(document.getElementById('app'));
window.__game = game;
if (QA) game.maxDt = 0.25;
game.start();
