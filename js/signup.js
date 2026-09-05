// ─────────────────────────────────────────────────────────────
// js/signup.js — หน้าสมัครสมาชิก (email/password ผ่าน Firebase Authentication)
// สมัครสำเร็จ → สร้างไฟล์ใน users/{uid} ด้วย role เริ่มต้นเป็น employee เสมอ
// ─────────────────────────────────────────────────────────────

import { auth, db } from "./firebase-init.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ข้อความผิดพลาดล็อกอิน } from "./auth-guard.js";

(function () {
  var ฟอร์ม = document.getElementById("ฟอร์มสมัครสมาชิก");
  var กล่องเตือน = document.getElementById("ข้อความเตือน");
  var ปุ่มสมัครสมาชิก = document.getElementById("ปุ่มสมัครสมาชิก");

  ฟอร์ม.addEventListener("submit", function (e) {
    e.preventDefault();
    var ชื่อ = document.getElementById("name").value.trim();
    var อีเมล = document.getElementById("email").value.trim();
    var รหัสผ่าน = document.getElementById("password").value;

    if (!ชื่อ || !อีเมล || !รหัสผ่าน) {
      เตือน("กรอกให้ครบทุกช่องก่อน");
      return;
    }

    ปุ่มสมัครสมาชิก.disabled = true;
    createUserWithEmailAndPassword(auth, อีเมล, รหัสผ่าน)
      .then(function (ผลลัพธ์) {
        var ผู้ใช้ = ผลลัพธ์.user;
        return updateProfile(ผู้ใช้, { displayName: ชื่อ })
          .then(function () {
            // role เริ่มต้นเป็น employee เสมอ ตาม spec — ผู้ใช้แก้เองไม่ได้ตอนสมัคร
            return setDoc(doc(db, "users", ผู้ใช้.uid), { name: ชื่อ, email: อีเมล, role: "employee" });
          });
      })
      .then(function () {
        location.href = "leave-requests.html";
      })
      .catch(function (err) {
        ปุ่มสมัครสมาชิก.disabled = false;
        เตือน(ข้อความผิดพลาดล็อกอิน(err));
      });
  });

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    กล่องเตือน.classList.remove("hidden");
  }
})();
