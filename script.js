const game = {
    activeRoads: [],
    usedRoads: new Set(),
    history: [],
    currentRoad: null,
    currentHint: [],
    totalScore: 0,
    currentRoundPot: 1000,
    roundStartTime: 0,
    timerInterval: null,
    totalRounds: 0,
    totalCorrect: 0,

    ranks: [
        { name: "Pedestrian", min: 0 },
        { name: "Learner", min: 2000 },
        { name: "Navigator", min: 8000 },
        { name: "Road Legend", min: 20000 },
        { name: "Motorway Master", min: 50000 }
    ],

    init: function() {
        // Ensure allRoads is available
        if (typeof allRoads !== 'undefined') {
            document.getElementById("roads-loaded-count").innerText = allRoads.length;
        } else {
            console.error("allRoads is missing. Check data.js");
        }
        ui.renderCounties();
    },

    showCounties: () => ui.showScreen('screen-counties'),

    start: function(mode, region = null) {
        this.totalScore = 0;
        this.totalRounds = 0;
        this.totalCorrect = 0;
        this.history = [];
        this.usedRoads.clear();
        
        // Handle Mode Selection
        if (mode === 'all') {
            this.activeRoads = [...allRoads];
        } else {
            this.activeRoads = allRoads.filter(r => r.Region === region);
        }
        
        if (this.activeRoads.length === 0) {
            alert("No roads found!");
            return;
        }
        this.nextRound();
        ui.showScreen('screen-game');
    },

    nextRound: function() {
        ui.clearFeedback();
        const available = this.activeRoads.filter(r => !this.usedRoads.has(r));
        
        if (available.length === 0) {
            this.endGame();
            return;
        }

        this.currentRoad = available[Math.floor(Math.random() * available.length)];
        this.usedRoads.add(this.currentRoad);
        
        // Reset Pot and Timer
        this.currentRoundPot = 1000;
        this.roundStartTime = Date.now();
        this.startHiddenTimer();

        // Prepare Hint
        this.currentHint = [this.currentRoad.Number[0]];
        for(let i=1; i < this.currentRoad.Number.length; i++) this.currentHint.push('_');

        ui.updateGameScreen(this.currentRoad, this.currentHint.join(' '));
    },

    startHiddenTimer: function() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            // Background timer logic
        }, 1000);
    },

    submitGuess: function() {
        const input = document.getElementById("guess-input");
        const guess = input.value.trim().toUpperCase();
        if (!guess) return;

        const target = this.currentRoad.Number.toUpperCase();
        const cleanG = guess.replace(/^[AM]/, '');
        const cleanT = target.replace(/^[AM]/, '');

        if (guess === target || (cleanG.length > 0 && cleanG === cleanT)) {
            clearInterval(this.timerInterval);
            const elapsed = Math.floor((Date.now() - this.roundStartTime) / 1000);
            
            // Score Calculation
            const finalScore = Math.max(100, this.currentRoundPot - (elapsed * 10));
            
            this.totalScore += finalScore;
            this.totalCorrect++;
            this.totalRounds++;
            this.history.push({ road: this.currentRoad, result: 'Correct', points: finalScore });
            
            ui.showFeedback(`Correct! +${finalScore} pts`, 'correct');
            setTimeout(() => { input.value = ""; this.nextRound(); }, 1500);
        } else {
            // Penalty
            this.currentRoundPot = Math.max(100, this.currentRoundPot - 150);
            ui.showFeedback("Wrong ❌", "wrong");
            
            // Intelligent Hint
            const isNum = /^\d/.test(guess);
            if (isNum) {
                for(let i=0; i<guess.length; i++) {
                    if (target[i+1] === guess[i]) this.currentHint[i+1] = guess[i];
                }
            } else {
                for(let i=1; i<Math.min(guess.length, target.length); i++) {
                    if (target[i] === guess[i]) this.currentHint[i] = guess[i];
                }
            }
            ui.updateHint(this.currentHint.join(' '));
            input.value = "";
        }
    },

    skipRound: function() {
        clearInterval(this.timerInterval);
        this.totalRounds++;
        this.history.push({ road: this.currentRoad, result: 'Skipped', points: 0 });
        ui.showFeedback(`Skipped. Answer was ${this.currentRoad.Number}`, 'wrong');
        setTimeout(() => { document.getElementById("guess-input").value = ""; this.nextRound(); }, 2000);
    },

    endGame: function() {
        clearInterval(this.timerInterval);
        ui.showResults();
    }
};

const ui = {
    showScreen: id => {
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    renderCounties: function() {
        const list = document.getElementById("county-list");
        if (!list) return;
        
        list.innerHTML = "";
        if (typeof regionData !== 'undefined') {
            Object.keys(regionData).sort().forEach(region => {
                const btn = document.createElement("button");
                btn.className = "county-btn";
                btn.innerHTML = `<span>${region}</span><span class="count">${regionData[region].length}</span>`;
                btn.onclick = () => game.start('county', region);
                list.appendChild(btn);
            });
        }
    },

    updateGameScreen: function(road, hint) {
        document.getElementById("display-hint").innerText = hint;
        document.getElementById("display-start").innerText = road.Start;
        document.getElementById("display-end").innerText = road.End;
        
        // Display County on BOTH boxes
        const startC = document.getElementById("display-start-county");
        const endC = document.getElementById("display-end-county");
        if (startC) startC.innerText = road.Region;
        if (endC) endC.innerText = road.Region;
        
        const input = document.getElementById("guess-input");
        input.placeholder = road.Number[0] + "...";
        input.focus();
        
        // Update Rank
        const rank = [...game.ranks].reverse().find(r => game.totalScore >= r.min) || game.ranks[0];
        const rankEl = document.getElementById("rank-display");
        if (rankEl) rankEl.innerText = `Rank: ${rank.name} (${game.totalScore} pts)`;
    },

    updateHint: h => document.getElementById("display-hint").innerText = h,
    
    showFeedback: (m, t) => { 
        const f = document.getElementById("display-feedback"); 
        if (f) { f.innerText = m; f.className = `feedback ${t}`; }
    },

    clearFeedback: () => {
        const f = document.getElementById("display-feedback");
        if (f) { f.innerText = ""; f.className = "feedback"; }
    },

    showResults: function() {
        document.getElementById("res-points").innerText = game.totalScore;
        document.getElementById("res-rounds").innerText = game.totalRounds;
        document.getElementById("res-correct").innerText = game.totalCorrect;
        
        const avg = game.totalRounds > 0 ? (game.totalScore / game.totalRounds).toFixed(0) : 0;
        document.getElementById("res-avg").innerText = avg;

        const rank = [...game.ranks].reverse().find(r => game.totalScore >= r.min) || game.ranks[0];
        document.getElementById("res-rank").innerText = rank.name;

        // Build History Table
        const tbody = document.querySelector("#history-table tbody");
        if(tbody) {
            tbody.innerHTML = "";
            game.history.forEach(h => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="font-weight:bold">${h.road.Number}</td>
                    <td style="color: ${h.result === 'Correct' ? 'green' : 'red'}">${h.result}</td>
                    <td>${h.road.Start}</td>
                    <td>${h.road.End}</td>
                    <td>${h.points} pts</td>
                `;
                tbody.appendChild(tr);
            });
        }
        this.showScreen('screen-results');
    }
};

window.onload = function() {
    game.init();
};

const guessInput = document.getElementById("guess-input");
if (guessInput) {
    guessInput.addEventListener("keypress", e => { if (e.key === "Enter") game.submitGuess(); });
}