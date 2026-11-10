#!/bin/bash
# 고친 내용을 인터넷에 올린다:  bash deploy.sh "무엇을 고쳤는지"
# 올릴 때마다 번호(ver.js, version.json)를 새로 매긴다. 앱은 열릴 때 이 번호를 비교해 새 내용을 스스로 불러온다.
set -e
cd "$(dirname "$0")"
V=$(date +%s)
echo "const APP_VER = $V;" > ver.js
echo "{\"v\": $V}" > version.json
git add -A
git commit -q -m "${1:-내용 수정}"
git push || { echo "올리기 실패: gh auth setup-git 을 한 번 실행한 뒤 다시 해 보세요."; exit 1; }
echo "올렸습니다(번호 $V) → https://rumispace.github.io/byeolha-nihongo/"
