// 設定管理用の共通スクリプト
// このファイルを各HTMLファイルで読み込んで使用します

// デフォルト設定
const DEFAULT_SETTINGS = {
    fontSize: 'medium',
    soundEnabled: true,
    soundVolume: 50,
    mirrorMode: true,
    showImage: true
};

/**
 * 設定をlocalStorageに保存
 */
function saveGameSettings(settings) {
    try {
        localStorage.setItem('gameSettings', JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('設定の保存に失敗しました:', error);
        return false;
    }
}

/**
 * 設定をlocalStorageから読み込み
 */
function loadGameSettings() {
    try {
        const savedSettings = localStorage.getItem('gameSettings');
        if (savedSettings) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        }
    } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
    }
    return DEFAULT_SETTINGS;
}

/**
 * 特定の設定項目を取得
 */
function getSetting(key) {
    const settings = loadGameSettings();
    return settings[key];
}

/**
 * 特定の設定項目を更新
 */
function updateSetting(key, value) {
    const settings = loadGameSettings();
    settings[key] = value;
    saveGameSettings(settings);
}

/**
 * ページに設定を適用（文字サイズ）
 */
function applyFontSize() {
    const fontSize = getSetting('fontSize');
    const root = document.documentElement;
    
    const sizeMap = {
        'small': '14px',
        'medium': '16px',
        'large': '20px',
        'xlarge': '24px'
    };
    
    root.style.fontSize = sizeMap[fontSize] || sizeMap['medium'];
}

/**
 * ページに設定を適用（全体）
 * 各ゲームページの読み込み時に呼び出す
 */
function applyAllSettings() {
    const settings = loadGameSettings();
    
    // 文字サイズの適用
    applyFontSize();
    
    // ミラーモードの適用（チェックボックスがある場合）
    const mirrorModeCheckbox = document.getElementById('mirrormode');
    if (mirrorModeCheckbox) {
        mirrorModeCheckbox.checked = settings.mirrorMode;
    }
    
    // 画像表示の適用（チェックボックスがある場合）
    const showImageCheckbox = document.getElementById('showimg');
    if (showImageCheckbox) {
        showImageCheckbox.checked = settings.showImage;
    }
    
    return settings;
}

/**
 * 音声を再生（音声設定を考慮）
 */
function playSound(audioElement) {
    const settings = loadGameSettings();
    
    if (settings.soundEnabled && audioElement) {
        audioElement.volume = settings.soundVolume / 100;
        audioElement.play().catch(error => {
            console.error('音声の再生に失敗しました:', error);
        });
    }
}

/**
 * 効果音用のAudioオブジェクトを作成
 */
function createSound(src) {
    const audio = new Audio(src);
    const settings = loadGameSettings();
    audio.volume = settings.soundVolume / 100;
    return audio;
}

// ページ読み込み時に設定を自動適用
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        applyFontSize();
    });
}