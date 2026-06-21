# 🔔 운동 리마인더 푸시 설정 가이드

매일 저녁 **20:30(KST)**, 그날 운동 기록이 없는 멤버에게 푸시 알림을 보냅니다.

클라이언트(웹앱 토글·서비스워커)는 이미 배포되어 있고, **아래 두 가지만 직접 해주시면** 작동합니다.

---

## 1단계 — VAPID 키 발급 후 붙여넣기 (필수)

웹 푸시는 VAPID 키가 있어야 토큰을 발급할 수 있어요.

1. [Firebase 콘솔](https://console.firebase.google.com/) → 프로젝트 **obaengma** 선택
2. ⚙️ **프로젝트 설정** → **클라우드 메시징** 탭
3. **웹 푸시 인증서** 섹션 → **키 쌍 생성** 클릭
4. 생성된 **"키 쌍"** 값(긴 문자열) 복사
5. `index.html`에서 아래 줄을 찾아 값 교체:

   ```js
   const VAPID_KEY = "여기에_VAPID_공개키_붙여넣기";
   ```
   →
   ```js
   const VAPID_KEY = "복사한_키_쌍_값";
   ```
6. 커밋 & 푸시 → 자동 배포

> VAPID 키를 넣기 전까진 프로필의 "알림 켜기"가 "VAPID 키 미설정" 메시지를 띄웁니다.

---

## 2단계 — Cloud Function 배포 (스케줄 발송)

> ⚠️ Cloud Functions는 **Blaze(종량제) 요금제**가 필요합니다. (이 정도 사용량은 사실상 무료 한도 내)

### 처음 한 번만
```bash
# Firebase CLI 설치 (이미 있으면 생략)
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 루트에서 (functions/ 폴더는 이미 있음)
firebase use obaengma
```

`firebase.json`에 functions 설정이 없다면 추가:
```json
{
  "functions": { "source": "functions" }
}
```

### 의존성 설치 & 배포
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

배포 시 Cloud Scheduler가 자동으로 매일 20:30(Asia/Seoul) 트리거를 만듭니다.

### 잘 되는지 테스트
- Firebase 콘솔 → **Functions** → `dailyReminder` → ⋯ → **테스트 실행**
- 또는 Cloud Scheduler 콘솔에서 작업 **지금 실행**

---

## 3단계 — Firestore 보안 규칙 (토큰 저장 허용)

`pushTokens` 컬렉션에 로그인 사용자가 자기 토큰을 쓸 수 있어야 합니다.
`firestore.rules`에 아래 규칙을 추가하세요(없으면 콘솔 → Firestore → 규칙):

```
match /pushTokens/{token} {
  allow read, write: if request.auth != null;
}
```

배포:
```bash
firebase deploy --only firestore:rules
```

---

## 동작 방식 요약
- 멤버가 프로필 → **🔔 운동 리마인더 → 알림 켜기** → 권한 허용 → 토큰이 `pushTokens`에 저장됨
- 매일 20:30, `dailyReminder` 함수가 그날 **훈련일지/캘린더에 기록이 없는** 멤버의 토큰으로만 푸시 발송
- 만료된 토큰은 자동 정리

## 참고 / 제약
- **iOS**: 사파리로 그냥 보면 푸시 안 옴 → 홈 화면에 **"앱으로 추가"(PWA 설치)** 후 알림 켜야 함 (iOS 16.4+)
- **안드로이드/데스크톱 크롬**: 브라우저에서 바로 가능
- 알림 권한을 거부하면 받을 수 없음
