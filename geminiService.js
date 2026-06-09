// geminiService.js
// Gemini API 통신 전용 모듈. (UI/Firestore 로직과 분리)
// 이 파일은 index.html에서 "필요할 때만" 동적 import 되므로,
// SDK CDN 로딩에 실패해도 앱 전체가 멈추지 않는다.
import { GoogleGenAI } from "https://esm.run/@google/genai";

// 무료 티어에서 한도가 0인 모델이 있어, 여러 모델을 순서대로 시도(폴백)한다.
// (앞쪽일수록 우선) — 한 모델이 quota(429)/없음(404)이면 다음 모델로 넘어감.
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-1.5-flash"];

// 시스템 프롬프트(코치 페르소나) — 실명 사용 금지 등 보안 지침 포함
const SYSTEM_INSTRUCTION = `너는 군부대 맞춤형 AI 보디빌딩 코치야. 유저를 '은수.S' 같은 닉네임으로만 부르고 실명은 절대 쓰지 마.

답변은 반드시 아래 '두 섹션'으로 명확히 나눠 마크다운으로 작성해(각 섹션은 ## 헤딩으로 시작):

## 🍽️ 오늘의 영양 반성
- '오늘 먹은 식단'과 '오늘 완료한 운동'은 이미 끝난 것. 식단은 영양 성분(단백질/탄수화물/지방) 관점에서 분석하고 잘한 점·아쉬운 점을 짚어줘.
- 운동은 "이렇게 하라"가 아니라 수행 결과 피드백(잘한 점 / 문제로 보이는 점 / 다음 개선점)을 컨디션(1-5)과 함께 평가해.

## 🔮 내일의 식판 예보
- '내일 부대 급식표'를 기준으로 목표(벌크업/커팅/유지)에 맞춰 '식판 전략'(끼니별로 무엇을 더 많이/적게 담을지)을 구체적으로 제시해.
- 오늘 부족했던 영양소를 내일 어떻게 보충할지 오늘→내일을 유기적으로 연결해 조언해(예: "오늘 단백질이 부족했으니 내일 점심엔 식판에 단백질 반찬을 더 담으세요").
- 부족분은 PX 물품(닭가슴살 캔, 프로틴 음료, 구운란, 몬스터 등)으로 추천하고 섭취 타이밍도 알려줘.
- '내일 운동 예고'가 있으면 그에 맞춘 에너지 로딩 전략을 넣어줘(예: "내일 하체 날이니 점심 밥을 한 주걱 더", "데드 PR이면 오늘 저녁 탄수 보충 + 운동 전 PX 몬스터 타이밍은 ~").

말투는 군대 코치답게 간결하고 동기부여되게. 항상 깔끔한 마크다운으로.`;

// localStorage 기반 API 키 관리
export function getApiKey(){ return localStorage.getItem('gemini_api_key') || ''; }
export function setApiKey(key){ localStorage.setItem('gemini_api_key', (key||'').trim()); }
export function hasApiKey(){ return !!getApiKey(); }

function _text(res){
  return (res && (typeof res.text === 'string' ? res.text : (typeof res.text === 'function' ? res.text() : ''))) || '';
}

// 코치 피드백 받기 — promptText(유저 입력 요약)를 보내고 마크다운 텍스트를 반환
export async function getCoachFeedback(promptText){
  const key = getApiKey();
  if(!key) throw new Error('NO_API_KEY');
  const ai = new GoogleGenAI({ apiKey: key });
  let lastErr;
  for(const model of MODELS){
    try{
      const res = await ai.models.generateContent({
        model,
        contents: promptText,
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      const text = _text(res);
      if(text) return text;
      lastErr = new Error('빈 응답');
    }catch(e){
      lastErr = e;
      const msg = String((e && (e.message || e.status || e)) || '');
      // quota(429)/모델없음(404)이면 다음 모델 시도. 그 외(401 키 오류 등)는 즉시 중단.
      if(/quota|RESOURCE_EXHAUSTED|429|not found|NOT_FOUND|404|unsupported|INVALID_ARGUMENT/i.test(msg)) continue;
      throw e;
    }
  }
  throw lastErr || new Error('모든 모델 호출 실패');
}

