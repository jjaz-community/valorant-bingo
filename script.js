const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxP4oduAufLWfzP1Ytg88M3vJ_x4c0BCbs9asakJ7btzMJC8fgA_hOtExkD8zUiX3VW3Q/exec"; 
let isCooldown = false;

// 1. ฟังก์ชันสุ่มบิงโก
async function generateBingo() {
    const username = document.getElementById('username').value;
    if (!username) {
        alert("กรุณาใส่ชื่อก่อนสุ่มนะครับ");
        return;
    }

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

// 2. ฟังก์ชันวาดตาราง (JJAZ เด่นที่สุด)
function renderBoard(board) {
    const container = document.getElementById('bingo-board');
    container.innerHTML = '';
    
    board.forEach((text, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.innerText = text;

        // --- แก้ไขตรงนี้: ให้ทุกช่องมี ID cell-X เสมอ เพื่อให้ Refresh ทำงานได้ ---
        cell.id = 'cell-' + index; 

        // ถ้าเป็นช่อง JJAZ ให้เพิ่ม ID พิเศษ "อีกอัน" หรือใช้ Class แทน
        if (text === "JJAZ") {
            // เราจะใช้ SetAttribute เพื่อให้มันมี ID พิเศษสำหรับ CSS แต่ยังคง ID หลักไว้
            cell.setAttribute('data-special', 'true'); 
            cell.classList.add('marked', 'special-jjaz'); // ใช้ Class แทน ID ในการแต่งสวย
        }

        cell.onclick = function() {
            // ช่อง JJAZ มาร์คค้างไว้ตลอด หรือจะให้กดสลับก็ได้
            if (text !== "JJAZ") {
                this.classList.toggle('marked');
                checkBingo(); 
            }
        };

        container.appendChild(cell);
    });
}

// 3. ฟังก์ชัน Refresh (ดึงข้อมูลจาก Google Sheet)
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
            
            const special = document.getElementById('special-cell');
            if(special) special.classList.add('marked');
            
            checkBingo(); // เช็คบิงโกเผื่อกรณี Refresh แล้วบิงโกพอดี
            btnText.innerText = "Updated!";
        }
    } catch (err) {
        btnText.innerText = "Try again";
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

// 4. ฟังก์ชันเช็คการบิงโก (ตรวจสอบแถว/หลัก/ทแยง)
function checkBingo() {
    const cells = document.querySelectorAll('.bingo-cell');
    if (cells.length === 0) return; // ถ้ายังไม่มีตารางไม่ต้องเช็ค

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
        showBingoEffects();
    }
}

// 5. ฟังก์ชันแสดงเอฟเฟกต์ (พลุ + วิดีโอพร้อมเสียง)
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

    // 2. แสดงวิดีโอและคำว่า BINGO
    const overlay = document.getElementById('bingo-overlay');
    const video = document.getElementById('bingo-video');
    
    if (overlay && video) {
        overlay.style.display = 'flex';
        video.muted = false; // มั่นใจว่าเปิดเสียง
        video.volume = 1.0;
        video.play().catch(e => console.log("Video play pending interaction"));
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

