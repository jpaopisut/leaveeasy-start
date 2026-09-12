// ─────────────────────────────────────────────────────────────
// js/leave-request-detail.js — หน้าที่ 3 รายละเอียดใบลา
// ต้องล็อกอินก่อนถึงเปิดหน้านี้ได้ (js/auth-guard.js) · ลองดึงจาก Firestore จริงก่อนเสมอ
// (สถานะที่กดอนุมัติ/ไม่อนุมัติเขียนจริง ต้องอ่านจากที่นี่ ไม่งั้นใบตัวอย่างจะโชว์ค่าเก่า
// ค้างจากข้อมูลปลอม) ถ้าไม่เจอ (เช่น ยังไม่ได้ seed ข้อมูล) ค่อย fallback ไปข้อมูลปลอมใน
// js/data.js · ปุ่มอนุมัติ/ไม่อนุมัติ/ลบใบลา เขียนกลับ Firestore จริง · ส่งความเห็น
// ยังแก้แค่ในหน่วยความจำ (ยังไม่เขียนกลับ Firestore — เป็นงานสัปดาห์ที่ 7)
// จำกัดตาม role (ACL.md): พนักงานดูใบของคนอื่นไม่ได้เลย, เห็นปุ่มอนุมัติ/ไม่อนุมัติเฉพาะ
// หัวหน้า/ฝ่ายบุคคล, ปุ่มลบอิงความเป็นเจ้าของ (requesterId) ไม่อิง role — เป็นแค่ UI
// ฝั่งหน้าจอ ยังไม่มี Firestore Security Rules บังคับจริง (งานสัปดาห์ที่ 8)
// ─────────────────────────────────────────────────────────────

import { db } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ต้องล็อกอิน } from "./auth-guard.js";

var โมเดลAI = "google/gemini-2.5-flash-lite";

(async function () {
  var ผู้ใช้ = await ต้องล็อกอิน();
  if (!ผู้ใช้) return;   // ต้องล็อกอิน() ได้ redirect ไปหน้าล็อกอินแล้ว

  var รหัสใบลา = ค่าจากURL("id");
  var กล่องใบลา = document.getElementById("กล่องใบลา");
  var กล่องความเห็น = document.getElementById("กล่องความเห็น");
  var ใบ, ความเห็น;

  // ลองดึงจาก Firestore จริงก่อนเสมอ (เป็นแหล่งข้อมูลจริงตั้งแต่ปุ่มอนุมัติ/ไม่อนุมัติเขียนกลับได้)
  try {
    var เอกสารใบลา = await getDoc(doc(db, "leaveRequests", รหัสใบลา));
    if (เอกสารใบลา.exists()) {
      ใบ = Object.assign({ id: เอกสารใบลา.id }, เอกสารใบลา.data());
      ความเห็น = (await getDocs(collection(db, "leaveRequests", รหัสใบลา, "approvals")))
        .docs.map(function (d) { return Object.assign({ id: d.id, requestId: รหัสใบลา }, d.data()); });
    }
  } catch (err) {
    กล่องใบลา.innerHTML = "<p>เกิดข้อผิดพลาดขณะโหลดข้อมูล: " + esc(err.message) + "</p>";
    return;
  }

  // ไม่เจอใน Firestore (เช่น ยังไม่ได้ seed ข้อมูลตัวอย่าง) → fallback ไปข้อมูลปลอม
  if (!ใบ) {
    ใบ = window.LEAVE_DATA.leaveRequests.find(function (x) { return x.id === รหัสใบลา; });
    ความเห็น = ใบ ? window.LEAVE_DATA.approvals.filter(function (c) { return c.requestId === ใบ.id; }) : [];
  }

  if (!ใบ) {
    กล่องใบลา.innerHTML = "<p>ไม่พบใบขอลาที่ต้องการ — อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>";
    return;
  }

  // พนักงานเปิดดูใบลาของคนอื่นไม่ได้ ตาม ACL.md (หัวหน้า/ฝ่ายบุคคลดูได้ทุกใบ)
  if (ผู้ใช้.role === "employee" && ใบ.requesterId !== ผู้ใช้.uid) {
    กล่องใบลา.innerHTML = "<p>คุณไม่มีสิทธิ์ดูใบลานี้ — เปิดดูใบลาของคนอื่นไม่ได้</p>";
    return;
  }

  วาดใบลา();
  วาดความเห็น();
  กล่องความเห็น.classList.remove("hidden");

  document.getElementById("ปุ่มส่งความเห็น").addEventListener("click", ส่งความเห็น);

  // ── วาดข้อมูลใบลาลงหน้าจอ ──
  function วาดใบลา() {
    var แถว = [
      ["หัวข้อ", esc(ใบ.title)],
      ["เหตุผลการลา", esc(ใบ.reason)],
      ["ประเภทการลา", esc(ใบ.leaveTypeName)],
      ["วันที่ลา", esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate)],
      ["ผู้ขอลา", esc(ใบ.requesterName)],
      ["ผู้อนุมัติ", ใบ.approverName ? esc(ใบ.approverName) : "ยังไม่ได้กำหนดผู้อนุมัติ"],
      ["สถานะ", ป้ายสถานะ(ใบ.status)],
      ["วันที่ยื่น", esc(ใบ.createdAt)]
    ];

    var html = แถว.map(function (r) {
      return '<div class="field-row"><span class="k">' + r[0] + "</span><span>" + r[1] + "</span></div>";
    }).join("");

    // สรุปโดย AI (ถ้าเคยกดสรุปไว้แล้ว) — โชว์ให้ทุกคนที่เปิดดูใบนี้ได้เห็น เหมือนแถวข้อมูลอื่น
    if (ใบ.aiSuggestion) {
      html += '<div class="alert alert-ai"><strong>🤖 สรุปโดย AI:</strong> ' + esc(ใบ.aiSuggestion) + "</div>";
    }

    // อนุมัติ/ไม่อนุมัติ เฉพาะหัวหน้า/ฝ่ายบุคคล (ตาม ACL.md) · ลบใบลา อิงความเป็นเจ้าของ ไม่อิง role
    var ยังรอพิจารณา = ใบ.status === "รอพิจารณา";
    var เปลี่ยนสถานะได้ = ยังรอพิจารณา && (ผู้ใช้.role === "manager" || ผู้ใช้.role === "hr");
    var ลบได้ = ยังรอพิจารณา && ใบ.requesterId === ผู้ใช้.uid;

    if (เปลี่ยนสถานะได้ || ลบได้) {
      html += '<div class="btn-row">';
      if (เปลี่ยนสถานะได้) {
        html +=
          '<button type="button" class="btn-ok" id="ปุ่มอนุมัติ">อนุมัติ</button>' +
          '<button type="button" class="btn-danger" id="ปุ่มไม่อนุมัติ">ไม่อนุมัติ</button>' +
          '<button type="button" class="btn-ghost" id="ปุ่มสรุปAI">🤖 ' + (ใบ.aiSuggestion ? "สรุปใหม่อีกครั้ง" : "ให้ AI ช่วยสรุป") + "</button>";
      }
      if (ลบได้) {
        html += '<button type="button" class="btn-danger" id="ปุ่มลบใบลา">ลบใบลา</button>';
      }
      html += "</div>";
    } else if (ยังรอพิจารณา) {
      html += '<p class="hint">ใบนี้ยังรอพิจารณาอยู่</p>';
    } else {
      html += '<p class="hint">ใบนี้พิจารณาแล้ว จึงเปลี่ยนสถานะต่อไม่ได้</p>';
    }

    if (เปลี่ยนสถานะได้) {
      html += '<div id="ผลลัพธ์สรุปAI" class="hidden"></div>';
    }

    กล่องใบลา.innerHTML = html;

    if (เปลี่ยนสถานะได้) {
      document.getElementById("ปุ่มอนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("อนุมัติ"); });
      document.getElementById("ปุ่มไม่อนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("ไม่อนุมัติ"); });
      document.getElementById("ปุ่มสรุปAI").addEventListener("click", สรุปด้วยAI);
    }
    if (ลบได้) {
      document.getElementById("ปุ่มลบใบลา").addEventListener("click", ลบใบลา);
    }
  }

  // ── สรุปใบลาด้วย AI ให้หัวหน้าอ่านก่อนอนุมัติ (เขียน field aiSuggestion กลับ Firestore) ──
  function สรุปด้วยAI() {
    var ปุ่ม = document.getElementById("ปุ่มสรุปAI");
    var กล่องผล = document.getElementById("ผลลัพธ์สรุปAI");

    var คีย์ = window.OPENROUTER_API_KEY;
    if (!คีย์) {
      แสดงผลสรุป("error", "ยังไม่ได้ตั้งค่าคีย์ OpenRouter — สร้างไฟล์ js/ai-config.local.js ก่อน (ดู .gitignore)");
      return;
    }

    var ข้อความปุ่มปกติ = ปุ่ม.textContent;
    ปุ่ม.disabled = true;
    ปุ่ม.textContent = "กำลังสรุป...";
    แสดงผลสรุป(null, "");

    var inputข้อความ = "ผู้ขอลา: " + ใบ.requesterName + "\n" +
      "ประเภทการลา: " + ใบ.leaveTypeName + "\n" +
      "ช่วงวันที่: " + ใบ.startDate + " ถึง " + ใบ.endDate + "\n" +
      "หัวข้อ: " + ใบ.title + "\n" +
      "เหตุผล: " + ใบ.reason;

    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + คีย์,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: โมเดลAI,
        messages: [
          {
            role: "system",
            content: "คุณช่วยสรุปใบลาให้หัวหน้าอ่านก่อนตัดสินใจอนุมัติ ตอบเป็นภาษาไทย 1-2 ประโยคสั้น ๆ กระชับ " +
              "บอกว่าใครลา ลาประเภทไหน ช่วงไหน เพราะอะไร ห้ามใส่คำนำหรือคำลงท้าย ตอบแต่เนื้อหาสรุปเท่านั้น"
          },
          { role: "user", content: inputข้อความ }
        ]
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (ผลลัพธ์) {
        if (!ผลลัพธ์.ok) {
          var ข้อความ = (ผลลัพธ์.data && ผลลัพธ์.data.error && ผลลัพธ์.data.error.message) || ("HTTP " + ผลลัพธ์.status);
          บันทึกล็อก(inputข้อความ, "(เรียกไม่สำเร็จ) " + ข้อความ);
          แสดงผลสรุป("error", "เรียก AI ไม่สำเร็จ: " + ข้อความ);
          คืนปุ่ม();
          return;
        }

        var สรุป = ((ผลลัพธ์.data.choices && ผลลัพธ์.data.choices[0] && ผลลัพธ์.data.choices[0].message.content) || "").trim();
        if (!สรุป) {
          บันทึกล็อก(inputข้อความ, "(ไม่มีข้อความตอบกลับ)");
          แสดงผลสรุป("error", "AI ไม่ได้ตอบข้อความกลับมา ลองใหม่อีกครั้ง");
          คืนปุ่ม();
          return;
        }

        บันทึกล็อก(inputข้อความ, สรุป);

        // อัปเดตสำเร็จ: วาดใบลา() ใหม่จะสร้างปุ่มขึ้นมาแทนพร้อมข้อความที่ถูกต้องอยู่แล้ว
        // (ไม่ต้อง คืนปุ่ม() ตรงนี้ ไม่งั้นจะไปทับข้อความปุ่มเดิมที่ วาดใบลา() เพิ่งตั้งใหม่)
        return updateDoc(doc(db, "leaveRequests", ใบ.id), { aiSuggestion: สรุป })
          .then(function () {
            ใบ.aiSuggestion = สรุป;
            วาดใบลา();
          })
          .catch(function (err) {
            แสดงผลสรุป("error", "บันทึกสรุปไม่สำเร็จ: " + err.message);
            คืนปุ่ม();
          });
      })
      .catch(function (err) {
        บันทึกล็อก(inputข้อความ, "(เรียกไม่สำเร็จ) " + err.message);
        แสดงผลสรุป("error", "เกิดข้อผิดพลาด: " + err.message);
        คืนปุ่ม();
      });

    // บันทึกทุกครั้งที่เรียก AI ไม่ว่าจะสำเร็จหรือไม่ — เป็น audit log แยกจากการเขียน aiSuggestion
    // เขียนแบบ fire-and-forget ไม่บล็อก UI หลัก ถ้าบันทึกล็อกไม่สำเร็จก็แค่เตือนใน console
    function บันทึกล็อก(input, output) {
      addDoc(collection(db, "leaveRequests", ใบ.id, "aiLog"), {
        input: input,
        output: output,
        createdAt: เวลาตอนนี้()
      }).catch(function (err) {
        console.warn("บันทึก aiLog ไม่สำเร็จ:", err.message);
      });
    }

    function คืนปุ่ม() {
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = ข้อความปุ่มปกติ;
    }

    function แสดงผลสรุป(ประเภท, ข้อความ) {
      if (!ข้อความ) {
        กล่องผล.classList.add("hidden");
        กล่องผล.textContent = "";
        return;
      }
      กล่องผล.className = "alert " + (ประเภท === "error" ? "alert-error" : "alert-ai");
      กล่องผล.textContent = ข้อความ;
    }
  }

  // ── เปลี่ยนสถานะ (เขียนกลับ Firestore จริง แก้เฉพาะ field status) ──
  function เปลี่ยนสถานะ(สถานะใหม่) {
    // กฎ: จะไม่อนุมัติได้ ต้องมีความเห็นอย่างน้อย 1 รายการก่อน
    if (สถานะใหม่ === "ไม่อนุมัติ" && ความเห็น.length === 0) {
      alert("ต้องเขียนความเห็นอย่างน้อย 1 รายการก่อน จึงจะกดไม่อนุมัติได้");
      return;
    }

    var ปุ่มอนุมัติ = document.getElementById("ปุ่มอนุมัติ");
    var ปุ่มไม่อนุมัติ = document.getElementById("ปุ่มไม่อนุมัติ");
    if (ปุ่มอนุมัติ) ปุ่มอนุมัติ.disabled = true;
    if (ปุ่มไม่อนุมัติ) ปุ่มไม่อนุมัติ.disabled = true;

    // updateDoc แก้เฉพาะ field ที่ระบุ (status) เท่านั้น ไม่แตะ field อื่นในเอกสารเดิม
    updateDoc(doc(db, "leaveRequests", ใบ.id), { status: สถานะใหม่ })
      .then(function () {
        ใบ.status = สถานะใหม่;
        วาดใบลา();
      })
      .catch(function (err) {
        alert("บันทึกสถานะไม่สำเร็จ ลองใหม่อีกครั้ง (" + err.message + ")");
        วาดใบลา();
      });
  }

  // ── ลบใบลา (ต้องยืนยันก่อนทุกครั้ง · ลบได้เฉพาะใบที่ยังรอพิจารณา) ──
  function ลบใบลา() {
    if (!confirm('ยืนยันการลบใบลา "' + ใบ.title + '" หรือไม่')) return;

    var ปุ่มอนุมัติ = document.getElementById("ปุ่มอนุมัติ");
    var ปุ่มไม่อนุมัติ = document.getElementById("ปุ่มไม่อนุมัติ");
    var ปุ่มลบ = document.getElementById("ปุ่มลบใบลา");
    if (ปุ่มอนุมัติ) ปุ่มอนุมัติ.disabled = true;
    if (ปุ่มไม่อนุมัติ) ปุ่มไม่อนุมัติ.disabled = true;
    if (ปุ่มลบ) ปุ่มลบ.disabled = true;

    deleteDoc(doc(db, "leaveRequests", ใบ.id))
      .then(function () {
        location.href = "leave-requests.html";
      })
      .catch(function (err) {
        alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง (" + err.message + ")");
        วาดใบลา();
      });
  }

  // ── รายการความเห็น เรียงจากเก่าไปใหม่ ──
  function วาดความเห็น() {
    var ที่วาง = document.getElementById("รายการความเห็น");
    if (ความเห็น.length === 0) {
      ที่วาง.innerHTML = "<p>ยังไม่มีความเห็นในใบนี้</p>";
      return;
    }
    ที่วาง.innerHTML = ความเห็น
      .slice()
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; })
      .map(function (c) {
        return '<div class="comment"><div class="meta">' + esc(c.authorName) + " · " + esc(c.createdAt) +
               "</div><div>" + esc(c.message) + "</div></div>";
      }).join("");
  }

  // ── ส่งความเห็นใหม่ ──
  function ส่งความเห็น() {
    var ช่อง = document.getElementById("ข้อความความเห็น");
    var เตือน = document.getElementById("เตือนความเห็น");
    var ข้อความ = ช่อง.value.trim();

    if (!ข้อความ) {
      เตือน.textContent = "⚠️ พิมพ์ข้อความก่อน จึงจะส่งความเห็นได้";
      เตือน.classList.remove("hidden");
      return;
    }
    เตือน.classList.add("hidden");

    ความเห็น.push({
      id: "ap-ใหม่-" + Date.now(),
      requestId: ใบ.id,
      authorId: ผู้ใช้.uid, authorName: ผู้ใช้.name,
      message: ข้อความ,
      createdAt: เวลาตอนนี้()
    });
    ช่อง.value = "";
    วาดความเห็น();
  }
})();
