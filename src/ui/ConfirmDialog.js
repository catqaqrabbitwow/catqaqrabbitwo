import { Panel } from './Panel.js';

/** Small confirmation slip. Resolves true / false. */
export function confirmDialog(game, { title = 'Confirm', titleZh = '確認', message = '', yes = ['CONFIRM', '確認'], no = ['CANCEL', '取消'] } = {}) {
  return new Promise((resolve) => {
    const p = new Panel(game, { className: 'confirm', formNo: 'C-01', title, titleZh, width: 58, paper: 'paper--cream' });
    let answered = false;
    p.content.innerHTML = `<p class="confirm__msg stagger">${message}</p>`;
    const mk = (label, primary, val, sfx) =>
      game.ui.button({
        className: `doc-btn ${primary ? '' : 'doc-btn--ghost'}`,
        html: `<span class="doc-btn__in"><span class="t-cond ls">${label[0]}</span><span class="t-zh">${label[1]}</span></span>`,
        sfx: ['hover_paper', sfx],
        onClick: () => {
          answered = true;
          p.close();
          resolve(val);
        },
      });
    const btns = document.createElement('div');
    btns.className = 'panel__foot-btns';
    btns.append(mk(no, false, false, 'cancel'), mk(yes, true, true, 'confirm'));
    p.foot.appendChild(btns);
    p.onClose = () => {
      if (!answered) resolve(false);
    };
    p.open();
  });
}
