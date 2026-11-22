(() => {
    const watchedRoots = new Map();
    const media = new Set();
    // Shared only with scripts from this extension in the frame's isolated world.
    globalThis.prcTrackedMedia = media;
    const playbackEvents = ['ratechange', 'play', 'pause', 'ended'];
    let scheduled = false;

    function notify() {
        if (scheduled) {
            return;
        }
        scheduled = true;
        queueMicrotask(() => {
            scheduled = false;
            try {
                chrome.runtime.sendMessage({ type: 'prc-refresh-icon' }).catch(() => {});
            } catch {
                // The extension may have been reloaded while this page was open.
            }
        });
    }

    function inspect(element) {
        if (element instanceof HTMLMediaElement) {
            media.add(element);
            notify();
        }
        if (element.shadowRoot) {
            watch(element.shadowRoot);
        }
    }

    function scan(node) {
        if (node instanceof Element) {
            inspect(node);
        }
        for (const descendant of node.querySelectorAll('*')) {
            inspect(descendant);
        }
    }

    function watch(root) {
        if (watchedRoots.has(root)) {
            return;
        }
        for (const event of playbackEvents) {
            root.addEventListener(event, notify, true);
        }
        const observer = new MutationObserver(records => {
            let removed = false;
            for (const record of records) {
                removed ||= record.removedNodes.length > 0;
                for (const node of record.addedNodes) {
                    if (node instanceof Element && node.isConnected) {
                        scan(node);
                    }
                }
            }
            if (removed) {
                for (const element of media) {
                    if (!element.isConnected) {
                        media.delete(element);
                        notify();
                    }
                }
                for (const [shadow, observer] of watchedRoots) {
                    if (shadow.host && !shadow.host.isConnected) {
                        observer.disconnect();
                        for (const event of playbackEvents) {
                            shadow.removeEventListener(event, notify, true);
                        }
                        watchedRoots.delete(shadow);
                    }
                }
            }
        });
        watchedRoots.set(root, observer);
        observer.observe(root, { childList: true, subtree: true });
        scan(root);
    }

    watch(document);
})();
