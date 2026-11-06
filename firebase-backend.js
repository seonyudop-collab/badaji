// 따봉 저장소: Firebase(구글 로그인 + Firestore). 페이지의 따봉 코드가 쓰는 claude.use("db"/"user") 형태로 연결합니다.
import { firebaseConfig } from "./firebase-config.js";
const V = "10.12.2";
const ready = () => dispatchEvent(new Event("bp-backend"));
const off = () => { window.claude = { use: async () => null }; ready(); };
if (!firebaseConfig || !firebaseConfig.projectId || /여기에/.test(firebaseConfig.apiKey || "")) {
  console.warn("firebase-config.js가 아직 설정되지 않아 따봉 기능이 꺼져 있습니다.");
  off();
} else {
  try {
    const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
    const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
    const app = initializeApp(firebaseConfig);
    const auth = A.getAuth(app);
    const fs = F.getFirestore(app);
    let uid = null, first = true; const subs = [];
    const authReady = new Promise(res => A.onAuthStateChanged(auth, u => {
      uid = u ? u.uid : null;
      if (first) { first = false; res(); } else subs.forEach(f => f(uid));
    }));
    const provider = new A.GoogleAuthProvider();
    const user = {
      id: async () => { await authReady; return uid; },
      can: async () => null,
      onChange: f => subs.push(f),
      signIn: async () => {
        try { await A.signInWithPopup(auth, provider); }
        catch (e) { if (e && /popup-blocked|operation-not-supported/.test(e.code || "")) await A.signInWithRedirect(auth, provider); else throw e; }
      },
      signOut: () => A.signOut(auth)
    };
    const db = {
      collection: p => ({ onSnapshot: (next, err) => F.onSnapshot(F.collection(fs, p), next, err) }),
      doc: p => ({
        set: async data => F.setDoc(F.doc(fs, p), data),
        get: async () => { const s = await F.getDoc(F.doc(fs, p)); return { exists: s.exists(), data: () => s.data() }; }
      })
    };
    window.claude = { use: async n => n === "db" ? db : n === "user" ? user : null };
    ready();
  } catch (e) { console.error("Firebase를 불러오지 못했습니다", e); off(); }
}
