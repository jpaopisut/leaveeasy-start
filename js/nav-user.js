// ─────────────────────────────────────────────────────────────
// js/nav-user.js — เติมช่อง #navUser ที่ js/nav.js เตรียมไว้ ด้วยสถานะล็อกอินจริง
// และซ่อนเมนู "ประเภทการลา" จากคนที่ไม่ใช่ฝ่ายบุคคล (hr) ตาม ACL.md
// ไม่แก้ js/nav.js เลย เพิ่มไฟล์นี้แยกเป็น module เพราะต้องคุยกับ Firebase Auth
// ─────────────────────────────────────────────────────────────

import { ผู้ใช้ปัจจุบัน, ออกจากระบบ } from "./auth-guard.js";

(async function () {
  var ผู้ใช้ = await ผู้ใช้ปัจจุบัน();

  var ช่อง = document.getElementById("navUser");
  if (ช่อง) {
    if (ผู้ใช้) {
      ช่อง.innerHTML =
        "สวัสดี, " + esc(ผู้ใช้.name) + " " +
        '<button type="button" class="btn-ghost" id="ปุ่มออกจากระบบ">ออกจากระบบ</button>';
      document.getElementById("ปุ่มออกจากระบบ").addEventListener("click", ออกจากระบบ);
    } else {
      ช่อง.innerHTML = '<a href="login.html">เข้าสู่ระบบ</a> · <a href="signup.html">สมัครสมาชิก</a>';
    }
  }

  // ซ่อนเมนู "ประเภทการลา" ถ้าไม่ใช่ฝ่ายบุคคล (หรือยังไม่ได้ล็อกอิน)
  var ลิงก์ประเภท = document.querySelector('.navbar a[href="leave-types.html"]');
  if (ลิงก์ประเภท && (!ผู้ใช้ || ผู้ใช้.role !== "hr")) ลิงก์ประเภท.remove();
})();
