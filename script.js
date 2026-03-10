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

        if (text === "JJAZ") {
            cell.id = "special-cell"; // สำหรับ CSS เรืองแสง
            cell.classList.add('marked'); 
        } else {
            cell.id = 'cell-' + index;
        }

        cell.onclick = function() {
            // ป้องกันไม่ให้กดติ๊กช่อง JJAZ ออก (หรือถ้าอยากให้กดออกได้ก็เอา if นี้ออกครับ)
            if (this.id !== "special-cell") {
                this.classList.toggle('marked');
            }
        };

        container.appendChild(cell);
    });
}

// 3. ฟังก์ชัน Refresh (ป้องกันการลบสีม่วงของ JJAZ)
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
            // ย้ำอีกรอบว่า JJAZ ต้องม่วงเสมอ แม้จะ Refresh
            const special = document.getElementById('special-cell');
            if(special) special.classList.add('marked');
            
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

const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform:rotate(360deg); } }`;
document.head.appendChild(style);

// ฟังก์ชันเช็คการบิงโก
function checkBingo() {
    const cells = document.querySelectorAll('.bingo-cell');
    const size = 5;
    let grid = [];
    
    // แปลงสถานะตารางเป็น Array 2 มิติ
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

// ฟังก์ชันแสดงเอฟเฟกต์อลังการ
function showBingoEffects() {
    // 1. จุดพลุ
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
    overlay.style.display = 'flex';
    video.play();
}

function closeBingo() {
    const overlay = document.getElementById('bingo-overlay');
    const video = document.getElementById('bingo-video');
    overlay.style.display = 'none';
    video.pause();
    video.currentTime = 0;
}

// แก้ไขฟังก์ชัน onclick เดิมใน renderBoard ของคุณ
// ให้เพิ่ม checkBingo() เข้าไปต่อท้าย toggle('marked') แบบนี้ครับ:
/* cell.onclick = function() {
    if (this.id !== "special-cell") {
        this.classList.toggle('marked');
        checkBingo(); // เพิ่มบรรทัดนี้!!!
    }
};
*/
