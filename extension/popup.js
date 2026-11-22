document.addEventListener('DOMContentLoaded', async () => {
    const noContent = document.getElementById('prc-popup-no-content');
    const controls = document.getElementById('prc-popup-content');
    const rateLabel = document.getElementById('prc-rate');

    let tabId;
    let playbackRate;
    let pending = Promise.resolve();

    async function updateRate(requestedRate) {
        try {
            const rate = await getOrSetTabMediaRate(tabId, requestedRate);
            if (rate !== undefined) {
                playbackRate = rate;
                rateLabel.textContent = playbackRate.toFixed(2) + 'x';
                noContent.classList.add('hidden');
                controls.classList.remove('hidden');
                return;
            }
        } catch {
            // Browser pages and tabs that have closed cannot be scripted.
        }

        controls.classList.add('hidden');
        noContent.classList.remove('hidden');
        playbackRate = undefined;
    }

    controls.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;

        pending = pending.then(() => {
            if (playbackRate === undefined) return;
            const { rate, step } = button.dataset;
            return updateRate(step === undefined
                ? Number(rate)
                : stepMediaRate(playbackRate, Number(step)));
        });
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) {
        tabId = tab.id;
        await updateRate(null);
    }
});
