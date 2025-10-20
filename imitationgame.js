const videoElement = document.getElementById("videoElement");
const canvasElement = document.getElementById("canvasElement");
const g = canvasElement.getContext("2d");
const cameraDeviceSelect = document.getElementById("cameraDevice");
const showimgCheckbox = document.getElementById("showimg");
const mirrormodeCheckbox = document.getElementById("mirrormode");
const gestureTextElement = document.getElementById("gestureText");

var question_image = new Image();
var user_image = new Image();

let currentStream = null;
let devicesInitialized = false;

const question_num = Math.floor(Math.random() * (3 - 1 + 1)) + 1;

const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });

hands.setOptions({
    maxNumHands: 10,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

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

        // 各指の先端（TIP）と付け根（MCP）のランドマークID
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

        // 指が曲がっているかどうかの判定 (Y座標)
        const isThumbDownY = thumbTip.y > thumbMcp.y;
        const isIndexDownY = indexTip.y > indexMcp.y;
        const isMiddleDownY = middleTip.y > middleMcp.y;
        const isRingDownY = ringTip.y > ringMcp.y;
        const isPinkyDownY = pinkyTip.y > pinkyMcp.y;
        
        // 指が伸びているかどうかの判定 (Y座標)
        const isThumbUpY = thumbTip.y < thumbMcp.y;
        const isIndexUpY = indexTip.y < indexMcp.y;
        const isMiddleUpY = middleTip.y < middleMcp.y;
        const isRingUpY = ringTip.y < ringMcp.y;
        const isPinkyUpY = pinkyTip.y < pinkyMcp.y;
        
        // 親指の水平方向 (X座標) の比較
        const hand = res.multiHandedness[0].label;
        let isThumbInside = false;
        if (hand === "Right") {
            isThumbInside = thumbTip.x < thumbMcp.x;
        } else if (hand === "Left") {
            isThumbInside = thumbTip.x > thumbMcp.x;
        }


        const thumbIndexDistance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        const thumbMiddleDistance = Math.hypot(thumbTip.x - middleTip.x, thumbTip.y - middleTip.y);
        const thumbRingDistance = Math.hypot(thumbTip.x - ringTip.x, thumbTip.y - ringTip.y);
        const okThreshold = 0.05;

        let gesture = "未検出";

        /*狐(親指と中指、薬指が近く、他の指が伸びている)
        if (isThumbUpY && thumbMiddleDistance < okThreshold && thumbRingDistance < okThreshold && isPinkyUpY) {
             gesture = "狐";
        }*/
        /* OKサイン (親指と人差し指が近く、他の指が伸びている)
        else if (thumbIndexDistance < okThreshold && isMiddleUpY && isRingUpY && isPinkyUpY) {
             gesture = "OK👌";
        }*/
        // グー (すべての指が曲がっていて、親指が内側にある)
        if (isIndexDownY && isMiddleDownY && isRingDownY && isPinkyDownY && isThumbInside) {
            gesture = "グー✊";
            user_image.src = 'rock.png';
        }
        // パー (すべての指が伸びている)
        else if (isThumbUpY && isIndexUpY && isMiddleUpY && isRingUpY && isPinkyUpY) {
            gesture = "パー🖐️";
            user_image.src = 'paper.png';
        }
        // チョキ (人差し指と中指だけが伸びている)
        else if (isIndexUpY && isMiddleUpY && isRingDownY && isPinkyDownY) {
            gesture = "チョキ✌️";
            user_image.src = 'scissors.png';
        }
        /* グッド (親指が伸びていて他の指が曲がっている)
        else if (isThumbUpY && isIndexDownY && isMiddleDownY && isRingDownY && isPinkyDownY && !isThumbInside) {
            gesture = "グッド👍";
        }*/

        gestureTextElement.textContent = `ポーズ: ${gesture}`;

    } else {
        gestureTextElement.textContent = "ポーズ: 手が検出されません";
    }

    if (mirrormode.checked) {
        g.restore();
        g.save();
    }

    g.fillStyle = 'white';
    g.fillRect(0, 650, 350, 250);
    g.fillRect(1250, 650, 350, 250);
    g.fillStyle = "black";
    g.font = "30px cursive";
    g.fillText("これに合わせて！！",0,630);
    g.fillText("あなたの手",1250,680);

    if(question_num == 1){
        question_image.src = 'rock.png';
    }
    else if(question_num == 2){
        question_image.src = 'scissors.png';
    }
    else{
        question_image.src = 'paper.png';
    }
    
    if (question_image.complete) {
        g.drawImage(question_image, 25, 670, 300, 200); 
    }

    g.drawImage(user_image, 1300, 670, 300, 200)

    if(question_image.src == user_image.src){
        
    }

    g.restore();
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