import { Panel } from './Panel.js';
import { slider, stampOptions, onOff } from './controls.js';
import { DEFAULT_SETTINGS } from '../core/SaveManager.js';

export class SettingsPanel extends Panel {
  constructor(game) {
    super(game, { className: 'settings', formNo: '07-S', title: 'Settings', titleZh: '設定 · 系統調校', subtitle: 'Adjust the apparatus before the next journey.', width: 100 });
    this.build();
  }

  build() {
    const g = this.game;
    const s = g.save.settings;
    const set = (key) => (v) => {
      s[key] = v;
      g.save.save();
      g.applySettings(key);
    };
    this.content.innerHTML = `
      <div class="settings__cols">
        <section class="settings__col" data-col="a"><h3 class="settings__h t-cond">I · AUDIO <span>音訊</span></h3></section>
        <section class="settings__col" data-col="b"><h3 class="settings__h t-cond">II · DISPLAY <span>畫面</span></h3></section>
      </div>`;
    const a = this.content.querySelector('[data-col=a]');
    const b = this.content.querySelector('[data-col=b]');

    a.appendChild(slider(g, { zh: '主音量', en: 'Master Volume', value: s.masterVolume, onChange: set('masterVolume') }));
    a.appendChild(slider(g, { zh: '音樂', en: 'Music', value: s.musicVolume, onChange: set('musicVolume') }));
    a.appendChild(slider(g, { zh: '音效', en: 'SFX', value: s.sfxVolume, onChange: set('sfxVolume') }));
    const h3 = document.createElement('h3');
    h3.className = 'settings__h t-cond';
    h3.innerHTML = 'III · CONTROL <span>操作</span>';
    a.appendChild(h3);
    a.appendChild(slider(g, { zh: '滑鼠靈敏度', en: 'Mouse Sensitivity', value: s.mouseSensitivity, min: 0.2, max: 2, step: 0.05, format: (v) => v.toFixed(2), onChange: set('mouseSensitivity') }));
    a.appendChild(slider(g, { zh: '鏡頭震動', en: 'Camera Shake', value: s.cameraShake, min: 0, max: 1.5, step: 0.05, format: (v) => Math.round(v * 100) + '%', onChange: set('cameraShake') }));
    a.appendChild(onOff(g, '動態效果', 'Motion Effect', s.motionEffect, set('motionEffect')));

    b.appendChild(
      stampOptions(g, {
        zh: '解析度比例',
        en: 'Resolution Scale',
        value: s.resolutionScale,
        options: [
          { label: '50%', value: 0.5 },
          { label: '75%', value: 0.75 },
          { label: '100%', value: 1 },
          { label: 'HD+', value: 1.5 },
        ],
        onChange: set('resolutionScale'),
      }),
    );
    b.appendChild(
      stampOptions(g, {
        zh: '陰影品質',
        en: 'Shadow Quality',
        value: s.shadowQuality,
        options: [
          { label: 'OFF', value: 'off' },
          { label: 'LOW', value: 'low' },
          { label: 'HIGH', value: 'high' },
        ],
        onChange: set('shadowQuality'),
      }),
    );
    b.appendChild(onOff(g, '後製處理', 'Post Processing', s.postProcessing, set('postProcessing')));
    b.appendChild(onOff(g, '泛光', 'Bloom', s.bloom, set('bloom')));
    b.appendChild(onOff(g, '景深', 'Depth of Field', s.depthOfField, set('depthOfField')));
    b.appendChild(onOff(g, '全螢幕', 'Fullscreen', !!document.fullscreenElement, set('fullscreen')));
    b.appendChild(onOff(g, '幀率顯示', 'FPS Counter', s.fpsCounter, set('fpsCounter')));

    const reset = this.ui.button({
      className: 'doc-btn doc-btn--ghost',
      html: `<span class="doc-btn__in"><span class="t-cond ls">RESTORE DEFAULTS</span><span class="t-zh">恢復預設</span></span>`,
      sfx: ['hover_tick', 'click_mech'],
      onClick: () => {
        Object.assign(s, DEFAULT_SETTINGS, { fullscreen: !!document.fullscreenElement });
        g.save.save();
        Object.keys(DEFAULT_SETTINGS).forEach((k) => k !== 'fullscreen' && g.applySettings(k));
        this.content.innerHTML = '';
        this.build();
        this.ui.toast('已恢復預設設定', 'SETTINGS RESTORED');
      },
    });
    const done = this.ui.button({
      className: 'doc-btn',
      html: `<span class="doc-btn__in"><span class="t-cond ls">CONFIRM</span><span class="t-zh">確認</span></span>`,
      sfx: ['hover_paper', 'confirm'],
      onClick: () => this.close(),
    });
    this.foot.innerHTML = '<span class="panel__foot-note">SETTINGS ARE STORED LOCALLY · 設定將自動保存</span>';
    const btns = document.createElement('div');
    btns.className = 'panel__foot-btns';
    btns.append(reset, done);
    this.foot.appendChild(btns);
  }
}
