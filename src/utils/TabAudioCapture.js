export class TabAudioCapture {
    constructor() {
        this.stream = null;
        this.audioContext = null;
        this.sourceNode = null;
        this.analyser = null;
        this._endedHandler = null;

        this.fftSize = 2048;
        this.smoothingTimeConstant = 0.8;

        this._freqData = null;
        this._timeData = null;
    }

    async start() {
        console.log('[TabAudioCapture.start] Called');
        if (this.stream) {
            console.log('[TabAudioCapture.start] Stream already exists, returning nodes');
            return this.getNodes();
        }

        console.log('[TabAudioCapture.start] About to call getDisplayMedia...');
        console.log('[TabAudioCapture.start] This will show browser permission dialog');

        // Must be called from a user gesture (click/tap) or many browsers will block.
        // CRITICAL: Add video constraints to prevent browser freeze
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { max: 640 },
                height: { max: 480 },
                frameRate: { max: 1 }  // Very low frame rate since we only need audio
            },
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        console.log('[TabAudioCapture.start] getDisplayMedia returned stream:', stream);

        const audioTracks = stream.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0) {
            // Stop the capture if no audio track was granted (user didn't enable "Share audio").
            stream.getTracks().forEach(t => t.stop());
            throw new Error("No audio track captured. User must share the tab WITH audio enabled.");
        }

        this.stream = stream;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        this.sourceNode = this.audioContext.createMediaStreamSource(stream);

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;

        this.sourceNode.connect(this.analyser);
        // DO NOT connect to destination - would create echo since tab audio already plays

        this._freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this._timeData = new Uint8Array(this.analyser.fftSize);

        // Clean up when user clicks "Stop sharing" in the browser UI.
        const onEnded = () => {
            this.stop().catch(() => { });
        };
        this._endedHandler = onEnded;
        audioTracks[0].addEventListener("ended", onEnded, { once: true });

        return this.getNodes();
    }

    getNodes() {
        if (!this.stream || !this.audioContext || !this.analyser) return null;
        return {
            stream: this.stream,
            audioContext: this.audioContext,
            analyser: this.analyser
        };
    }

    getFrequencyData() {
        if (!this.analyser || !this._freqData) return null;
        this.analyser.getByteFrequencyData(this._freqData);
        return this._freqData;
    }

    getTimeDomainData() {
        if (!this.analyser || !this._timeData) return null;
        this.analyser.getByteTimeDomainData(this._timeData);
        return this._timeData;
    }

    async stop() {
        if (this.stream) {
            try {
                const audioTracks = this.stream.getAudioTracks();
                if (audioTracks && audioTracks[0] && this._endedHandler) {
                    audioTracks[0].removeEventListener("ended", this._endedHandler);
                }
            } catch (_) { }

            this.stream.getTracks().forEach(t => {
                try { t.stop(); } catch (_) { }
            });
            this.stream = null;
        }

        this.sourceNode = null;
        this.analyser = null;
        this._freqData = null;
        this._timeData = null;

        if (this.audioContext) {
            try { await this.audioContext.close(); } catch (_) { }
            this.audioContext = null;
        }

        this._endedHandler = null;
    }
}
