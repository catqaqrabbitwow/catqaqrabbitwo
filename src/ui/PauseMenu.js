import { Panel } from './Panel.js';
import { SettingsPanel } from './SettingsPanel.js';
import { confirmDialog } from './ConfirmDialog.js';

/**
 * In-game pause menu shared by every mini game (platform design system).
 * controls: [[keys, zh, en], ...]
 */
export class PauseMenu extends Panel {
  constructor(game, { gameTitle, gameTitleZh, controls = [], onResume, onRestart }) {
    super(game, { className: 'pause', formNo: 'P-00', title: 'Intermission', titleZh: `暫停 · ${gameTitleZh}`, subtitle: gameTitle, width: 88, paper: 'paper--cream' });
    this.onResumeCb = onResume;
    const items = [
      ['RESUME', '繼續遊戲', 'confirm', () => this.close()],
      ['SETTINGS', '設定', 'click_mech', () => new SettingsPanel(game).open()],
      ['RESTART AREA', '重新開始', 'click_folder', async () => {
        const ok = await confirmDialog(game, { title: 'Restart', titleZh: '重新開始', message: '將回到本次遊戲的起點,目前進度會被重置。<br><span class="t-cond">THE CURRENT RUN WILL BE RESET.</span>' });
        if (ok) {
          this.close();
          onRestart && onRestart();
        }
      }],
      ['RETURN TO LOBBY', '返回大廳', 'click_ticket', async () => {
        const ok = await confirmDialog(game, { title: 'Leave', titleZh: '返回大廳', message: '確定要離開並返回檔案室嗎?<br><span class="t-cond">UNSAVED PROGRESS IN THIS RUN WILL BE LOST.</span>' });
        if (ok) {
          this.close();
          game.goLobby();
        }
      }],
    ];
    const list = document.createElement('div');
    list.className = 'pause__list';
    items.forEach(([en, zh, sfx, fn], i) => {
      const b = game.ui.button({
        className: 'pause__item stagger',
        html: `<span class="pause__num t-mono">0${i + 1}</span><span class="pause__zh">${zh}</span><span class="pause__en t-cond ls">${en}</span><span class="pause__arrow ico-shift">→</span>`,
        sfx: ['hover_paper', sfx],
        magnet: 6,
        onClick: fn,
      });
      list.appendChild(b);
    });
    const ctl = document.createElement('div');
    ctl.className = 'pause__controls stagger';
    ctl.innerHTML = `<div class="pause__controls-h t-cond">CONTROLS · 操作說明</div>` + controls.map(([k, zh, en]) => `<div class="pause__ctl"><span class="pause__keys">${k.map((x) => `<span class="keycap keycap--ink">${x}</span>`).join('')}</span><span class="t-zh">${zh}</span><span class="t-cond">${en}</span></div>`).join('');
    const grid = document.createElement('div');
    grid.className = 'pause__grid';
    grid.append(list, ctl);
    this.content.appendChild(grid);
    this.foot.innerHTML = '<span class="panel__foot-note">PRESS ESC TO RESUME · 按 ESC 繼續</span>';
  }

  onOpen() {
    this.game.time.paused = true;
    this.game.audio.setLowpass(900, 0.4);
  }

  onClose() {
    this.game.time.paused = false;
    this.game.audio.setLowpass(20000, 0.4);
    this.onResumeCb && this.onResumeCb();
  }
}
