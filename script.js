// Firebase Konfiguration (Deine funktionierende Datenbank-Verbindung)
const firebaseConfig = {
    apiKey: "AIzaSyBPonFpwT09cQn5cBQjg9yZV3QltDCPrTg",
    authDomain: "silvere-hordang-janson5.firebaseapp.com",
    projectId: "silvere-hordang-janson5",
    storageBucket: "silvere-hordang-janson5.firebasestorage.app",
    messagingSenderId: "729534477928",
    appId: "1:729534477928:web:28c3618d5248aa31e06ddd"
};

// Firebase initialisieren (Compat Modus)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const correctPin = "pwa"; 
const LOGOUT_TIME = 60 * 60 * 1000; // 1 Stunde Session-Dauer
const schluessel = 4; // Schlüssel für die Jarvis-Verschlüsselung

window.onload = () => {
    // Biometrie-Button anzeigen, wenn vom Browser unterstützt
    if (window.PublicKeyCredential) {
        const bioBtn = document.getElementById("biometricBtn");
        if(bioBtn) bioBtn.style.display = "block";
    }
    
    checkSessionTimeout();
    
    // Automatisch einloggen, wenn die Session noch aktiv ist
    if (sessionStorage.getItem("authenticated") === "true") {
        switchView('mainMenu');
    }
    
    // Counter in Echtzeit von Firebase laden
    loadCounters();
};

// --- NAVIGATION (Wechsel zwischen den Bereichen) ---
function switchView(viewId) {
    const views = ["loginView", "mainMenu", "appView", "counterView"];
    views.forEach(v => {
        const el = document.getElementById(v);
        if(el) el.classList.add("hidden");
    });
    const target = document.getElementById(viewId);
    if(target) target.classList.remove("hidden");
}

// --- LOGIN SYSTEM ---
function checkPin() {
    const pinInput = document.getElementById("pinInput");
    const errorMsg = document.getElementById("errorMessage");
    
    if (pinInput.value === correctPin) {
        loginSuccess();
    } else {
        errorMsg.textContent = "ZUTRITT VERWEIGERT: SYSTEM GESPERRT";
    }
}

function loginSuccess() {
    sessionStorage.setItem("authenticated", "true");
    sessionStorage.setItem("loginTimestamp", new Date().getTime());
    switchView('mainMenu');
}

function logout() { 
    sessionStorage.clear(); 
    location.reload(); 
}

function checkSessionTimeout() {
    const loginTime = sessionStorage.getItem("loginTimestamp");
    if (loginTime && (new Date().getTime() - loginTime > LOGOUT_TIME)) {
        logout();
    }
}

// --- JARVIS CODER (Verschlüsselungs-Logik) ---
function processMessage(mode) {
    const scanner = document.getElementById("scannerLine");
    const input = document.getElementById("messageInput");
    const out = document.getElementById("output");
    const alphabet = "abcdefghijklmnopqrstuvwxyz";

    if (!input || !input.value) return;
    
    // Scanner-Animation starten
    scanner.classList.add("active-scan");
    
    setTimeout(() => {
        let result = "";
        const val = input.value.toLowerCase();
        
        if (mode === 'encode') {
            // Umwandlung in Zahlen-Code
            let encodedParts = [];
            for (let char of val) {
                let index = alphabet.indexOf(char);
                if (index !== -1) {
                    let shifted = (index + 1 + schluessel - 1) % 26 + 1;
                    encodedParts.push(shifted);
                } else {
                    encodedParts.push(char);
                }
            }
            result = encodedParts.join(" ");
            input.value = ""; 
        } else {
            // Umwandlung zurück in Text
            let parts = input.value.split(" ");
            for (let teil of parts) {
                let zahl = parseInt(teil);
                if (!isNaN(zahl)) {
                    let originalIdx = (zahl - schluessel - 1 + 26) % 26;
                    result += alphabet[originalIdx];
                } else {
                    result += teil;
                }
            }
        }
        
        out.textContent = result;
        scanner.classList.remove("active-scan");
    }, 1200); // Verzögerung für den Effekt
}

// --- REALTIME COUNTER (Firebase-Anbindung) ---
function loadCounters() {
    db.ref("counters").on("value", (snapshot) => {
        const data = snapshot.val();
        const container = document.getElementById("counterContainer");
        if(!container) return;
        
        container.innerHTML = "";
        
        if (data) {
            Object.keys(data).forEach(id => {
                const c = data[id];
                const div = document.createElement("div");
                div.className = "counter-item";
                div.innerHTML = `
                    <div style="text-align:left">
                        <span class="counter-name">${c.name}</span>
                        <span class="counter-val">${c.value}</span>
                    </div>
                    <div class="action-buttons" style="margin:0">
                        <button onclick="updateCounter('${id}', -1)" class="neon-red" style="width:45px">-</button>
                        <button onclick="updateCounter('${id}', 1)" class="neon-green" style="width:45px">+</button>
                        <button onclick="deleteCounter('${id}')" style="width:35px; background:none; color:#ff0055; border:none; cursor:pointer;">×</button>
                    </div>`;
                container.appendChild(div);
            });
        }
    });
}

function addNewCounter() {
    const nameInput = document.getElementById("newCounterName");
    const name = nameInput.value.trim();
    if (!name) return;
    
    db.ref("counters").push({ 
        name: name, 
        value: 0 
    });
    nameInput.value = "";
}

function updateCounter(id, delta) {
    const ref = db.ref("counters/" + id + "/value");
    ref.transaction(current => (current || 0) + delta);
}

function deleteCounter(id) {
    if(confirm("Eintrag in der Jarvis-Datenbank löschen?")) {
        db.ref("counters/" + id).remove();
    }
}

// --- UTILS (Kopieren & Teilen) ---
function copyText() { 
    const text = document.getElementById("output").textContent;
    if(text && text !== "Bereit...") {
        navigator.clipboard.writeText(text); 
        alert("Daten in Zwischenablage gesichert."); 
    }
}

async function shareText() { 
    const text = document.getElementById("output").textContent;
    if(!text || text === "Bereit...") return;
    
    try { 
        await navigator.share({ text: text }); 
    } catch(e) {
        console.log("Teilen nicht möglich");
    } 
}
