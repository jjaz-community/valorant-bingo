const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw4kovYHqr3Mh-6Mp6ysT-AaP-NOJZirSHsLSVJbROMTzrZG1F_cUIqv4vxItlR0z1evg/exec"; 
let isCooldown = false;
let hasBingoed = false; 

// 1. ฟังก์ชันสุ่มบิงโก
async function generateBingo() {
    const username = document.getElementById('username').value;
    if (!username) {
        alert("กรุณาใส่ชื่อก่อนสุ่มนะครับ");
        return;
    }
    hasBingoed = false; 

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

// 2. ฟังก์ชันส่งข้อมูลไปบันทึก (สำหรับ Host: JJAZ420) - มาร์คตามข้อความ
async function saveEvent() {
    const currentUsername = document.getElementById('username').value;
    
    // ดึง "ข้อความ" ของทุกช่องที่ถูก marked (ยกเว้นช่องกลาง)
    const markedTexts = Array.from(document.querySelectorAll('.bingo-cell.marked'))
        .filter(cell => cell.id !== 'special-cell') 
        .map(cell => cell.innerText);
    
    const currentState = markedTexts.join('|'); 

    try {
        const url = `${SCRIPT_URL}?action=setEvent&user=${encodeURIComponent(currentUsername)}&key=1234&event=bingo_update&state=${encodeURIComponent(currentState)}`;
        const response = await fetch(url);
        const result = await response.json();
        console.log("Sync Success:", result);
    } catch (err) {
        console.error("Sync Error:", err);
    }
}

// 3. ฟังก์ชันวาดตาราง
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
            cell.id = "special-cell";
            cell.classList.add('marked');
        }

        cell.onclick = function() {
            if (currentUsername === "JJAZ420") {
                if (this.id !== "special-cell") {
                    this.classList.toggle('marked');
                    saveEvent(); // ส่งข้อมูลมาร์คล่าสุดไปที่ Sheets
                    checkBingo();
                }
            } else {
                console.log("Waiting for host (JJAZ420) to mark...");
            }
        };

        container.appendChild(cell);
    });
}

// 4. ฟังก์ชัน Refresh (ดึงข้อมูลล่าสุดตามข้อความ)
async function handleUpdate() {
    if (isCooldown) return;

    const btn = document.getElementById('updateBtn');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const msg = document.getElementById('cooldownMsg');

    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = "Refreshing...";
    if (btnIcon) btnIcon.style.animation = "spin 1s linear infinite";

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getEvent`);
        const data = await response.json();

        if (data && data.state !== undefined) {
            const hostMarkedTexts = data.state.split('|'); 
            const allCells = document.querySelectorAll('.bingo-cell');

            allCells.forEach(cell => {
                if (cell.id !== "special-cell") {
                    // ถ้าข้อความในช่องตรงกับคำที่ Host ติ๊กไว้ ให้ขึ้นสีม่วง
                    if (hostMarkedTexts.includes(cell.innerText)) {
                        cell.classList.add('marked');
                    } else {
                        cell.classList.remove('marked');
                    }
                }
            });
            checkBingo();
            if (btnText) btnText.innerText = "Updated!";
        }
    } catch (err) {
        if (btnText) btnText.innerText = "Try again";
        console.error(err);
    }

    // ระบบ Cooldown 5 วินาที
    isCooldown = true;
    let seconds = 5;
    if (btnIcon) btnIcon.style.animation = "none";

    const timer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(timer);
            isCooldown = false;
            if (btn) btn.disabled = false;
            if (btnText) btnText.innerText = "Refresh";
            if (msg) msg.innerText = "";
        } else {
            if (msg) msg.innerText = `รออีก ${seconds} วินาที`;
        }
    }, 1000);
}

// 5. ฟังก์ชันเช็คการบิงโก
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
    for (let i = 0; i < size; i++) {
        if (grid[i].every(val => val) || grid.map(row => row[i]).every(val => val)) {
            isBingo = true;
        }
    }
    if (grid.map((row, i) => row[i]).every(val => val) || 
        grid.map((row, i) => row[size - 1 - i]).every(val => val)) {
        isBingo = true;
    }

    if (isBingo) {
        hasBingoed = true; 
        showBingoEffects();
    }
}

// 6. เอฟเฟกต์พลุและวิดีโอ
function showBingoEffects() {
    var duration = 5 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 } }));
    }, 250);

    const overlay = document.getElementById('bingo-overlay');
    const video = document.getElementById('bingo-video');
    if (overlay && video) {
        overlay.style.display = 'flex';
        video.muted = false; 
        video.play().catch(() => {
            video.muted = true;
            video.play();
        });
    }
}

function closeBingo() {
    const overlay = document.getElementById('bingo-overlay');
    const video = document.getElementById('bingo-video');
    if (overlay) overlay.style.display = 'none';
    if (video) { video.pause(); video.currentTime = 0; }
}

// --- Auto-Refresh ทุกๆ 10 วินาที ---
setInterval(() => {
    const currentUsername = document.getElementById('username').value;
    if (currentUsername && currentUsername !== "JJAZ420") {
        handleUpdate(); 
    }
}, 10000);
