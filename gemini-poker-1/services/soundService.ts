import { SoundKey } from '../types';

export class SoundService {
    private audioContext: AudioContext | null = null;
    private soundBuffers: Map<SoundKey, AudioBuffer> = new Map();
    private isUnlocked = false;

    constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.unlockAudio();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
        }
    }

    private unlockAudio() {
        if (this.isUnlocked || !this.audioContext) return;
        
        const unlock = () => {
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
            if (this.audioContext?.state === 'running') {
                this.isUnlocked = true;
                document.body.removeEventListener('click', unlock);
                document.body.removeEventListener('touchend', unlock);
            }
        };

        document.body.addEventListener('click', unlock);
        document.body.addEventListener('touchend', unlock);
    }

    private async loadSound(key: SoundKey, url: string): Promise<void> {
        if (!this.audioContext) return;
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(key, audioBuffer);
        } catch (error) {
            console.error(`Failed to load sound: ${key}`, error);
        }
    }

    async loadAllSounds(sounds: Record<SoundKey, string>): Promise<void> {
        const promises = Object.entries(sounds).map(([key, url]) => 
            this.loadSound(key as SoundKey, url)
        );
        await Promise.all(promises);
    }

    playSound(key: SoundKey): void {
        if (!this.audioContext || !this.isUnlocked) return;

        const audioBuffer = this.soundBuffers.get(key);
        if (audioBuffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.start(0);
        } else {
            console.warn(`Sound not found: ${key}`);
        }
    }

    destroy(): void {
        this.audioContext?.close();
    }
}
