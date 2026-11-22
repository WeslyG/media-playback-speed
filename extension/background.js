importScripts('content_main.js');

const commandSteps = new Map([
    ['slower', -0.1],
    ['faster', 0.1],
    ['slower-large', -1],
    ['faster-large', 1]
]);

let pending = Promise.resolve();
let baseIcon;

async function showRateIcon(tabId, rate) {
    const rounded = Number.isFinite(rate) ? Number(rate.toFixed(2)) : 1;
    if (rounded === 1) {
        await chrome.action.setIcon({ tabId, path: 'icon-48x48.png' });
        return;
    }

    baseIcon ??= fetch(chrome.runtime.getURL('icon-48x48.png'))
        .then(response => response.blob())
        .then(blob => createImageBitmap(blob));
    const image = await baseIcon;
    const canvas = new OffscreenCanvas(48, 48);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, 36, 36);
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = '#202124';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(String(rounded), 45, 44, 40);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(rounded), 45, 44, 40);
    await chrome.action.setIcon({ tabId, imageData: ctx.getImageData(0, 0, 48, 48) });
}

function onRateCommand(command, tab) {
    const step = commandSteps.get(command);
    if (step === undefined) {
        return;
    }

    const targetTab = tab?.id === undefined
        ? chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => activeTab)
        : Promise.resolve(tab);

    // Read the latest rate after any earlier keypress has been applied.
    pending = Promise.all([pending, targetTab]).then(async ([, target]) => {
        if (target?.id === undefined) {
            return;
        }
        const rate = await getOrSetTabMediaRate(target.id);
        if (rate !== undefined) {
            await getOrSetTabMediaRate(target.id, stepMediaRate(rate, step));
        }
    }).catch(() => {
        // Browser pages and tabs that have closed cannot be scripted.
    });
    return pending;
}

chrome.commands.onCommand.addListener(onRateCommand);

async function refreshRateIcon(tabId) {
    try {
        const rate = await getOrSetTabMediaRate(tabId, null, true);
        await showRateIcon(tabId, rate);
    } catch {
        // Browser pages and tabs that have closed cannot be scripted.
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    if (message.type === 'prc-refresh-icon' && tabId !== undefined) {
        refreshRateIcon(tabId).then(() => sendResponse(true));
        return true;
    }
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
    if (change.status === 'loading') {
        showRateIcon(tabId).catch(() => {});
    }
});
