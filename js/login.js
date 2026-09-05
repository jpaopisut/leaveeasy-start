// ─────────────────────────────────────────────────────────────
// js/login.js — หน้าเข้าสู่ระบบ (email/password ผ่าน Firebase Authentication)
// ─────────────────────────────────────────────────────────────

import { auth } from "./firebase-init.js";
import { onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { ข้อความผิดพลาดล็อกอิน } from "./auth-guard.js";

(function () {
  var ฟอร์ม = document.getElementById("ฟอร์มล็อกอิน");
  var กล่องเตือน = document.getElementById("ข้อความเตือน");
  var ปุ่มเข้าสู่ระบบ = document.getElementById("ปุ่มเข้าสู่ระบบ");

  // ล็อกอินอยู่แล้ว แต่ดันเปิดหน้านี้ซ้ำ → พาไปหน้าหลักทันที ไม่ต้องกรอกฟอร์มซ้ำ
  onAuthStateChanged(auth, function (user) {
    if (user) location.href = "leave-requests.html";
  });

  ฟอร์ม.addEventListener("submit", function (e) {
    e.preventDefault();
    var อีเมล = document.getElementById("email").value.trim();
    var รหัสผ่าน = document.getElementById("password").value;

    if (!อีเมล || !รหัสผ่าน) {
      เตือน("กรอกอีเมลและรหัสผ่านให้ครบก่อน");
      return;
    }

    ปุ่มเข้าสู่ระบบ.disabled = true;
    signInWithEmailAndPassword(auth, อีเมล, รหัสผ่าน)
      .then(function () {
        location.href = "leave-requests.html";
      })
      .catch(function (err) {
        ปุ่มเข้าสู่ระบบ.disabled = false;
        เตือน(ข้อความผิดพลาดล็อกอิน(err));
      });
  });

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    กล่องเตือน.classList.remove("hidden");
  }
})();
