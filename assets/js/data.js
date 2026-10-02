/* 사이트의 모든 내용은 이 파일 하나에 있습니다.
   관리자 페이지(/admin/)에서 고치거나, 직접 고친 뒤 커밋해도 됩니다. */
window.SITE = {
  "profile": {
    "name": "",
    "handle": "yookgaejang11",
    "tagline": "",
    "email": "",
    "affiliation": "",
    "socials": [
      { "label": "GitHub", "url": "https://github.com/yookgaejang11" }
    ],
    "nowPlaying": "space-gamble",
    "tools": [
      { "group": "엔진", "items": ["Unity 6"] },
      { "group": "언어", "items": ["C#"] },
      { "group": "네트워크", "items": ["Netcode for GameObjects", "Unity Relay"] }
    ]
  },
  "featured": ["space-gamble"],
  "seasons": [],
  "awards": [
    { "year": 2026, "contest": "청강게임대전", "short": "청강", "result": "특선", "tier": "공모전", "project": "" },
    { "year": 2026, "contest": "부산지방기능경기대회", "short": "부산", "result": "은상", "tier": "지방", "project": "" },
    { "year": 2025, "contest": "부산지방기능경기대회", "short": "부산", "result": "동상", "tier": "지방", "project": "" }
  ],
  "jams": [],
  "projects": [
    {
      "id": "space-gamble",
      "title": "Space Gamble",
      "summary": "인디언 포커 구조의 1대1 심리전 게임",
      "status": "dev",
      "dim": "3D",
      "year": "2026",
      "platform": "PC, 2인 온라인",
      "role": "네트워크와 게임 로직 (UI·디자인은 팀원 담당)",
      "points": [
        "사출 버튼을 누를 때마다 사고 확률이 오르내리고, 사고가 한 번 나면 바로 게임이 끝납니다",
        "Fold와 Go를 각자 몰래 정한 뒤 동시에 공개합니다",
        "Fold 남은 횟수는 서로 모르게 숨겨 둡니다"
      ],
      "tags": ["Unity", "C#", "Netcode for GameObjects", "Relay", "멀티플레이"],
      "thumb": "",
      "images": [],
      "play": "",
      "story": "dev/dev1.html"
    }
  ],
  "devlogs": [
    {
      "no": 1,
      "date": "2026-10-02",
      "title": "방 진입시 플레이어 위치 초기화",
      "project": "space-gamble",
      "tags": ["Game-System"],
      "thumb": "",
      "summary": "플레이어 방 진입시 모델 위치가  초기화가 되도록 만들었습니다. 코드는 있는데 제가 디자이너가 아니라 올릴 사진이 없습니다. "
    }
  ]
};
