const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxP4oduAufLWfzP1Ytg88M3vJ_x4c0BCbs9asakJ7btzMJC8fgA_hOtExkD8zUiX3VW3Q/exec"; // *** อย่าลืมเอา URL เดิมมาใส่ตรงนี้ ***
let isCooldown = false;

// 1. ฟังก์ชันสุ่มบิงโก (สำหรับปุ่ม Generate)
async function generateBingo() {
    const username = document.getElementById('username').value;
    if (!username) {
        alert("กรุณาใส่ชื่อก่อนสุ่มนะครับ");
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=generate&user=${encodeURIComponent(username)}`);
        const board = await response.json();
        
        if (board && !board.error) {
            renderBoard(board); // ฟังก์ชันวาดตาราง
            document.getElementById('setup-section').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
        } else {
            alert("เกิดข้อผิดพลาด: " + (board.error || "ไม่สามารถดึงข้อมูลได้"));
        }
    } catch (err) {
        console.error(err);
        alert("เชื่อมต่อกับ Google ไม่ได้ (Failed to fetch)");
    }
}

// 2. ฟังก์ชันวาดตารางลงหน้าเว็บ
function renderBoard(board) {
    const container = document.getElementById('bingo-board');
    container.innerHTML = '';
    board.forEach((text, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.id = 'cell-' + index;
        cell.innerText = text;
        if (text === "JJAZ") cell.classList.add('marked', 'center-cell');
        container.appendChild(cell);
    });
}

// 3. ฟังก์ชันปุ่มอัปเดต (ที่คุณเพิ่งเพิ่ม)
async function handleUpdate() {
    if (isCooldown) return;

    const btn = document.getElementById('updateBtn');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const msg = document.getElementById('cooldownMsg');

    btn.disabled = true;
    btnText.innerText = "กำลังเช็ค...";
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
            btnText.innerText = "อัปเดตแล้ว!";
        }
    } catch (err) {
        btnText.innerText = "ลองใหม่";
    }

    isCooldown = true;
    let seconds = 5;
    const timer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(timer);
            isCooldown = false;
            btn.disabled = false;
            btnText.innerText = "อัปเดตแต้ม";
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
