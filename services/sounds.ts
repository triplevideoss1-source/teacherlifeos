
type SoundType = 'success' | 'click' | 'notification' | 'switch' | 'delete';

type SoundRecipe = {
    frequency: number;
    duration: number;
    type: OscillatorType;
    volume: number;
    rampTo?: number;
};

const SOUND_RECIPES: Record<SoundType, SoundRecipe> = {
    success: { frequency: 880, duration: 0.18, type: 'sine', volume: 0.14, rampTo: 1320 },
    click: { frequency: 520, duration: 0.05, type: 'square', volume: 0.08, rampTo: 460 },
    notification: { frequency: 740, duration: 0.14, type: 'triangle', volume: 0.12, rampTo: 988 },
    switch: { frequency: 620, duration: 0.07, type: 'triangle', volume: 0.09, rampTo: 760 },
    delete: { frequency: 220, duration: 0.11, type: 'sawtooth', volume: 0.1, rampTo: 140 }
};

class SoundService {
    private context: AudioContext | null = null;
    private isMuted: boolean = false;
    private isUnlocked: boolean = false;

    private getOrCreateContext() {
        if (this.context) {
            return this.context;
        }

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.context = new AudioContextClass();
        } catch (e) {
            console.error("Web Audio API not supported", e);
            return null;
        }

        return this.context;
    }

    /**
     * MUST be called from a user interaction event (click, touch) to unlock audio on iOS/Chrome.
     */
    async initialize() {
        if (this.isUnlocked) return;

        const context = this.getOrCreateContext();
        if (!context) return;

        try {
            // Resume context if suspended (browser autoplay policy)
            if (context.state === 'suspended') {
                await context.resume();
            }
            
            // Play a silent buffer to fully unlock iOS
            const buffer = context.createBuffer(1, 1, 22050);
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start(0);
            
            this.isUnlocked = true;
        } catch (e) {
            console.error("Audio unlock failed", e);
        }
    }

    play(type: SoundType) {
        if (this.isMuted || !this.isUnlocked) return;

        const context = this.getOrCreateContext();
        if (!context || context.state !== 'running') return;

        const recipe = SOUND_RECIPES[type];
        if (!recipe) return;

        const now = context.currentTime;
        const source = context.createOscillator();
        const gainNode = context.createGain();
        source.type = recipe.type;
        source.frequency.setValueAtTime(recipe.frequency, now);

        if (recipe.rampTo) {
            source.frequency.exponentialRampToValueAtTime(recipe.rampTo, now + recipe.duration);
        }

        gainNode.gain.setValueAtTime(recipe.volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration);
        
        source.connect(gainNode);
        gainNode.connect(context.destination);
        
        source.start(now);
        source.stop(now + recipe.duration);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

export const soundService = new SoundService();
