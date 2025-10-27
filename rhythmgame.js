const videoElement = document.getElementById("videoElement");
const canvasElement = document.getElementById("canvasElement");
const g = canvasElement.getContext("2d");
const cameraDeviceSelect = document.getElementById("cameraDevice");
const showimgCheckbox = document.getElementById("showimg");
const mirrormodeCheckbox = document.getElementById("mirrormode");
const gestureTextElement = document.getElementById("gestureText");

var question_image = new Image();
var user_image = new Image();

// ノーツ用の画像
var rockImage = new Image();
rockImage.src = 'rock.png';
var paperImage = new Image();
paperImage.src = 'paper.png';
var scissorsImage = new Image();
scissorsImage.src = 'scissors.png';

let currentStream = null;
let devicesInitialized = false;

// ゲーム関連の変数
let notes = []; // ノーツの配列
let score = 0;
let combo = 0;
let gameStartTime = Date.now();
const judgeLineX = 300; // 判定ラインのX座標
const noteSpeed = 3; // ノーツの移動速度（px/frame）
const noteSize = 80; // ノーツのサイズ

// ノーツのデータ（タイプ: 1=グー, 2=チョキ, 3=パー, タイミング: ミリ秒）
const notePattern = [
    { type: 1, timing: 2000 },
    { type: 2, timing: 3000 },
    { type: 3, timing: 4000 },
    { type: 1, timing: 5000 },
    { type: 3, timing: 6000 },
    { type: 2, timing: 7000 },
    { type: 1, timing: 8000 },
    { type: 1, timing: 9000 },
    { type: 2, timing: 10000 },
    { type: 3, timing: 11000 },
    { type: 1, timing: 12000 },
    { type: 2, timing: 13000 },
    { type: 3, timing: 14000 },
];

let currentGesture = "未検出"; // 現在認識されているジェスチャー

const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });

hands.setOptions({
    maxNumHands: 10,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

// ノーツを生成する関数
function spawnNote(type) {
    const canvasWidth = canvasElement.width;
    notes.push({
        type: type, // 1=グー, 2=チョキ, 3=パー
        x: canvasWidth, // 画面右端から開始
        y: 150, // Y座標
        spawned: true
    });
}

// ノーツを更新する関数
function updateNotes() {
    const currentTime = Date.now() - gameStartTime;
    
    // パターンに従ってノーツを生成
    for (let pattern of notePattern) {
        if (!pattern.spawned && currentTime >= pattern.timing) {
            spawnNote(pattern.type);
            pattern.spawned = true;
        }
    }
    
    // ノーツを左に移動
    for (let i = notes.length - 1; i >= 0; i--) {
        notes[i].x -= noteSpeed;
        
        // 判定ライン付近での判定処理
        const distance = Math.abs(notes[i].x - judgeLineX);
        
        // 判定範囲内にいる場合、継続的にチェック
        if (distance < 80 && !notes[i].judged) {
            const gestureType = getGestureType(currentGesture);
            
            // 正しい手の形が検出されたら判定
            if (gestureType === notes[i].type) {
                score += 100;
                notes[i].result = "PERFECT";
                combo++;
                notes[i].judged = true;
            }
        }
        
        // 判定範囲を過ぎたらミス判定
        if (notes[i].x < judgeLineX - 80 && !notes[i].judged) {
            notes[i].judged = true;
            notes[i].result = "MISS";
            combo = 0;
        }
        
        // 画面外に出たノーツを削除
        if (notes[i].x < -100) {
            notes.splice(i, 1);
        }
    }
}

// ジェスチャーからタイプ番号を取得
function getGestureType(gesture) {
    if (gesture.includes("グー")) return 1;
    if (gesture.includes("チョキ")) return 2;
    if (gesture.includes("パー")) return 3;
    return 0;
}

// ノーツを描画する関数
function drawNotes() {
    for (let note of notes) {
        let img;
        if (note.type === 1) img = rockImage;
        else if (note.type === 2) img = scissorsImage;
        else if (note.type === 3) img = paperImage;
        
        if (img && img.complete) {
            // ノーツを円形の背景付きで描画
            g.fillStyle = 'rgba(255, 255, 255, 0.8)';
            g.beginPath();
            g.arc(note.x, note.y, noteSize / 2, 0, Math.PI * 2);
            g.fill();
            
            g.drawImage(img, note.x - noteSize/2, note.y - noteSize/2, noteSize, noteSize);
            
            // 判定結果を表示
            if (note.judged && note.result) {
                g.fillStyle = 'gold';
                g.font = '20px bold Arial';
                g.fillText(note.result, note.x - 40, note.y - 50);
            }
        }
    }
}

// 判定ラインを描画
function drawJudgeLine() {
    g.strokeStyle = 'red';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(judgeLineX, 50);
    g.lineTo(judgeLineX, 250);
    g.stroke();
}

// スコアとコンボを描画
function drawScore() {
    g.fillStyle = 'black';
    g.font = 'bold 30px Arial';
    g.fillText(`SCORE: ${score}`, 50, 50);
    g.fillText(`COMBO: ${combo}`, 50, 90);
}

hands.onResults((res) => {
    const w = canvasElement.width;
    const h = canvasElement.height;
    g.save();
    if (mirrormode.checked) {
        g.scale(-1, 1);
        g.translate(-w, 0);
    }
    g.clearRect(0, 0, w, h);
    if (showimg.checked) {
        g.drawImage(res.image, 0, 0, w, h);
    }

    if (res.multiHandLandmarks && res.multiHandedness.length > 0) {
        for (const landmarks of res.multiHandLandmarks) {
            drawConnectors(g, landmarks, HAND_CONNECTIONS, { color: "#222", lineWidth: 5 });
            drawLandmarks(g, landmarks, { color: "#222", lineWidth: 2 });
        }

        const landmarks = res.multiHandLandmarks[0];

        const thumbTip = landmarks[4];
        const thumbMcp = landmarks[2];
        const indexTip = landmarks[8];
        const indexMcp = landmarks[5];
        const middleTip = landmarks[12];
        const middleMcp = landmarks[9];
        const ringTip = landmarks[16];
        const ringMcp = landmarks[13];
        const pinkyTip = landmarks[20];
        const pinkyMcp = landmarks[17];

        const isThumbDownY = thumbTip.y > thumbMcp.y;
        const isIndexDownY = indexTip.y > indexMcp.y;
        const isMiddleDownY = middleTip.y > middleMcp.y;
        const isRingDownY = ringTip.y > ringMcp.y;
        const isPinkyDownY = pinkyTip.y > pinkyMcp.y;
        
        const isThumbUpY = thumbTip.y < thumbMcp.y;
        const isIndexUpY = indexTip.y < indexMcp.y;
        const isMiddleUpY = middleTip.y < middleMcp.y;
        const isRingUpY = ringTip.y < ringMcp.y;
        const isPinkyUpY = pinkyTip.y < pinkyMcp.y;
        
        const hand = res.multiHandedness[0].label;
        let isThumbInside = false;
        if (hand === "Right") {
            isThumbInside = thumbTip.x < thumbMcp.x;
        } else if (hand === "Left") {
            isThumbInside = thumbTip.x > thumbMcp.x;
        }

        let gesture = "未検出";

        if (isIndexDownY && isMiddleDownY && isRingDownY && isPinkyDownY) {
            gesture = "グー✊";
            user_image.src = 'rock.png';
        }
        else if (isThumbUpY && isIndexUpY && isMiddleUpY && isRingUpY && isPinkyUpY) {
            gesture = "パー🖐️";
            user_image.src = 'paper.png';
        }
        else if (isIndexUpY && isMiddleUpY && isRingDownY && isPinkyDownY) {
            gesture = "チョキ✌️";
            user_image.src = 'scissors.png';
        }

        currentGesture = gesture;
        gestureTextElement.textContent = `ポーズ: ${gesture}`;

    } else {
        currentGesture = "未検出";
        gestureTextElement.textContent = "ポーズ: 手が検出されません";
    }

    g.restore();
    
    // ゲーム要素の描画（ミラーモードの影響を受けない）
    updateNotes();
    drawJudgeLine();
    drawNotes();
    drawScore();
    
    // 現在の手の形を表示
    g.fillStyle = 'white';
    g.fillRect(50, h - 150, 150, 150);
    g.fillStyle = "black";
    g.font = "20px Arial";
    g.fillText("あなたの手", 60, h - 160);
    if (user_image.complete) {
        g.drawImage(user_image, 60, h - 140, 130, 130);
    }
});

async function startCamera(deviceId) {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { exact: 1280 },
            height: { exact: 720 },
        }
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            requestAnimationFrame(sendFrames);
        };
        async function sendFrames() {
            if (videoElement.srcObject && !videoElement.paused) {
                const dpi = devicePixelRatio;
                canvasElement.width = videoElement.videoWidth * dpi;
                canvasElement.height = videoElement.videoHeight * dpi;
                await hands.send({ image: videoElement });
                requestAnimationFrame(sendFrames);
            }
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('カメラへのアクセスが拒否されました。カメラを使用するには許可が必要です。');
    }
}

async function getDevices() {
    try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        while (cameraDeviceSelect.firstChild) {
            cameraDeviceSelect.removeChild(cameraDeviceSelect.firstChild);
        }
        for (const deviceInfo of deviceInfos) {
            if (deviceInfo.kind === 'videoinput') {
                const option = document.createElement('option');
                option.value = deviceInfo.deviceId;
                option.text = deviceInfo.label || `camera ${cameraDeviceSelect.length + 1}`;
                cameraDeviceSelect.appendChild(option);
            }
        }
        devicesInitialized = true;
        if (cameraDeviceSelect.options.length > 0) {
        } else {
            alert('カメラが見つかりません。');
        }
    } catch (error) {
        console.error('Error listing devices:', error);
        alert('デバイスリストの取得に失敗しました。');
    }
}

cameraDeviceSelect.onfocus = () => {
    if (!devicesInitialized) {
        getDevices();
    }
};

cameraDeviceSelect.onchange = (event) => {
    if (event.target.value) {
        startCamera(event.target.value);
    }
};

window.addEventListener('load', getDevices);
navigator.mediaDevices.ondevicechange = getDevices;
startCamera();