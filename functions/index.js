/* 삼대오백마 — 매일 20:30(KST) 운동 리마인더 푸시
   오늘 기록이 없는(훈련일지 또는 캘린더 부위 미입력) 멤버에게만 알림을 보냄. */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.dailyReminder = onSchedule(
  { schedule: "30 20 * * *", timeZone: "Asia/Seoul" },
  async () => {
    // 오늘 날짜 (KST, YYYY-MM-DD)
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const ymd =
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");

    // 오늘 기록한 사람 모음
    const done = new Set();

    // 1) 훈련일지에 오늘 기록
    const tr = await db.collection("training").where("날짜", "==", ymd).get();
    tr.forEach((d) => { const n = d.data().이름; if (n) done.add(n); });

    // 2) 캘린더 부위 기록 (quotes/{이름}.달력[ymd])
    const q = await db.collection("quotes").get();
    q.forEach((d) => {
      const cal = d.data().달력;
      if (cal && cal[ymd] && cal[ymd].length) done.add(d.id);
    });

    // 토큰 순회 → 오늘 기록 없는 사람만 발송
    const toks = await db.collection("pushTokens").get();
    let sent = 0;
    const stale = [];
    for (const docSnap of toks.docs) {
      const name = docSnap.data().이름;
      if (name && done.has(name)) continue; // 이미 기록함 → 스킵
      try {
        await admin.messaging().send({
          token: docSnap.id,
          data: {
            title: "오늘 운동 기록했나요? 💪",
            body: "훈련일지에 오늘 본세트를 남겨보세요. 매주 강해지는 중! 🔥",
          },
        });
        sent++;
      } catch (e) {
        if (
          e.code === "messaging/registration-token-not-registered" ||
          e.code === "messaging/invalid-registration-token"
        ) {
          stale.push(docSnap.id);
        } else {
          logger.warn("send fail", docSnap.id, e.code || e.message);
        }
      }
    }

    // 무효 토큰 정리
    for (const t of stale) {
      await db.collection("pushTokens").doc(t).delete().catch(() => {});
    }

    logger.info(`dailyReminder: sent=${sent}, stale removed=${stale.length}, date=${ymd}`);
    return null;
  }
);
