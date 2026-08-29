// ─────────────────────────────────────────────────────────────
// js/firebase-init.js — จุดเชื่อมต่อ Firestore จุดเดียวของทั้งเว็บ
// หน้าไหนอยากคุยกับ Firestore ให้ import { db } จากไฟล์นี้
//
// ⚠️ apiKey ด้านล่างไม่ใช่ความลับแบบรหัสผ่าน — ตัวที่ปกป้องข้อมูลจริง
// คือ Security Rules บน Firebase Console ไม่ใช่การซ่อนค่านี้
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSMHGdv1T7P7UG3jOOw7lqOfRqKiApBt8",
  authDomain: "leaveeasy-jakrapan.firebaseapp.com",
  projectId: "leaveeasy-jakrapan",
  storageBucket: "leaveeasy-jakrapan.firebasestorage.app",
  messagingSenderId: "616980842687",
  appId: "1:616980842687:web:8fa2ba10e27f4380ee5e0a",
  measurementId: "G-LRCLQQB0X7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
