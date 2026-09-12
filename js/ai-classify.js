// ─────────────────────────────────────────────────────────────
// js/ai-classify.js — ปุ่ม "ให้ AI ช่วยจัดประเภทการลา" ในหน้ายื่นใบลาใหม่
// สัปดาห์ 8: อ่านเหตุผล + รายชื่อประเภทการลาที่มีจริง ส่งให้ OpenRouter
// เลือกประเภทที่ตรงที่สุดให้อัตโนมัติ (ผู้ใช้ยังแก้เองได้เสมอ)
// ต้องมี js/ai-config.local.js (ไฟล์ local ไม่ commit ขึ้น Git) ประกาศ
// window.OPENROUTER_API_KEY ไว้ก่อน ไม่งั้นปุ่มจะแจ้งเตือนแทนการเรียก API
// ─────────────────────────────────────────────────────────────

(function () {
  var MODEL = "google/gemini-2.5-flash-lite";

  document.addEventListener("DOMContentLoaded", function () {
    var ปุ่ม = document.getElementById("ปุ่มจัดประเภทAI");
    var กล่องผล = document.getElementById("ผลลัพธ์AI");
    var ช่องเหตุผล = document.getElementById("reason");
    var ช่องประเภท = document.getElementById("leaveTypeId");

    if (!ปุ่ม) return;

    var ข้อความปุ่มปกติ = ปุ่ม.textContent;

    ปุ่ม.addEventListener("click", function () {
      var เหตุผล = ช่องเหตุผล.value.trim();
      if (!เหตุผล) {
        แสดงผล("error", "กรอกเหตุผลการลาก่อน ถึงจะให้ AI ช่วยจัดประเภทได้");
        return;
      }

      var คีย์ = window.OPENROUTER_API_KEY;
      if (!คีย์) {
        แสดงผล("error", "ยังไม่ได้ตั้งค่าคีย์ OpenRouter — สร้างไฟล์ js/ai-config.local.js ก่อน (ดู .gitignore)");
        return;
      }

      var รายชื่อประเภท = window.LEAVE_DATA.leaveTypes.map(function (t) { return t.name; });

      ปุ่ม.disabled = true;
      ปุ่ม.textContent = "กำลังคิด...";
      แสดงผล(null, "");

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + คีย์,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: "ตอบกลับด้วยชื่อประเภทการลาที่ตรงกับเหตุผลของผู้ใช้มากที่สุด " +
                "โดยเลือกจากรายการนี้เท่านั้น: " + รายชื่อประเภท.join(", ") + " " +
                "ห้ามตอบคำอื่นนอกจากชื่อประเภทที่เลือกคำเดียว ห้ามมีเครื่องหมายวรรคตอนหรือคำอธิบายเพิ่ม"
            },
            { role: "user", content: เหตุผล }
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
            แสดงผล("error", "เรียก AI ไม่สำเร็จ: " + ข้อความ);
            return;
          }

          var คำตอบดิบ = (ผลลัพธ์.data.choices && ผลลัพธ์.data.choices[0] && ผลลัพธ์.data.choices[0].message.content) || "";
          var คำตอบตัด = คำตอบดิบ.trim();

          var ที่ตรงกัน = window.LEAVE_DATA.leaveTypes.find(function (t) {
            return t.name.trim().toLowerCase() === คำตอบตัด.toLowerCase();
          });

          if (!ที่ตรงกัน) {
            แสดงผล("error", "AI ตอบว่า \"" + คำตอบตัด + "\" ซึ่งไม่ตรงกับประเภทที่มี — กรุณาเลือกเองด้านล่าง");
            return;
          }

          ช่องประเภท.value = ที่ตรงกัน.id;
          แสดงผล("ai", "🤖 AI เลือกให้: " + ที่ตรงกัน.name + " (เปลี่ยนเองได้ถ้าไม่ตรง)");
        })
        .catch(function (err) {
          แสดงผล("error", "เกิดข้อผิดพลาด: " + err.message);
        })
        .finally(function () {
          ปุ่ม.disabled = false;
          ปุ่ม.textContent = ข้อความปุ่มปกติ;
        });
    });

    function แสดงผล(ประเภท, ข้อความ) {
      if (!ข้อความ) {
        กล่องผล.classList.add("hidden");
        กล่องผล.textContent = "";
        return;
      }
      กล่องผล.className = "alert " + (ประเภท === "error" ? "alert-error" : "alert-ai");
      กล่องผล.textContent = ข้อความ;
    }
  });
})();
