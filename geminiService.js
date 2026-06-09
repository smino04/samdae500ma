// geminiService.js
// Gemini API 통신 전용 모듈. (UI/Firestore 로직과 분리)
// 이 파일은 index.html에서 "필요할 때만" 동적 import 되므로,
// SDK CDN 로딩에 실패해도 앱 전체가 멈추지 않는다.
import { GoogleGenAI } from "https://esm.run/@google/genai";

// 1.5-flash는 단계적 종료 예정이라 현재 무료 티어에서 안정적인 2.0-flash 사용(필요시 변경).
const MODEL = "gemini-2.0-flash";

// 시스템 프롬프트(코치 페르소나) — 실명 사용 금지 등 보안 지침 포함
const SYSTEM_INSTRUCTION = `너는 군부대 맞춤형 AI 보디빌딩 코치야. 유저를 '은수.S' 같은 닉네임으로만 부르고 실명은 절대 쓰지 마.
유저가 급식표(메뉴)를 주면 벌크업/커팅 목표에 맞춰 식판 기준 양 조절(식판 전략)을 해주고, 부족한 영양소는 PX 물품(닭가슴살 캔, 프로틴 음료, 구운란 등)으로 추천해줘야 해. 컨디션(1-5)에 따른 운동 강도 조절 팁도 필수야. 답변은 항상 깔끔한 마크다운 양식으로 해줘.`;

// localStorage 기반 API 키 관리
export function getApiKey(){ return localStorage.getItem('gemini_api_key') || ''; }
export function setApiKey(key){ localStorage.setItem('gemini_api_key', (key||'').trim()); }
export function hasApiKey(){ return !!getApiKey(); }

// 코치 피드백 받기 — promptText(유저 입력 요약)를 보내고 마크다운 텍스트를 반환
export async function getCoachFeedback(promptText){
  const key = getApiKey();
  if(!key) throw new Error('NO_API_KEY');
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: promptText,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  const text = (res && (typeof res.text === 'string' ? res.text : (res.text && res.text()))) || '';
  if(!text) throw new Error('빈 응답을 받았습니다.');
  return text;
}
