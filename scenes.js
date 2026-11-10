/* 별하 일본어 — "약국 영업" 손님 대본
 *
 * 손님 한 명 = 인사부터 배웅까지 이어지는 짧은 대화 한 편.
 * 한 차례(turn)는 아래 넷 중 하나다.
 *
 *   { sit: '상황 설명', ans: '문장 id' }                     상황을 보고 알맞은 말 고르기
 *   { c: '손님 일본어', p: '발음', k: '뜻', ans: '문장 id' }   손님 말을 듣고 대답 고르기
 *   { c, p, means: ['정답 뜻', '오답', '오답'] }              손님 말이 무슨 뜻인지 고르기 (첫 번째가 정답)
 *   { c, p, k, price: 35000 }                               가격을 일본어로 말하기
 *
 * ans 는 data.js 의 문장 id. 손님 대사(c)는 tools/make_audio.py 가 음성으로 만든다.
 * look: 손님 생김새. type 은 procedure(시술) | gift(선물) | cold(감기)
 */
'use strict';

const SHOP_SCRIPTS = [
  {
    id: 'proc1', type: 'procedure', name: '시술 받은 손님', sale: 38000,
    look: { shirt: 0xF29E9E, pants: 0x4A4E69, hair: 0x3B2A20, long: true, tape: true, hat: true },
    turns: [
      { sit: '얼굴에 테이프를 붙인 손님이 들어옵니다.', ans: 'p_irasshai' },
      { c: '腫れに効くクリームはありますか', p: '하레니 키쿠 쿠리-무와 아리마스카', k: '붓기에 듣는 크림 있어요?', sit: '추천하기 전에 먼저 확인합니다.', ans: 'p_shijutsu' },
      { c: 'はい、昨日受けました', p: '하이, 키노- 우케마시타', k: '네, 어제 받았어요', ans: 'p_osusume' },
      { c: 'どうやって使いますか', p: '도-얏테 츠카이마스카', k: '어떻게 써요?', ans: 'p_1nichi2kai' },
      { c: 'ありがとうございます', p: '아리가토- 고자이마스', k: '감사합니다', ans: 'p_odaijini' },
    ],
  },
  {
    id: 'proc2', type: 'procedure', name: '재생크림을 찾는 손님', sale: 35000,
    look: { shirt: 0xB8C0FF, pants: 0x2B2D42, hair: 0x1B1B1B, long: true, tape: true, mask: true },
    turns: [
      { sit: '마스크를 쓴 손님이 들어옵니다.', ans: 'p_irasshai' },
      { c: '再生クリームはどこですか', p: '사이세- 쿠리-무와 도코데스카', k: '재생크림은 어디 있어요?', ans: 'p_kochira' },
      { c: '敏感肌でも大丈夫ですか', p: '빈칸하다데모 다이죠-부데스카', k: '민감성 피부도 괜찮나요?', ans: 'p_binkan_ok' },
      { sit: '시술 후 외출할 때 자외선 차단도 필요하다고 알려 줍니다.', ans: 'p_hiyake_nuru' },
      { c: 'いくらですか', p: '이쿠라데스카', k: '얼마예요?', price: 35000 },
      { sit: '계산을 마친 손님이 나갑니다.', ans: 'p_arigato' },
    ],
  },
  {
    id: 'gift1', type: 'gift', name: '선물을 고르는 손님', sale: 54000,
    look: { shirt: 0xFFD166, pants: 0x3D5A80, hair: 0x5C3D2E, bag: true },
    turns: [
      { sit: '쇼핑백을 든 손님이 들어옵니다.', ans: 'p_irasshai' },
      { sit: '손님이 진열대 앞에서 두리번거립니다.', ans: 'p_osagashi' },
      { c: '友達のお土産を探しています', p: '토모다치노 오미야게오 사가시테이마스', k: '친구 선물을 찾고 있어요', sit: '제일 잘 나가는 제품을 권합니다.', ans: 'p_ichiban' },
      { c: 'これ、みっつください', p: '코레, 밋츠 쿠다사이', k: '이거 세 개 주세요', ans: 'p_kashikomari' },
      { sit: '계산하기 전에 봉투가 필요한지 묻습니다.', ans: 'p_fukuro' },
      { c: '大丈夫です', p: '다이죠-부데스', means: ['필요 없어요', '네, 주세요', '너무 비싸요'] },
      { sit: '손님을 배웅합니다.', ans: 'p_mata' },
    ],
  },
  {
    id: 'gift2', type: 'gift', name: '스크쇼를 보여 주는 손님', sale: 48000,
    look: { shirt: 0x95D5B2, pants: 0x6D597A, hair: 0x2F1B12, long: true, bag: true },
    turns: [
      { sit: '휴대폰을 든 손님이 들어옵니다.', ans: 'p_irasshai' },
      { c: 'これ、ありますか', p: '코레, 아리마스카', k: '이거 있어요? (스크쇼를 보여 주며)', ans: 'p_zaiko' },
      { sit: '재고를 찾아서 돌아왔습니다.', ans: 'p_omatase' },
      { c: '免税できますか', p: '멘제- 데키마스카', k: '면세 되나요?', ans: 'p_menzei' },
      { sit: '면세 처리를 하려면 여권이 필요합니다.', ans: 'p_passport' },
      { c: 'いくらですか', p: '이쿠라데스카', k: '얼마예요?', price: 48000 },
      { sit: '여행 온 손님을 배웅합니다.', ans: 'p_tanoshinde' },
    ],
  },
  {
    id: 'cold1', type: 'cold', name: '기침하는 손님', sale: 9000,
    look: { shirt: 0x9AD1D4, pants: 0x495057, hair: 0x222222, mask: true, scarf: true },
    turns: [
      { sit: '기침을 하는 손님이 들어옵니다.', ans: 'p_irasshai' },
      { sit: '손님이 아파 보입니다. 먼저 물어봅니다.', ans: 'p_dousare' },
      { c: '喉が痛くて、咳が出ます', p: '노도가 이타쿠테, 세키가 데마스', means: ['목이 아프고 기침이 나요', '머리가 아프고 열이 나요', '배가 아프고 설사를 해요'] },
      { sit: '얼마나 됐는지 확인합니다.', ans: 'p_itsukara' },
      { c: '昨日からです', p: '키노-카라데스', k: '어제부터요', sit: '약을 권하기 전에 알레르기를 확인합니다.', ans: 'p_allergy' },
      { c: 'ありません', p: '아리마셍', k: '없어요', sit: '약을 건네며 복용법을 알려 줍니다.', ans: 'p_1nichi3kai' },
      { sit: '아픈 손님을 배웅합니다.', ans: 'p_odaijini' },
    ],
  },
  {
    id: 'cold2', type: 'cold', name: '감기약을 찾는 손님', sale: 6000,
    look: { shirt: 0xE5989B, pants: 0x343A40, hair: 0x4A2C1A, scarf: true },
    turns: [
      { sit: '목도리를 두른 손님이 들어옵니다.', ans: 'p_irasshai' },
      { c: '風邪薬をください', p: '카제구스리오 쿠다사이', k: '감기약 주세요', sit: '먼저 열이 있는지 확인합니다.', ans: 'p_netsu' },
      { c: '少しあります', p: '스코시 아리마스', k: '조금 있어요', sit: '함께 먹는 약이 있는지 확인합니다.', ans: 'p_hokani' },
      { c: 'いいえ、ありません', p: '이-에, 아리마셍', k: '아니요, 없어요', sit: '약을 건네며 졸음 주의를 알려 줍니다.', ans: 'p_nemuku' },
      { c: 'いつ飲みますか', p: '이츠 노미마스카', k: '언제 먹어요?', ans: 'p_shokugo' },
      { c: 'いくらですか', p: '이쿠라데스카', k: '얼마예요?', price: 6000 },
      { sit: '아픈 손님을 배웅합니다.', ans: 'p_odaijini' },
    ],
  },
];

const SHOP_TYPES = {
  procedure: { name: '시술 받은 손님', em: '🩹' },
  gift: { name: '선물 사는 손님', em: '🎁' },
  cold: { name: '감기 걸린 손님', em: '🤧' },
};
