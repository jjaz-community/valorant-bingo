async function handleUpdate() {
    if (isCooldown) return; // ถ้าติด Cooldown อยู่ ไม่ให้ทำงาน

    const btn = document.getElementById('updateBtn');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const msg = document.getElementById('cooldownMsg');

    // 1. เริ่มสถานะโหลด
    btn.disabled = true;
    btnText.innerText = "กำลังเช็คข้อมูล...";
    btnIcon.style.display = "inline-block";
    btnIcon.style.animation = "spin 1s linear infinite";

    try {
        // 2. ดึงข้อมูลจาก Apps Script
        const response = await fetch(`${SCRIPT_URL}?action=getEvent`);
        const data = await response.json();

        if (data && data.state) {
            // --- ส่วนสำคัญ: มาร์คแต้มบนตาราง ---
            // สมมติว่าใน data.state เก็บช่องที่มาร์คไว้ เช่น "1,5,10"
            const markedCells = data.state.split(','); 
            markedCells.forEach(id => {
                const cell = document.getElementById('cell-' + id);
                if (cell) cell.classList.add('marked'); // เพิ่ม Class ที่ทำให้ช่องเปลี่ยนสี
            });
            // -------------------------------
            
            console.log("อัปเดตข้อมูลสำเร็จ!");
            btnText.innerText = "อัปเดตสำเร็จ!";
        }
    } catch (err) {
        console.error("Fetch error:", err);
        btnText.innerText = "การเชื่อมต่อขัดข้อง";
    }

    // 3. เริ่มนับถอยหลัง Cooldown 5 วินาที
    isCooldown = true;
    let seconds = 5;
    btnIcon.style.animation = "none";

    const timer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(timer);
            isCooldown = false;
            btn.disabled = false;
            btnText.innerText = "อัปเดตแต้ม";
            msg.innerText = "";
        } else {
            msg.innerText = `รออีก ${seconds} วินาทีเพื่อกดใหม่`;
        }
    }, 1000);
}

// เพิ่ม CSS สำหรับหมุนไอคอน
if (!document.getElementById('spin-style')) {
    const style = document.createElement('style');
    style.id = 'spin-style';
    style.innerHTML = `@keyframes spin { 100% { transform:rotate(360deg); } }`;
    document.head.appendChild(style);
}
