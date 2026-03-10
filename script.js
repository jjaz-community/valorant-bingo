const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxP4oduAufLWfzP1Ytg88M3vJ_x4c0BCbs9asakJ7btzMJC8fgA_hOtExkD8zUiX3VW3Q/exec"; 
let isCooldown = false;
let hasBingoed = false; // ป้องกันพลุแตกซ้ำซ้อนถ้าบิงโกไปแล้ว

// 1. ฟังก์ชันสุ่มบิงโก
async function generateBingo() {
    const username = document.getElementById('username').value;
    if (!username) {
        alert("กรุณาใส่ชื่อก่อนสุ่มนะครับ");
        return;
    }
    hasBingoed = false; // รีเซ็ตสถานะบิงโกเมื่อเริ่มเกมใหม่

    const genBtn = document.querySelector('.btn-primary');
    const originalText = genBtn.innerText;
    genBtn.innerText = "Generating...";
    genBtn.disabled = true;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=generate&user=${encodeURIComponent(username)}`);
        const board = await response.json();
        
        if (board && !board.error) {
            renderBoard(board);
            console.log("สร้างตารางสำเร็จสำหรับคุณ " + username);
        } else {
            alert("เกิดข้อผิดพลาด: " + (board.error || "ไม่สามารถดึงข้อมูลได้"));
        }
    } catch (err) {
        console.error(err);
        alert("เชื่อมต่อกับ Google ไม่ได้");
    } finally {
        genBtn.innerText = originalText;
        genBtn.disabled = false;
    }
}

// ฟังก์ชันส่งข้อมูลไปบันทึกที่ Google Sheets (สำหรับ Host)
async function saveEvent(index) {
    try {
        await fetch(`${SCRIPT_URL}?action=mark&id=${index}`);
        console.log("Sync ข้อมูลช่องที่ " + index + " สำเร็จ");
    } catch (err) {
        console.error("บันทึกไม่สำเร็จ:", err);
    }
}

// 2. ฟังก์ชันวาดตาราง (ล็อคสิทธิ์ JJAZ420)
function renderBoard(board) {
    const container = document.getElementById('bingo-board');
    container.innerHTML = '';
    const currentUsername = document.getElementById('username').value;

    board.forEach((text, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.innerText = text;
        cell.id = 'cell-' + index;

        if (text === "JJAZ") {
            cell.classList.add('marked', 'special-jjaz');
        }

        cell.onclick = function() {
            // ล็อคให้เฉพาะ JJAZ420 เป็นคนคุมเกม (Host)
            if (currentUsername === "JJAZ420") {
                if (text !== "JJAZ") {
                    this.classList.toggle('marked');
                    saveEvent(index); // ส่งข้อมูลไปบันทึก/ลบ ใน Google Sheets
                    checkBingo();
                }
            } else {
                console.log("Waiting for host (JJAZ420) to mark...");
            }
        };

        container.appendChild(cell);
    });
}

// 3. ฟังก์ชัน Refresh (ดึงข้อมูลล่าสุดและเช็ค Unmark)
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

        if (data && data.state !== undefined) {
            // --- ล้างเครื่องหมายเก่าออกก่อน (ยกเว้นช่องกลาง) เพื่อรองรับการ Unmark ---
            const allCells = document.querySelectorAll('.bingo-cell');
            allCells.forEach(c => {
                if (!c.classList.contains('special-jjaz')) {
                    c.classList.remove('marked');
                }
            });

            // ติ๊กช่องตามข้อมูลใหม่จาก Google Sheets
            if (data.state !== "") {
                const markedIndices = data.state.split(',');
                markedIndices.forEach(id => {
                    const cell = document.getElementById('cell-' + id.trim());
                    if (cell) cell.classList.add('marked');
                });
            }
            
            checkBingo(); // เช็คบิงโกหลังจากอัปเดตข้อมูลใหม่
            btnText.innerText = "Updated!";
        }
    } catch (err) {
        btnText.innerText = "Try again";
        console.error(err);
    }

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

// 4. ฟังก์ชันเช็คการบิงโก
function checkBingo() {
    const cells = document.querySelectorAll('.bingo-cell');
    if (cells.length === 0 || hasBingoed) return; 

    const size = 5;
    let grid = [];
    
    for (let i = 0; i < size; i++) {
        grid[i] = [];
        for (let j = 0; j < size; j++) {
            grid[i][j] = cells[i * size + j].classList.contains('marked');
        }
    }

    let isBingo = false;

    // เช็คแนวนอนและแนวตั้ง
    for (let i = 0; i < size; i++) {
        if (grid[i].every(val => val) || grid.map(row => row[i]).every(val => val)) {
            isBingo = true;
        }
    }

    // เช็คแนวทแยง
    if (grid.map((row, i) => row[i]).every(val => val) || 
        grid.map((row, i) => row[size - 1 - i]).every(val => val)) {
        isBingo = true;
    }

    if (isBingo) {
        hasBingoed = true; // มาร์คว่า
