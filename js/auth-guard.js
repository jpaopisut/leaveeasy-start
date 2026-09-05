// ─────────────────────────────────────────────────────────────
// js/auth-guard.js — จุดเดียวที่ทุกหน้าที่ "ต้องล็อกอินก่อน" เรียกใช้
// หน้าไหนต้องล็อกอินก่อนถึงจะใช้ได้ ให้เรียก await ต้องล็อกอิน() เป็นบรรทัดแรกสุด
// ─────────────────────────────────────────────────────────────

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// รอผลล็อกอินครั้งแรก (ตอนเปิดหน้า Firebase ยังไม่รู้ทันทีว่าล็อกอินอยู่ไหม ต้องรอ callback นี้ก่อน)
// คืนค่า Firebase user object ดิบๆ หรือ null ถ้าไม่ได้ล็อกอิน
function รอผู้ใช้() {
  return new Promise(function (resolve) {
    var เลิกฟัง = onAuthStateChanged(auth, function (user) {
      เลิกฟัง();
      resolve(user);
    });
  });
}

// แปลง Firebase user → โปรไฟล์ที่ทุกหน้าใช้ {uid, email, name, role} (อ่าน users/{uid} เพิ่ม)
async function ดึงโปรไฟล์(user) {
  var โปรไฟล์ = await getDoc(doc(db, "users", user.uid));
  var ข้อมูล = โปรไฟล์.exists() ? โปรไฟล์.data() : {};
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName || ข้อมูล.name || user.email,
    role: ข้อมูล.role || "employee"
  };
}

// ไม่ได้ล็อกอิน → เด้งไปหน้าล็อกอินแล้วคืนค่า null · ล็อกอินอยู่ → คืน {uid, name, role, email}
export async function ต้องล็อกอิน() {
  var user = await รอผู้ใช้();
  if (!user) {
    location.href = "login.html";
    return null;
  }
  return ดึงโปรไฟล์(user);
}

// เหมือน ต้องล็อกอิน() แต่ไม่ redirect — ใช้ในหน้าที่เปิดได้แม้ไม่ล็อกอิน (เช่น nav-user.js)
export async function ผู้ใช้ปัจจุบัน() {
  var user = await รอผู้ใช้();
  return user ? ดึงโปรไฟล์(user) : null;
}

export function ออกจากระบบ() {
  return signOut(auth).then(function () {
    location.href = "login.html";
  });
}

// แปล error code ของ Firebase Auth เป็นข้อความไทยที่อ่านเข้าใจ
export function ข้อความผิดพลาดล็อกอิน(err) {
  var แผนที่ = {
    "auth/email-already-in-use": "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน",
    "auth/weak-password": "รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย 6 ตัวอักษร",
    "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/user-not-found": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/wrong-password": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/too-many-requests": "ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"
  };
  return แผนที่[err.code] || ("เกิดข้อผิดพลาด (" + err.message + ")");
}
