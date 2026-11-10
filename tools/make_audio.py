#!/usr/bin/env python3
"""data.js 에 있는 모든 일본어를 음성 파일로 만든다.

    python3 tools/make_audio.py

- 필요한 것: pip install edge-tts
- 결과: audio/<해시>.mp3 와 audio/index.js (문장 → 파일 이름 표)
- 이미 만든 파일은 건너뛴다. 문장을 추가했으면 다시 돌리기만 하면 된다.
- 표에 없는 문장은 앱이 기기 내장 음성으로 읽는다.
"""
import asyncio, hashlib, json, re, sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio'
VOICE = 'ja-JP-NanamiNeural'   # 남성은 ja-JP-KeitaNeural
RATE = '-8%'                   # 배우는 사람용으로 살짝 느리게

D = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう']


def under10k(n):
    s, h, j, o = n // 1000, n // 100 % 10, n // 10 % 10, n % 10
    k = ''
    if s:
        k += {1: 'せん', 3: 'さんぜん', 8: 'はっせん'}.get(s, D[s] + 'せん')
    if h:
        k += {1: 'ひゃく', 3: 'さんびゃく', 6: 'ろっぴゃく', 8: 'はっぴゃく'}.get(h, D[h] + 'ひゃく')
    if j:
        k += 'じゅう' if j == 1 else D[j] + 'じゅう'
    return k + D[o]


def num_read(n):
    man, rest = divmod(n, 10000)
    return (under10k(man) + 'まん' if man else '') + (under10k(rest) if rest else '')


def texts():
    src = (ROOT / 'data.js').read_text(encoding='utf-8')
    src = re.sub(r'^\s*(\*|/\*|//).*$', '', src, flags=re.M)      # 주석 속 예시는 뺀다
    out = []
    out += re.findall(r"\bkana\('([^']+)'", src)
    out += re.findall(r"\bword\('([^']+)'", src)
    out += re.findall(r"\bnum\('[^']+',\s*'([^']+)'", src)        # 숫자는 가나로 읽힌다
    out += re.findall(r"\bph\('[^']+',\s*'([^']+)'", src)
    out += re.findall(r"cust:\s*\{\s*jp:\s*'([^']+)'", src)
    out += re.findall(r"\.say\s*=\s*'([^']+)'", src)                # 읽는 법을 따로 정한 글자
    # 가격 듣기: 앱이 내는 모든 금액
    for n in range(1000, 10000, 500):
        out.append(num_read(n) + 'ウォンです')
    for n in range(10000, 100000, 1000):
        out.append(num_read(n) + 'ウォンです')
    seen, uniq = set(), []
    for t in out:
        if t not in seen:
            seen.add(t); uniq.append(t)
    return uniq


async def main():
    OUT.mkdir(exist_ok=True)
    ts = texts()
    table = {t: hashlib.sha1(t.encode('utf-8')).hexdigest()[:10] + '.mp3' for t in ts}
    todo = [t for t in ts if not (OUT / table[t]).exists() or (OUT / table[t]).stat().st_size < 500]
    print(f'문장 {len(ts)}개, 새로 만들 것 {len(todo)}개')
    sem = asyncio.Semaphore(4)
    failed = []

    async def one(t):
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(t, VOICE, rate=RATE).save(str(OUT / table[t]))
                    return
                except Exception as e:           # 네트워크가 잠깐 끊기면 다시
                    err = e
                    await asyncio.sleep(1 + attempt)
            failed.append(t)
            print('실패:', t, err, file=sys.stderr)

    await asyncio.gather(*(one(t) for t in todo))
    ok = {t: f for t, f in table.items() if (OUT / f).exists() and (OUT / f).stat().st_size >= 500}
    # 이제 안 쓰는 파일은 지운다
    for p in OUT.glob('*.mp3'):
        if p.name not in ok.values():
            p.unlink()
    (OUT / 'index.js').write_text(
        '/* tools/make_audio.py 가 만든 파일. 직접 고치지 않는다. */\nconst AUDIO = '
        + json.dumps(ok, ensure_ascii=False, indent=0) + ';\n', encoding='utf-8')
    print(f'완료 {len(ok)}개' + (f', 실패 {len(failed)}개' if failed else ''))


if __name__ == '__main__':
    asyncio.run(main())
