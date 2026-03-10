let eventCheckerStarted = false;
let hostSecret = ""; 
window.alreadyBingo = false;

// *** สำคัญ: ก๊อปปี้ URL ของ Web App จาก Google Apps Script มาใส่ตรงนี้ ***
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDhwsJ-5gaibiOPL-cHDmFSdRbLzM0H_bJYEXiAa9wDuIRQZbsmPqPPTD0AHC4dL9yrA/exec";

async function gen() {
    let name = document.getElementById("name").value.trim();
    if (!name) { alert("กรุณาใส่ชื่อก่อนครับ"); return; }
    
    try {
        const res = await fetch(`${SCRIPT_URL}?action=generate&user=${encodeURIComponent(name)}`);
        const boardData = await res.json();
        draw(boardData);

        if (!eventCheckerStarted) {
            setInterval(checkEvent, 10000); 
            eventCheckerStarted = true;
        }
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการดึงข้อมูล: " + e.message);
    }
}

async function checkEvent() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getEvent`);
        const data = await res.json();
        updateBoard(data);
    } catch (e) {
        console.error("CheckEvent Error:", e);
    }
}

function updateBoard(data) {
    if (!data || !data.event) return;
    document.querySelectorAll(".cell").forEach(c => {
        if (c.innerText === data.event) {
            if (data.state === "mark") c.classList.add("marked");
            else if (data.state === "unmark") c.classList.remove("marked");
        }
    });
    checkBingo();
}

function draw(boardData) {
    let grid = document.getElementById("board");
    grid.innerHTML = "";
    let currentUsername = document.getElementById("name").value.trim();

    boardData.forEach(text => {
        let d = document.createElement("div");
        d.className = "cell";
        if (text === "JJAZ") d.classList.add("jjazz");
        d.innerText = text;

        if (currentUsername === "JJAZ420") {
            d.style.cursor = "pointer";
            d.onclick = async function() {
                if (!hostSecret) hostSecret = prompt("Enter Host Secret Key:");
                if (!hostSecret) return;
                let newState = d.classList.contains("marked") ? "unmark" : "mark";
                
                try {
                    const res = await fetch(`${SCRIPT_URL}?action=setEvent&user=${currentUsername}&key=${hostSecret}&event=${encodeURIComponent(text)}&state=${newState}`);
                    const resultText = await res.json();
                    
                    if (resultText === "Unauthorized") { 
                        alert("รหัสผิด!"); 
                        hostSecret = ""; 
                    } else {
                        d.classList.toggle("marked");
                        checkBingo();
                    }
                } catch (e) {
                    alert("ไม่สามารถบันทึกข้อมูลได้");
                }
            };
        }
        grid.appendChild(d);
    });
}

function checkBingo() {
    const cells = document.querySelectorAll('.cell');
    if (cells.length === 0 || window.alreadyBingo) return;
    const size = 5;
    let grid = [];
    for (let i = 0; i < size; i++) {
        grid[i] = [];
        for (let j = 0; j < size; j++) {
            grid[i][j] = cells[i * size + j].classList.contains('marked');
        }
    }
    let isBingo = false;
    for (let i = 0; i < size; i++) if (grid[i].every(val => val)) isBingo = true;
    for (let j = 0; j < size; j++) {
        let col = true;
        for (let i = 0; i < size; i++) if (!grid[i][j]) col = false;
        if (col) isBingo = true;
    }
    let d1 = true, d2 = true;
    for (let i = 0; i < size; i++) {
        if (!grid[i][i]) d1 = false;
        if (!grid[i][size-1-i]) d2 = false;
    }
    if (d1 || d2) isBingo = true;
    if (isBingo) showBingoEffect();
}

function showBingoEffect() {
    if (window.alreadyBingo) return;
    window.alreadyBingo = true;

    var duration = 5 * 1000;
    var animationEnd = Date.now() + duration;
    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        confetti({ particleCount: 50, spread: 70, origin: { x: 0.1, y: 0.7 }, zIndex: 10000 });
        confetti({ particleCount: 50, spread: 70, origin: { x: 0.9, y: 0.7 }, zIndex: 10000 });
    }, 300);

    document.getElementById('bingo-modal').style.display = 'flex';
    const iframe = document.getElementById('jjaz-video');
    let currentSrc = iframe.src;
    iframe.src = currentSrc.replace("autoplay=0", "autoplay=1");
}

function closeBingoModal() {
    const modal = document.getElementById('bingo-modal');
    modal.style.display = 'none';
    const iframe = document.getElementById('jjaz-video');
    let currentSrc = iframe.src;
    iframe.src = currentSrc.replace("autoplay=1", "autoplay=0");
}