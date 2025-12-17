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
        // We need to request video to get tab sharing, but we'll stop it immediately
        let stream;
        try {
            // Add timeout to prevent indefinite stall
            const streamPromise = navigator.mediaDevices.getDisplayMedia({
                video: true,  // Required for tab sharing, but we'll stop it immediately
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            // Race between the stream and a timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Screen share dialog timed out after 60 seconds')), 60000)
            );

            stream = await Promise.race([streamPromise, timeoutPromise]);
        } catch (err) {
            console.error('[TabAudioCapture.start] getDisplayMedia failed:', err);
            throw new Error(`Failed to capture tab: ${err.message}. Make sure to allow screen sharing and select a tab with audio.`);
        }

        console.log('[TabAudioCapture.start] getDisplayMedia returned stream:', stream);

        const audioTracks = stream.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0) {
            // Stop the capture if no audio track was granted (user didn't enable "Share audio").
            stream.getTracks().forEach(t => t.stop());
            throw new Error("No audio track captured. User must share the tab WITH audio enabled.");
        }

        // CRITICAL FIX: Stop video tracks immediately since we only need audio
        // This prevents browser crashes and memory issues
        const videoTracks = stream.getVideoTracks();
        videoTracks.forEach(track => {
            console.log('[TabAudioCapture.start] Stopping video track:', track.label);
            track.stop();
        });

        // Create a new stream with ONLY the audio tracks
        // This prevents the browser from stalling on stopped video tracks
        const audioOnlyStream = new MediaStream(audioTracks);
        this.stream = audioOnlyStream;

        console.log('[TabAudioCapture.start] Created audio-only stream with', audioTracks.length, 'track(s)');

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('[TabAudioCapture.start] Created AudioContext, state:', this.audioContext.state);

        if (this.audioContext.state === "suspended") {
            console.log('[TabAudioCapture.start] Resuming suspended AudioContext...');
            await this.audioContext.resume();
            console.log('[TabAudioCapture.start] AudioContext resumed, state:', this.audioContext.state);
        }

        // Use the audio-only stream for the source
        this.sourceNode = this.audioContext.createMediaStreamSource(audioOnlyStream);
        console.log('[TabAudioCapture.start] Created MediaStreamSource from audio-only stream');

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
