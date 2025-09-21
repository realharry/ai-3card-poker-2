import { Card, Hand } from '../types';
import { CARD_SPRITESHEET_URL, CARD_BACK_ASSET } from '../constants';
import { SoundService } from '../services/soundService';

// Forward-declare PIXI
declare const PIXI: any;

type Particle = {
    sprite: any;
    vx: number;
    vy: number;
    life: number;
};

class PixiGame {
    private app: any;
    private textures: any = {};
    private cardSprites: any[] = [];
    private dealerCardSprites: any[] = [];
    private playerCardSprites: any[] = [];
    private particles: Particle[] = [];
    private soundService: SoundService;
    private playerNameText: any = null;

    constructor(canvas: HTMLCanvasElement, soundService: SoundService) {
        this.app = new PIXI.Application({
            view: canvas,
            width: 1000,
            height: 600,
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        this.soundService = soundService;
    }

    async loadAssets(): Promise<void> {
        const sheet = await PIXI.Assets.load(CARD_SPRITESHEET_URL);
        this.textures = sheet.textures;
    }

    setPlayerName(name: string): void {
        if (this.playerNameText) {
            this.app.stage.removeChild(this.playerNameText);
            this.playerNameText = null;
        }
        
        const style = new PIXI.TextStyle({
            fontFamily: '"Titillium Web", sans-serif',
            fontSize: 24,
            fontWeight: '600',
            fill: '#fde047', // amber-300
            stroke: '#000000',
            strokeThickness: 4,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 3,
        });

        this.playerNameText = new PIXI.Text(name, style);
        this.playerNameText.anchor.set(0.5);
        this.playerNameText.position.set(500, 520);
        this.app.stage.addChild(this.playerNameText);
    }

    private getCardTextureName(card: Card): string {
        const rankMap: { [key: string]: string } = { 'T': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king', 'A': 'ace' };
        const suitMap: { [key: string]: string } = { 'C': 'clubs', 'D': 'diamonds', 'H': 'hearts', 'S': 'spades' };
        
        const rankStr = rankMap[card.rank] || card.rank.replace('_','');
        const suitStr = suitMap[card.suit];

        return `${rankStr}_of_${suitStr}.png`;
    }
    
    private createCardSprite(textureName: string, position: {x: number, y: number}) {
        const sprite = new PIXI.Sprite(this.textures[textureName]);
        sprite.anchor.set(0.5);
        sprite.position.set(position.x, position.y);
        sprite.scale.set(0.25);
        this.app.stage.addChild(sprite);
        this.cardSprites.push(sprite);
        return sprite;
    }

    dealCards(playerHand: Hand, dealerHand: Hand): Promise<void> {
      return new Promise(resolve => {
        const dealerPositions = [{x: 425, y: 150}, {x: 500, y: 150}, {x: 575, y: 150}];
        const playerPositions = [{x: 425, y: 450}, {x: 500, y: 450}, {x: 575, y: 450}];

        const totalCards = 6;

        const dealCard = (index: number) => {
            if (index >= totalCards) {
                setTimeout(resolve, 300);
                return;
            }
            this.soundService.playSound('deal');

            const isPlayerCard = index % 2 === 0;
            const cardIndex = Math.floor(index / 2);

            if (isPlayerCard) {
                const sprite = this.createCardSprite(CARD_BACK_ASSET, {x: 500, y: -100});
                this.playerCardSprites.push(sprite);
                this.animate(sprite, { position: playerPositions[cardIndex], scale: {x: 0.35, y: 0.35} }, 400, { easing: this.easing.easeOutBack }).then(() => {
                    this.flipCard(sprite, this.getCardTextureName(playerHand[cardIndex]));
                });
            } else {
                const sprite = this.createCardSprite(CARD_BACK_ASSET, {x: 500, y: -100});
                this.dealerCardSprites.push(sprite);
                this.animate(sprite, { position: dealerPositions[cardIndex], scale: {x: 0.35, y: 0.35} }, 400, { easing: this.easing.easeOutBack });
            }
            
            setTimeout(() => dealCard(index + 1), 150);
        }

        dealCard(0);
      });
    }

    revealDealerHand(dealerHand: Hand): Promise<void> {
        return new Promise(resolve => {
            if (!dealerHand) {
                 console.error("Dealer hand not provided for reveal animation.");
                 resolve();
                 return;
            }

            this.dealerCardSprites.forEach((sprite, index) => {
                setTimeout(() => {
                    if (dealerHand[index]) {
                       this.flipCard(sprite, this.getCardTextureName(dealerHand[index]));
                    }
                    if (index === this.dealerCardSprites.length - 1) {
                         setTimeout(resolve, 500);
                    }
                }, index * 200);
            });
        });
    }

    private flipCard(sprite: any, finalTextureName: string): Promise<void> {
        this.soundService.playSound('flip');
        return new Promise(resolve => {
            const finalTexture = this.textures[finalTextureName];
            const timeline = { val: 0 };
            const onUpdate = () => {
                if (timeline.val >= 0.5) {
                    sprite.texture = finalTexture;
                }
                sprite.scale.x = 0.35 * Math.cos(timeline.val * Math.PI);
            };
            this.animate(timeline, { val: 1 }, 250, { onUpdate, onComplete: resolve });
        });
    }

    clearTable(playerName?: string): void {
        this.cardSprites.forEach(sprite => {
            sprite.filters = null;
            this.animate(sprite, {alpha: 0}, 300, { onComplete: () => this.app.stage.removeChild(sprite) });
        });
        
        this.app.ticker.remove(this.particleUpdate);
        this.particles.forEach(p => this.app.stage.removeChild(p.sprite));
        this.particles = [];

        this.cardSprites = [];
        this.playerCardSprites = [];
        this.dealerCardSprites = [];

        if (this.playerNameText && !playerName) {
            this.app.stage.removeChild(this.playerNameText);
            this.playerNameText = null;
        }
    }
    
    showPlayerWinAnimation(): void {
        const cardPositions = this.playerCardSprites.map(s => s.position);

        for (const pos of cardPositions) {
            for (let i = 0; i < 20; i++) { // 20 particles per card
                const particleSprite = new PIXI.Graphics();
                particleSprite.beginFill(Math.random() > 0.5 ? 0xFFFFFF : 0xFFD700); // White or gold
                particleSprite.drawCircle(0, 0, Math.random() * 2 + 1);
                particleSprite.endFill();
                particleSprite.x = pos.x;
                particleSprite.y = pos.y;
                particleSprite.alpha = 1;
                
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 0.5;
                
                const particle: Particle = {
                    sprite: particleSprite,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: Math.random() * 60 + 30, // 30-90 frames
                };
                
                this.particles.push(particle);
                this.app.stage.addChild(particleSprite);
            }
        }

        if (this.particles.length > 0) {
            this.app.ticker.add(this.particleUpdate);
        }
    }
    
    showPlayerLossAnimation(): void {
        const desaturationFilter = new PIXI.filters.ColorMatrixFilter();
        desaturationFilter.saturate(0.3, true);
        this.playerCardSprites.forEach(sprite => {
            sprite.filters = [desaturationFilter];
        });
    }

    private particleUpdate = () => {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life--;

            if (p.life <= 0) {
                this.app.stage.removeChild(p.sprite);
                this.particles.splice(i, 1);
            } else {
                p.sprite.x += p.vx;
                p.sprite.y += p.vy;
                p.sprite.alpha = p.life / 60; // Fade out
            }
        }
        if (this.particles.length === 0) {
            this.app.ticker.remove(this.particleUpdate);
        }
    }
    
    private easing = {
        linear: (t: number) => t,
        easeOutBack: (t: number) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
    };
    
    private animate(
        target: any,
        to: any,
        duration: number,
        options: {
            onUpdate?: () => void;
            onComplete?: () => void;
            easing?: (t: number) => number;
        } = {}
    ): Promise<void> {
        return new Promise(resolve => {
            const { onUpdate, onComplete, easing = this.easing.linear } = options;

            const from: any = {};
            for (const key in to) {
                if (typeof to[key] === 'object' && to[key] !== null) {
                    from[key] = {};
                    for (const subKey in to[key]) {
                        from[key][subKey] = target[key][subKey];
                    }
                } else {
                    from[key] = target[key];
                }
            }

            let elapsed = 0;
            const tick = (ticker: any) => {
                elapsed += ticker.elapsedMS;
                const progress = Math.min(1, elapsed / duration);
                const t = easing(progress);

                for (const key in to) {
                     if (typeof to[key] === 'object' && to[key] !== null) {
                        for (const subKey in to[key]) {
                            target[key][subKey] = from[key][subKey] + (to[key][subKey] - from[key][subKey]) * t;
                        }
                    } else {
                        target[key] = from[key] + (to[key] - from[key]) * t;
                    }
                }

                if (onUpdate) onUpdate();

                if (progress === 1) {
                    this.app.ticker.remove(tick);
                    if (onComplete) onComplete();
                    resolve();
                }
            };
            this.app.ticker.add(tick);
        });
    }

    destroy(): void {
        PIXI.Assets.unload(CARD_SPRITESHEET_URL);
        this.app.destroy(true, { children: true, texture: true, baseTexture: true });
    }
}

export default PixiGame;