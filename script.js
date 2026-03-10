const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxP4oduAufLWfzP1Ytg88M3vJ_x4c0BCbs9asakJ7btzMJC8fgA_hOtExkD8zUiX3VW3Q/exec"; 
let isCooldown = false;

// 1. ฟังก์ชันสุ่มบิงโก (ทำงานในหน้าเดียว ไม่มีการซ่อนหน้า)
async function generateBingo() {
    const username = document.getElementById('username').value;
    if (!username) {
        alert("กรุณาใส่ชื่อก่อนสุ่มนะครับ");
        return;
    }

    // เปลี่ยนข้อความปุ่มระหว่างโหลดให้ดูโปรขึ้น
    const genBtn = document.querySelector('.btn-primary');
    const originalText = genBtn.innerText;
    genBtn.innerText = "Generating...";
    genBtn.disabled = true;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=generate&user=${encodeURIComponent(username)}`);
        const board = await response.json();
        
        if (board && !board.error) {
            renderBoard(board); // วาดตารางลงไปในหน้าเดิม
            console.log("สร้างตารางสำเร็จสำหรับคุณ " + username);
        } else {
            alert("เกิดข้อผิดพลาด: " + (board.error || "ไม่สามารถดึงข้อมูลได้"));
        }
    } catch (err) {
        console.error(err);
        alert("เชื่อมต่อกับ Google ไม่ได้ (Failed to fetch)");
    } finally {
        genBtn.innerText = originalText;
        genBtn.disabled = false;
    }
}

// 2. ฟังก์ชันวาดตารางลงหน้าเว็บ (ไม่เปลี่ยนแปลง)
function renderBoard(board) {
    const container = document.getElementById('bingo-board');
    container.innerHTML = '';
    board.forEach((text, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.id = 'cell-' + index;
        cell.innerText = text;
        // ถ้าเป็นช่องกลาง (JJAZ) ให้มาร์คสีไว้เลย
        if (text === "JJAZ") cell.classList.add('marked', 'center-cell');
        container.appendChild(cell);
    });
}

// 3. ฟังก์ชันปุ่ม Refresh (แบบมี Cooldown 5 วินาที)
async function handleUpdate() {
    if (isCooldown) return;

    const btn = document.getElementById('updateBtn');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const msg = document.getElementById('cooldownMsg');

    btn.disabled = true;
    btnText.innerText = "Refreshing...";
    if(btnIcon) btnIcon.style.animation = "spin 1s linear infinite";

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getEvent`);
        const data = await response.json();

        if (data && data.state) {
            const markedIndices = data.state.split(',');
            markedIndices.forEach(id => {
                const cell = document.getElementById('cell-' + id.trim());
                if (cell) cell.classList.add('marked');
            });
            btnText.innerText = "Updated!";
        }
    } catch (err) {
        btnText.innerText = "Try again";
    }

    // เริ่มระบบหน่วงเวลา (Cooldown)
    isCooldown = true;
    let seconds = 5;
    if(btnIcon) btnIcon.style.animation = "none";

    const timer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(timer);
            isCooldown = false;
            btn.disabled = false;
            btnText.innerText = "Refresh";
            msg.innerText = "";
        } else {
            msg.innerText = `รออีก ${seconds} วินาที`;
        }
    }, 1000);
}

// เพิ่ม CSS สำหรับหมุนไอคอน
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform:rotate(360deg); } }`;
document.head.appendChild(style);
