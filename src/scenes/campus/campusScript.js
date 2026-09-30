/** Characters, dialogue and the quest of 《校園異聞》. */

const sailor = (main = '#26304c', accent = '#b23a3a') => ({ type: 'sailor', main, accent, bottom: main, socks: '#1c1e28', shoes: '#4a2e22' });
const gakuran = () => ({ type: 'gakuran', bottom: '#1c1d26', shoes: '#18161a' });

export const PLAYER_CFG = {
  name: 'akari',
  seed: 101,
  gender: 'f',
  skin: '#f6dcc8',
  hair: { style: 'ponytail', color: '#3a2826' },
  eyes: { color: '#9a5a36' },
  outfit: sailor('#26304c', '#c0403a'),
  bag: false,
};

export const YUKI_CFG = {
  name: 'yuki',
  seed: 131,
  gender: 'f',
  skin: '#f8e2d2',
  hair: { style: 'long', color: '#24222e' },
  eyes: { color: '#4a5a8a' },
  outfit: sailor('#26304c', '#3a5a9a'),
};

export const SHADOW_CFG = (i) => ({
  name: 'shadow' + i,
  seed: 300 + i,
  gender: i === 1 ? 'm' : 'f',
  skin: '#111',
  hair: { style: ['long', 'messy', 'bob'][i % 3], color: '#111' },
  eyes: { color: '#e02a2a' },
  outfit: { type: 'shadow', main: '#000', bottom: '#000', socks: '#000', shoes: '#000', accent: '#000' },
});

/**
 * NPC definitions. area: which map. patrol: [x0, x1] optional.
 * talk(state) returns an array of dialogue lines for the current quest stage.
 */
export const NPCS = [
  {
    id: 'hana',
    area: 'corridor',
    name: '小野 花',
    nameEn: 'HANA ONO',
    pitch: 760,
    pos: [-6.2, -0.3],
    facing: 1,
    quest: true,
    cfg: { seed: 111, gender: 'f', skin: '#f7ddc9', hair: { style: 'twin', color: '#8a5a3a' }, eyes: { color: '#7a4a8a' }, outfit: sailor('#26304c', '#c0403a'), smile: true },
  },
  {
    id: 'riku',
    area: 'corridor',
    name: '佐伯 陸',
    nameEn: 'RIKU SAEKI',
    pitch: 480,
    pos: [2.8, -0.9],
    facing: -1,
    cfg: { seed: 112, gender: 'm', skin: '#f0d2bc', hair: { style: 'messy', color: '#1e1a1c' }, eyes: { color: '#5a3a2a' }, outfit: gakuran() },
  },
  {
    id: 'mei',
    area: 'corridor',
    name: '高橋 芽衣',
    nameEn: 'MEI TAKAHASHI',
    pitch: 700,
    pos: [7.4, -0.2],
    facing: -1,
    patrol: [6.4, 8.2],
    cfg: { seed: 113, gender: 'f', skin: '#f8e0cc', hair: { style: 'long', color: '#221c22' }, eyes: { color: '#3a4a6a' }, outfit: sailor(), glasses: true },
  },
  {
    id: 'sota',
    area: 'corridor',
    name: '中村 蒼太',
    nameEn: 'SOTA NAKAMURA',
    pitch: 520,
    pos: [-12.2, -0.6],
    facing: 1,
    cfg: { seed: 114, gender: 'm', skin: '#eed0b8', hair: { style: 'short', color: '#5a3a2a' }, eyes: { color: '#6a4a2a' }, outfit: gakuran(), bag: true, bagColor: '#3a2e2a' },
  },
  {
    id: 'teacher',
    area: 'corridor',
    name: '黑澤 老師',
    nameEn: 'MR. KUROSAWA',
    pitch: 380,
    pos: [12.3, -0.5],
    facing: -1,
    scale: 1.08,
    cfg: { seed: 115, gender: 'm', skin: '#ecccb4', hair: { style: 'parted', color: '#2a2626' }, eyes: { color: '#3a3030' }, outfit: { type: 'teacher', vest: '#5a5a62', accent: '#3a4a6a', bottom: '#3a3a42', shoes: '#1a1614' }, stern: true, glasses: true },
  },
  {
    id: 'nao',
    area: 'classroom',
    name: '藤井 奈央',
    nameEn: 'NAO FUJII',
    pitch: 720,
    pos: [-3.2, 1.9],
    facing: 1,
    cfg: { seed: 116, gender: 'f', skin: '#f7dcc6', hair: { style: 'bob', color: '#6a3a2a' }, eyes: { color: '#6a3a2a' }, outfit: sailor(), hairpin: '#e0a040', smile: true },
  },
  {
    id: 'kenji',
    area: 'classroom',
    name: '森 健二',
    nameEn: 'KENJI MORI',
    pitch: 500,
    pos: [1.6, 2.1],
    facing: -1,
    cfg: { seed: 117, gender: 'm', skin: '#efd2ba', hair: { style: 'short', color: '#2a2a2a' }, eyes: { color: '#3a2a2a' }, outfit: gakuran(), glasses: true },
  },
  {
    id: 'shirai',
    area: 'library',
    name: '白井 小姐',
    nameEn: 'MS. SHIRAI · LIBRARIAN',
    pitch: 640,
    pos: [-8.2, 0.35],
    facing: 1,
    scale: 1.03,
    cfg: { seed: 118, gender: 'f', skin: '#f4dac6', hair: { style: 'bun', color: '#4a3a32' }, eyes: { color: '#5a4a3a' }, outfit: { type: 'cardigan', main: '#c8b48a', shirt: '#f4efe4', accent: '#8a3a3a', ribbon: true, bottom: '#5a4a40', longSkirt: true, socks: '#3a302a', shoes: '#3a2a22' }, glasses: true },
  },
];

const L = (who, whoEn, text, pitch, extra = {}) => ({ who, whoEn, text, pitch, ...extra });
const ME = (text, extra) => L('早瀨 灯', 'AKARI HAYASE', text, 660, extra);
const N = (text) => ({ who: '', text });

/** Dialogue selector: stage = quest stage index (−1 before start). */
export function dialogueFor(id, stage, flags) {
  const npc = NPCS.find((n) => n.id === id);
  const S = (text, extra) => L(npc.name, npc.nameEn, text, npc.pitch, extra);
  switch (id) {
    case 'hana':
      if (stage <= 0)
        return [
          S('啊,灯!妳也在找雪嗎?'),
          ME('嗯。班導說她放學後就沒回家,手機也打不通。'),
          S('我……我可能是最後一個看到她的人。', { event: 'lean' }),
          S('大概四點半左右吧,她抱著一本很舊的書,往圖書館那邊走過去了。'),
          S('我叫她,她好像沒聽見。那時候走廊的影子……好奇怪,一直在晃。'),
          ME('往圖書館?'),
          S('可是她的書包還掛在教室的桌子上喔。她不是那種會丟下東西的人。'),
          N('【線索】青山雪最後被目擊時,正走向圖書館。她的書包還留在二年B組的教室裡。'),
          S('拜託妳了,灯。天黑之前……一定要找到她。', { event: 'clue_hana' }),
        ];
      if (stage === 1) return [S('雪的座位在窗邊最後一排。她常常在那裡寫東西。'), S('……我總覺得,她好像一直在等什麼。')];
      if (stage >= 2 && !flags.done) return [S('找到線索了嗎?圖書館在走廊的最東邊。'), S('聽說舊資料室已經封起來好多年了,連圖書委員都沒進去過。')];
      return [S('雪沒事了!真是太好了……謝謝妳,灯。'), S('下次換我請妳吃可麗餅吧!')];
    case 'riku':
      return stage < 3 || !flags.done
        ? [S('喂,早瀨。妳也聽說了?青山不見了。'), S('我剛剛在走廊盡頭看到……算了,大概是眼花。'), S('總之,太陽下山以前別在舊館那邊逗留。學長說那裡的時間會「卡住」。'), ME('時間……卡住?'), S('我也不知道啦!就是個怪談而已。')]
        : [S('聽說青山找到了?妳該不會真的進去舊資料室了吧……'), S('……下次也帶上我啊。')];
    case 'mei':
      return [S('圖書館閱讀週的海報是我畫的。有看到嗎?'), S('對了,公告上寫著「舊館資料室暫停開放」。可是我昨天好像看到門縫裡有光。'), S('紅色的光。像是……有人在裡面點了燈。')];
    case 'sota':
      return [S('社團活動結束了,我正要回家。'), S('妳問青山?她最近常一個人留在教室寫筆記,寫得很認真。'), S('有一次我偷看了一眼,上面寫的全是時間。十六點三十分、十七點零四分……像是在記錄什麼。')];
    case 'teacher':
      if (flags.done) return [S('青山同學已經平安回家了。做得很好,早瀨。'), S('不過,下次發現異狀,先來找老師。這是規定。')];
      return [S('早瀨。放學時間已經過了,沒事就早點回家。'), ME('老師,青山同學她——'), S('……我知道。我已經聯絡了家長,也在校內找過一圈。'), S('舊圖書館資料室的鑰匙很久以前就遺失了。她不可能進得去。'), S('如果妳發現了什麼,立刻告訴我。不要一個人行動。')];
    case 'nao':
      return stage <= 1
        ? [S('灯?妳也來找雪的嗎?'), S('她的位子在最後一排,靠窗那邊。桌上好像還放著她的筆記本。'), S('我不敢亂動她的東西……妳去看看吧。')]
        : [S('那本筆記裡寫了什麼?……舊圖書館資料室?'), S('雪為什麼要去那種地方……')];
    case 'kenji':
      return [S('值日生的工作還沒做完……喂,早瀨,妳是值日生吧?'), ME('今天是青山跟我。'), S('……啊,抱歉。'), S('說起來,青山今天午休一直盯著窗外的夕陽看。她說:「那個時候的光,和今天一模一樣。」')];
    case 'shirai':
      if (stage < 2) return [S('歡迎來到圖書館。閱覽時間到五點半為止喔。'), S('要借書的話,請到櫃台登記。')];
      if (flags.done) return [S('資料室的門……開了?'), S('……不,沒什麼。青山同學平安就好。請把鑰匙交給我保管吧——不,還是由妳留著吧。'), S('我總覺得,它選擇了妳。')];
      return [S('舊資料室?在閱覽室最裡面,右手邊那扇門。'), S('不過那裡已經封了十年了。鑰匙早就不見了……'), S('……妳說,有人看到青山同學往這邊走?'), S('奇怪。今天從四點半開始,那扇門後面一直傳來……時鐘的聲音。')];
    default:
      return [S('……')];
  }
}

export const NOTEBOOK_LINES = [
  N('你翻開了青山雪的筆記本。紙頁上寫滿了細小的字。'),
  N('「十月二十八日。十六點三十分。走廊的影子第一次動了。」'),
  N('「十月二十九日。十七點零四分。我聽見舊圖書館資料室傳來時鐘的聲音。」'),
  N('「那扇門後面的時間,停在很久以前的某一天。如果我能進去,也許就能找到——」'),
  N('字跡在這裡中斷了。最後一頁被人用力寫下了一行字——'),
  N('「舊圖書館資料室」'),
  ME('……雪,妳到底想找什麼?', { event: 'clue_note' }),
];

export const ANOMALY_LINES = [
  N('門把冰冷得像是冬天的金屬。門縫裡,溢出紅色的光。'),
  N('時鐘的聲音停了。夕陽的顏色,在一瞬間褪去。'),
  ME('……影子,在動?', { event: 'anomaly' }),
];

export const RESCUE_LINES = [
  N('資料室的門緩緩打開。塵埃在最後一道夕陽裡浮動。'),
  L('青山 雪', 'YUKI AOYAMA', '……灯?妳怎麼會在這裡?', 680),
  ME('雪!大家都在找妳!'),
  L('青山 雪', 'YUKI AOYAMA', '我好像……在這裡待了很久很久。外面的時間,只過了一個小時嗎?', 680),
  L('青山 雪', 'YUKI AOYAMA', '這把鑰匙,是在最裡面的書架上找到的。它一直在發光,好像在等人來拿。', 680),
  L('青山 雪', 'YUKI AOYAMA', '……給妳吧。我想,它應該交給會回來的人。', 680, { event: 'reward' }),
  N('你取得了「舊圖書館鑰匙」。黃銅的表面刻著:資料室 · 1929。'),
];

export const QUEST = {
  id: 'campus_missing',
  game: 'campus',
  title: '消失的學生',
  titleEn: 'THE MISSING STUDENT',
  exp: 320,
  reward: { id: 'library_key', name: '舊圖書館鑰匙', nameEn: 'Key to the Old Library' },
  objectives: [
    { id: 'ask', text: '向走廊上的同學打聽青山雪的下落', textEn: 'ASK AROUND THE CORRIDOR' },
    { id: 'desk', text: '到二年B組教室,調查青山的座位', textEn: "SEARCH YUKI'S DESK IN CLASS 2-B" },
    { id: 'archive', text: '前往圖書館,找到舊資料室', textEn: 'FIND THE OLD ARCHIVE ROOM' },
    { id: 'shadows', text: '驅散異常之影', textEn: 'DISPEL THE ANOMALOUS SHADOWS', target: 3 },
    { id: 'enter', text: '進入舊資料室', textEn: 'ENTER THE ARCHIVE ROOM' },
  ],
};
