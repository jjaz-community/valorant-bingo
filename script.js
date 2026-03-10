const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxP4oduAufLWfzP1Ytg88M3vJ_x4c0BCbs9asakJ7btzMJC8fgA_hOtExkD8zUiX3VW3Q/exec"; 
let isCooldown = false;
let hasBingoed = false; // ป้องกันการเด้งพลุซ้ำถ้าบิงโกไปแล้ว

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

// ฟังก์ชันส่งข้อมูลไปบันทึกที่ Google Sheets (สำหรับ Host: JJAZ420)
async function saveEvent(index) {
    const currentUsername = document.getElementById('username').value;
    
    // 1. ดึงตำแหน่งช่องทั้งหมดที่ถูกติ๊ก (Marked) ยกเว้นช่องกลาง
    const markedCells = Array.from(document.querySelectorAll('.bingo-cell.marked'))
        .filter(cell => cell.id !== 'special-cell') 
        .map(cell => {
            // ดึงเฉพาะตัวเลขจาก id เช่น "cell-5" -> "5"
            return cell.id.replace('cell-', '');
        });
    
    const currentState = markedCells.join(',');

    try {
        // 2. สร้าง URL ให้ตรงกับ setEvent(username, secretKey, event, state) ใน Apps Script
        // ตรง key=1234 ต้องตรงกับ HOST_SECRET_KEY ใน Apps Script นะครับ
        const url = `${SCRIPT_URL}?action=setEvent&user=${encodeURIComponent(currentUsername)}&key=1234&event=bingo_update&state=${encodeURIComponent(currentState)}`;
        
        console.log("Sending to Sheets:", url); // ไว้เช็คใน Console ว่า URL หน้าตาเป็นไง

        const response = await fetch(url);
        const result = await response.json(); 
        console.log("Result from Sheets:", result);
    } catch (err) {
        console.error("Sync Error:", err);
    }
}

// 2. ฟังก์ชันวาดตาราง
function renderBoard(board) {
    const container = document.getElementById('bingo-board');
    container.innerHTML = '';
    const currentUsername = document.getElementById('username').value;

    board.forEach((text, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.innerText = text;
        cell.id = 'cell-' + index;

        // ถ้าเป็นช่องกลาง (JJAZ) ให้ใช้ ID พิเศษเพื่อให้ CSS ใน index.html ทำงาน
        if (text === "JJAZ") {
            cell.id = "special-cell"; // ตรงกับ CSS #special-cell ใน HTML
            cell.classList.add('marked');
        }

        cell.onclick = function() {
            // ล็อคให้เฉพาะ JJAZ420 เป็นคนคุมเกม (Host)
            if (currentUsername === "JJAZ420") {
                if (this.id !== "special-cell") {
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

// 3. ฟังก์ชัน Refresh (ดึงข้อมูลล่าสุด)
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
            // ล้างเครื่องหมายเก่าออกก่อน (ยกเว้นช่องกลาง) เพื่อรองรับการ Unmark ของ Host
            const allCells = document.querySelectorAll('.bingo-cell');
            allCells.forEach(c => {
                if (c.id !== "special-cell") {
                    c.classList.remove('marked');
                }
            });

            // ติ๊กช่องตามข้อมูลล่าสุดจาก Google Sheets
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
        hasBingoed = true; 
        showBingoEffects();
    }
}

// 5. ฟังก์ชันแสดงเอฟเฟกต์พลุและวิดีโอ
function showBingoEffects() {
    // 1. ระบบพลุ
    var duration = 5 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min, max) { return Math.random() * (max - min) + min; }

    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    // 2. แสดงวิดีโอ (ตรงตาม ID ใน HTML ของคุณ)
    const overlay = document.getElementById('bingo-overlay');
    const video = document.getElementById('bingo-video');
    
    if (overlay && video) {
        overlay.style.display = 'flex';
        video.muted = false; 
        video.volume = 1.0;
        video.play().catch(e => {
            console.log("Auto-play blocked, playing muted first.");
            video.muted = true;
            video.play();
        });
    }
}

// 6. ฟังก์ชันปิดหน้าต่างบิงโก
function closeBingo() {
    const overlay = document.getElementById('bingo-overlay');
    const video = document.getElementById('bingo-video');
    if (overlay) overlay.style.display = 'none';
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
}


