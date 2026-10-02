# yookgaejang11.github.io 포트폴리오

휴대용 게임기 콘셉트의 게임 개발 포트폴리오 사이트와, 브라우저에서 내용을 고쳐 바로 게시하는 관리자 페이지입니다.

## 적용 방법

1. zip을 풀어서 나온 파일을 `yookgaejang11.github.io` 저장소 **맨 위 폴더**에 그대로 덮어씁니다.
2. 커밋하고 푸시합니다. (GitHub 웹에서 하려면 저장소 → Add file → Upload files로 폴더째 끌어다 놓기)
3. 저장소 Settings → Pages에서 **Source: Deploy from a branch**, **Branch: main / (root)** 인지 확인합니다.
4. 1~2분 뒤 `https://yookgaejang11.github.io/`에서 확인합니다.

기존 파일 중 같은 이름(index.html 등)은 덮어써집니다. 남기고 싶은 파일이 있으면 먼저 백업하세요.

## 먼저 채워야 할 것

아래 항목은 알려 주지 않은 내용이라 **비워 두었어요.** `/admin/` → 프로필·대표작 탭에서 채우면 됩니다.

| 항목 | 지금 상태 | 사이트에 보이는 것 |
|---|---|---|
| 이름/닉네임 | 비어 있음 | GitHub 아이디 `yookgaejang11` |
| 한 줄 소개 | 비어 있음 | "게임을 만듭니다" (임시 문구) |
| 공개 이메일 | 비어 있음 | 연락처에 GitHub 링크만 보임 |
| 게임잼 | 없음 | 수상 섹션에 게임잼 칸이 안 보임 |
| 개발 일지, 시즌 | 없음 | "아직 올린 개발 일지가 없어요" |
| Space Gamble 스크린샷·플레이 링크 | 없음 | SCREENSHOT SOON, 플레이 버튼 숨김 |

**확인이 필요한 것**
- "2026 부상지방기능경기대회 은상"은 **부산**지방기능경기대회로 넣었어요.
- 청강게임대전의 등급은 **공모전**으로 넣었어요. 다르면 수상 탭에서 바꾸세요.
- 수상과 연결된 프로젝트는 비워 두었어요. 연결하면 프로젝트 카드에 "청강 특선" 같은 배지가 붙습니다.
- Space Gamble 소개 문구와 개발 비화(`dev/dev1.html`)는 이전 대화에서 이야기한 규칙과 코드 구조로 쓴 **초안**이에요. 공개해도 되는 내용인지 보고 관리자 글쓰기 창에서 고치세요.

## 관리자 페이지 (`/admin/`)

검색엔진에 안 잡히게(`noindex`) 해 두었지만 주소를 아는 사람은 열 수 있어요. 토큰 없이는 아무것도 바꿀 수 없습니다.

**GitHub 토큰으로 연결** (어느 컴퓨터에서나)
1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Repository access: **Only select repositories** → `yookgaejang11.github.io`
3. Repository permissions → **Contents: Read and write**
4. 만든 토큰을 관리자 페이지에 붙여넣고 연결

**내 컴퓨터 폴더로 연결** (Chrome/Edge)
클론한 저장소 폴더를 고르면 파일을 직접 고칩니다. 커밋·푸시는 직접 하세요.

**쓰는 순서**: 탭에서 고치기 → **적용**(Ctrl+S) → 게시 대기에 쌓임 → **게시**(여러 파일이 커밋 하나로 올라감)

- 데브로그: "새 개발 일지"를 누르면 다음 번호와 오늘 날짜가 채워져요. 썸네일은 클릭·끌어다 놓기·붙여넣기로 올리면 `devlog/Thumb/번호.확장자`에 저장되고, GIF면 정지 이미지(`번호_still.webp`)도 같이 만들어요. 기존 GIF는 "GIF 정지 이미지 만들기" 버튼으로 한 번에 처리합니다.
- 긴 공백 기간은 종류를 "인터루드"로 바꾸고 그 기간의 대회·이벤트를 적으면 점선 상자로 보여요.
- 상세 글/개발 비화: 왼쪽 마크다운, 오른쪽 미리보기. 이미지는 붙여넣기로 넣어요. 마크다운 원문이 HTML 안에 같이 저장돼서 나중에 다시 열어 고칠 수 있어요.
- 게시할 때 403이 나면 토큰의 Repository access와 Contents 권한을 확인하세요. (공개 저장소는 읽기가 권한 없이도 돼서 연결은 성공한 것처럼 보입니다)

## 파일 구조

```
index.html              메인
projects.html           전체 프로젝트 (카드 누르면 팝업, 주소에 #id)
devlogs.html            개발 일지 (시즌, 인터루드, 필터, 검색)
assets/js/data.js       ★ 모든 내용 (window.SITE = {...})
assets/js/site.js       data.js를 읽어 화면을 그림
assets/css/site.css     공통 스타일 (색은 맨 위 :root 변수)
assets/css/story.css    개발 비화 / 상세 글 스타일
assets/fonts/           제목용 픽셀 폰트 Galmuri11 (OFL 라이선스)
dev/dev1.html           Space Gamble 개발 비화
devlog/N.html           개발 일지 상세 글 (관리자에서 만들면 생김)
admin/index.html        관리자 페이지
admin/md.js             관리자용 마크다운 변환기
```

data.js를 직접 고쳐도 됩니다. 새 프로젝트나 일지는 배열에 한 줄(객체 하나) 추가하면 화면에 나타나요.

## 알아 두면 좋은 것

- **캐시**: GitHub Pages는 data.js를 최대 10분 캐시하지만, site.js가 1분 단위 번호를 붙여 다시 받아서 게시 후 1~2분이면 반영됩니다.
- **GIF**: 평소에는 정지 이미지만 보이고, PC에서는 마우스를 올린 카드만, 모바일에서는 화면 가운데 카드만 재생돼요. 동작 줄이기 설정이면 재생하지 않아요.
- **메인 조작부**: 십자키나 SELECT로 화면 메뉴의 ▶ 커서를 옮기고, A로 고릅니다. B는 메일 복사(이메일이 없으면 GitHub 열기), START는 전체 프로젝트로 이동해요. 키보드 방향키로도 메뉴를 움직일 수 있어요.
- **색 바꾸기**: `assets/css/site.css` 맨 위 `:root`에서 `--accent`(A·B 버튼 색)와 `--lcd0`~`--lcd3`(액정 4색)을 바꾸면 전체가 따라 바뀝니다.
- `featured`에 없는 프로젝트 id를 넣으면 브라우저 콘솔에 경고가 뜨고, 관리자에서 적용할 때도 알려 줘요.
