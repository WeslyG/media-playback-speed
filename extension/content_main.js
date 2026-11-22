function readOrSetMediaRate(rate, useTrackedMedia) {
    const videos = [];
    const audios = [];
    function collect(element) {
        if (element.localName === 'video') {
            videos.push(element);
        } else if (element.localName === 'audio') {
            audios.push(element);
        }
    }

    if (useTrackedMedia && globalThis.prcTrackedMedia) {
        for (const element of globalThis.prcTrackedMedia) {
            if (element.isConnected) collect(element);
        }
    } else {
        // A user action also finds players created since the last observer callback.
        const roots = [document];
        for (const root of roots) {
            for (const element of root.querySelectorAll('*')) {
                collect(element);
                if (element.shadowRoot) roots.push(element.shadowRoot);
            }
        }
    }

    if (rate !== null) {
        for (const media of [...videos, ...audios]) {
            try {
                media.playbackRate = rate;
            } catch (error) {
                // A browser may reject rates outside its supported range.
                if (error.name !== 'NotSupportedError') {
                    throw error;
                }
            }
        }
    }

    const media = videos.find(video => !video.paused)
        ?? audios.find(audio => !audio.paused)
        ?? videos[0]
        ?? audios[0];
    return media ? {
        rate: media.playbackRate,
        hasVideo: media.localName === 'video',
        playing: !media.paused
    } : null;
}

async function getOrSetTabMediaRate(tabId, rate = null, useTrackedMedia = false) {
    const frames = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: readOrSetMediaRate,
        args: [rate, useTrackedMedia]
    });

    // Prefer the media the user is currently watching or listening to.
    const media = frames.find(frame => frame.result?.playing && frame.result.hasVideo)
        ?? frames.find(frame => frame.result?.playing)
        ?? frames.find(frame => frame.result?.hasVideo)
        ?? frames.find(frame => frame.result);
    return media?.result.rate;
}

function stepMediaRate(rate, step) {
    return Math.max(0.1, Math.min(100, Math.round((rate + step) * 100) / 100));
}

