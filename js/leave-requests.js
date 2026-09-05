// ─────────────────────────────────────────────────────────────
// js/leave-requests.js — หน้าที่ 1 รายการใบลา
// สัปดาห์ที่ 6-7: อ่านจากฐานข้อมูลจริง (Firestore) แทนข้อมูลปลอมใน js/data.js
// ต้องล็อกอินก่อนถึงเปิดหน้านี้ได้ (js/auth-guard.js)
// ─────────────────────────────────────────────────────────────

import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ต้องล็อกอิน } from "./auth-guard.js";

(async function () {
  var ผู้ใช้ = await ต้องล็อกอิน();
  if (!ผู้ใช้) return;   // ต้องล็อกอิน() ได้ redirect ไปหน้าล็อกอินแล้ว

  var กล่อง = document.getElementById("ผลลัพธ์");

  // ชื่อไฟล์ (doc.id) บน Firestore คือ id ของใบลา ไม่ได้เก็บซ้ำเป็น field ข้างใน
  var ใบลาทั้งหมด = (await getDocs(collection(db, "leaveRequests")))
    .docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); });

  // พนักงานเห็นเฉพาะใบของตัวเอง ตาม ACL.md — หัวหน้า/ฝ่ายบุคคลเห็นทุกใบ
  if (ผู้ใช้.role === "employee") {
    ใบลาทั้งหมด = ใบลาทั้งหมด.filter(function (ใบ) { return ใบ.requesterId === ผู้ใช้.uid; });
  }

  // ถ้ามีสถานะติดมาท้าย URL ให้กรองเฉพาะสถานะนั้น
  var สถานะที่กรอง = ค่าจากURL("status");
  if (สถานะที่กรอง) {
    ใบลาทั้งหมด = ใบลาทั้งหมด.filter(function (ใบ) { return ใบ.status === สถานะที่กรอง; });
    document.querySelector(".subtitle").textContent =
      "กำลังแสดงเฉพาะใบลาที่สถานะ " + สถานะที่กรอง + " · กดเมนู รายการใบลา เพื่อดูทั้งหมด";
  }

  แสดงตาราง(ใบลาทั้งหมด);

  function แสดงตาราง(รายการ) {
    if (รายการ.length === 0) {
      กล่อง.innerHTML = "<p>ยังไม่มีใบขอลาในระบบ</p>";
      return;
    }

    var html =
      "<table><thead><tr>" +
      "<th>หัวข้อ</th>" +
      "<th>ประเภทการลา</th>" +
      "<th>สถานะ</th>" +
      '<th class="hide-mobile">ผู้ขอลา</th>' +
      '<th class="hide-mobile">วันที่ลา</th>' +
      "</tr></thead><tbody>";

    รายการ.forEach(function (ใบ) {
      html +=
        '<tr class="clickable" data-id="' + esc(ใบ.id) + '">' +
        "<td>" + esc(ใบ.title) + "</td>" +
        "<td>" + esc(ใบ.leaveTypeName) + "</td>" +
        "<td>" + ป้ายสถานะ(ใบ.status) + "</td>" +
        '<td class="hide-mobile">' + esc(ใบ.requesterName) + "</td>" +
        '<td class="hide-mobile">' + esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate) + "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    กล่อง.innerHTML = html;

    // กดที่แถวไหน ไปหน้ารายละเอียดของใบนั้น
    กล่อง.querySelectorAll("tr.clickable").forEach(function (แถว) {
      แถว.addEventListener("click", function () {
        location.href = "leave-request-detail.html?id=" + แถว.dataset.id;
      });
    });
  }
})();
