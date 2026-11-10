#!/bin/bash
# 고친 내용을 인터넷에 올린다:  bash deploy.sh "무엇을 고쳤는지"
# 올린 뒤 1~2분 지나 앱을 다시 열면 새 내용이 보인다.
set -e
cd "$(dirname "$0")"
git add -A
git commit -m "${1:-내용 수정}" || { echo "바뀐 것이 없습니다."; exit 0; }
git push || { echo "올리기 실패: gh auth setup-git 을 한 번 실행한 뒤 다시 해 보세요."; exit 1; }
echo "올렸습니다 → https://rumispace.github.io/byeolha-nihongo/"
