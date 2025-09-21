
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameState, Hand, Card, AIHint } from './types';
import * as pokerService from './services/pokerService';
import { getAIHint } from './services/geminiService';
import { SoundService } from './services/soundService';
import PixiGame from './game/PixiGame';
import { Button } from './components/ui/Button';
import { Slider } from './components/ui/Slider';
import { Alert, AlertDescription, AlertTitle } from './components/ui/Alert';
import { Dialog } from './components/ui/Dialog';
import { Input } from './components/ui/Input';
import { Label } from './components/ui/Label';
import { ChipIcon, LightbulbIcon, LoaderIcon, BookOpenIcon } from './components/icons';
import { STARTING_BALANCE, MIN_BET, MAX_BET, SOUND_ASSETS, ANTE_BONUS_PAYOUT, HAND_NAMES } from './constants';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
    const [balance, setBalance] = useState<number>(STARTING_BALANCE);
    const [anteBet, setAnteBet] = useState<number>(MIN_BET);
    const [playerHand, setPlayerHand] = useState<Hand | null>(null);
    const [dealerHand, setDealerHand] = useState<Hand | null>(null);
    const [message, setMessage] = useState<string>('Welcome! Let\'s play some poker.');
    const [aiHint, setAiHint] = useState<AIHint | null>(null);
    const [isHintLoading, setIsHintLoading] = useState<boolean>(false);
    const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
    const [playerName, setPlayerName] = useState<string>('');
    const [nameInput, setNameInput] = useState<string>('');

    const pixiGameRef = useRef<PixiGame | null>(null);
    const soundServiceRef = useRef<SoundService | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current && !pixiGameRef.current) {
            const soundService = new SoundService();
            soundServiceRef.current = soundService;
            const game = new PixiGame(canvasRef.current, soundService);
            pixiGameRef.current = game;

            Promise.all([
                game.loadAssets(),
                soundService.loadAllSounds(SOUND_ASSETS)
            ]).then(() => {
                setGameState(GameState.NAMING);
                setMessage('Enter your name to begin');
            }).catch(err => {
                console.error("Failed to load game assets:", err);
                setMessage("Error loading assets. Please refresh.");
            });
        }
        return () => {
            pixiGameRef.current?.destroy();
            pixiGameRef.current = null;
            soundServiceRef.current?.destroy();
            soundServiceRef.current = null;
        };
    }, []);

    const resetHands = useCallback(() => {
        setPlayerHand(null);
        setDealerHand(null);
        setAiHint(null);
        pixiGameRef.current?.clearTable(playerName);
    }, [playerName]);

    const playSound = (sound: any) => soundServiceRef.current?.playSound(sound);

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (nameInput.trim()) {
            const finalName = nameInput.trim();
            setPlayerName(finalName);
            pixiGameRef.current?.setPlayerName(finalName);
            setGameState(GameState.BETTING);
            setMessage('Place your Ante bet to start');
        }
    };

    const handleDeal = () => {
        if (balance < anteBet) {
            setMessage("Not enough balance for this bet!");
            return;
        }
        playSound('click');
        playSound('chip');
        resetHands();
        setBalance(prev => prev - anteBet);
        setGameState(GameState.DEALING);
        setMessage('');

        const { playerHand: newPlayerHand, dealerHand: newDealerHand } = pokerService.dealHands();
        setPlayerHand(newPlayerHand);
        setDealerHand(newDealerHand);

        pixiGameRef.current?.dealCards(newPlayerHand, newDealerHand).then(() => {
            setGameState(GameState.PLAYER_TURN);
            setMessage('Play or Fold?');
        });
    };
    
    const handleFold = () => {
        playSound('click');
        setGameState(GameState.PAYOUT);

        const bonus = playerHand ? pokerService.calculateAnteBonus(playerHand, anteBet) : 0;
        if (bonus > 0) {
            playSound('win');
            setBalance(prev => prev + bonus);
            const playerEval = pokerService.evaluateHand(playerHand!);
            setMessage(`${playerName} folded, but won a ${playerEval.name} bonus!`);
        } else {
            playSound('lose');
            setMessage(`${playerName} folded. Dealer wins.`);
        }

        setTimeout(startNewRound, 2000);
    };
    
    const handlePlay = () => {
        playSound('click');
        if (balance < anteBet) {
            setMessage("Not enough balance to play!");
            return;
        }
        if (!dealerHand) {
            console.error("handlePlay called but dealerHand is null");
            return;
        }

        setBalance(prev => prev - anteBet);
        playSound('chip');
        setGameState(GameState.REVEAL);
        setMessage('Revealing hands...');

        pixiGameRef.current?.revealDealerHand(dealerHand).then(() => {
            if (!playerHand) return;

            const result = pokerService.determineWinner(playerHand, dealerHand);
            const payout = pokerService.calculatePayout(anteBet, playerHand, result);
            const bonus = pokerService.calculateAnteBonus(playerHand, anteBet);
            
            if (result.result === 'player') {
                pixiGameRef.current?.showPlayerWinAnimation();
            } else if (result.result === 'dealer') {
                pixiGameRef.current?.showPlayerLossAnimation();
            }

            // Play distinct sound for win (any monetary gain) or loss. No sound for a push.
            if (result.result === 'player' || bonus > 0) {
                playSound('win');
            } else if (result.result === 'dealer') {
                // This case only runs if the player lost and did not get a bonus.
                playSound('lose');
            }

            setBalance(prev => prev + payout);
            
            let finalMessage = result.message.replace('You', playerName);
            if (bonus > 0 && result.result === 'dealer') {
                 const playerEval = pokerService.evaluateHand(playerHand!);
                 finalMessage = `${result.message.replace('You', playerName)} ${playerName} wins an Ante Bonus for ${playerEval.name}!`;
            }
            setMessage(finalMessage);

            setTimeout(startNewRound, 4000);
        });
    };

    const startNewRound = () => {
        setGameState(GameState.BETTING);
        resetHands();
        if (balance < MIN_BET) {
            setMessage('Game Over! Not enough balance.');
        } else {
             setMessage('Place your Ante bet for the next round');
        }
    };
    
    const handleGetHint = async () => {
        if (!playerHand) return;
        playSound('click');
        setIsHintLoading(true);
        setAiHint(null);
        try {
            const hint = await getAIHint(playerHand);
            setAiHint(hint);
        } catch (error) {
            console.error("Error getting AI hint:", error);
            setAiHint({ recommendation: 'Fold', reason: 'Could not fetch hint due to an error.' });
        } finally {
            setIsHintLoading(false);
        }
    };

    const getHintAlertClass = () => {
        if (!aiHint) return '';
        switch (aiHint.recommendation) {
            case 'Strong Play': return 'border-green-500/50';
            case 'Marginal Play': return 'border-yellow-500/50';
            case 'Fold': return 'border-red-500/50';
            default: return 'border-slate-500/50';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden">
            <div className="absolute top-4 left-4 text-left">
                <h1 className="text-3xl font-bold text-amber-300 tracking-wider">Three-Card Poker</h1>
                <p className="text-slate-400">AI Challenge</p>
                 <Button variant="outline" size="sm" onClick={() => setIsRulesOpen(true)} className="mt-4 bg-slate-800/50">
                    <BookOpenIcon className="w-4 h-4 mr-2"/>
                    Game Rules
                </Button>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-4 bg-slate-900/50 backdrop-blur-sm p-3 rounded-lg border border-slate-700">
                <ChipIcon className="w-8 h-8 text-amber-400" />
                <div>
                    <p className="text-slate-400 text-sm">Balance</p>
                    <p className="text-2xl font-bold tracking-tighter">${balance.toLocaleString()}</p>
                </div>
            </div>
            
            <div className="relative w-[1000px] h-[600px] bg-green-800 rounded-full border-8 border-yellow-800 shadow-2xl overflow-hidden" style={{background: 'radial-gradient(ellipse at center, #15803d 0%, #166534 100%)'}}>
                 <canvas ref={canvasRef} className="w-full h-full" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                     <p className={`text-4xl font-bold text-white transition-opacity duration-500 ${message ? 'opacity-100' : 'opacity-0'}`} style={{textShadow: '2px 2px 4px rgba(0,0,0,0.7)'}}>
                        {message}
                    </p>
                 </div>
                 <div className="absolute bottom-28 left-8 bg-black/30 p-3 rounded-lg text-sm text-slate-300 border border-slate-500/50">
                     <h4 className="font-bold text-amber-300 text-base mb-1">Ante Bonus Payouts</h4>
                     <ul className="space-y-1">
                        {Object.entries(ANTE_BONUS_PAYOUT).sort((a,b) => b[1] - a[1]).map(([handRank, payout]) => (
                            <li key={handRank} className="flex justify-between">
                                <span className="text-slate-300">{HAND_NAMES[handRank as unknown as keyof typeof HAND_NAMES]}:</span>
                                <span className="font-mono ml-4 text-slate-200">{payout} to 1</span>
                            </li>
                        ))}
                     </ul>
                 </div>
            </div>

            <div className="w-[1000px] h-48 bg-slate-900/80 backdrop-blur-md rounded-b-xl -mt-24 pt-28 p-6 flex items-center justify-between border-t-2 border-amber-400/50">
                {gameState === GameState.NAMING && (
                    <form onSubmit={handleNameSubmit} className="w-full flex items-center justify-center gap-4">
                        <div className="w-1/2">
                             <Label htmlFor="name" className="text-lg font-semibold text-slate-300 mb-2 block">Enter Your Name</Label>
                             <Input 
                                id="name"
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="Poker Pro"
                                autoFocus
                            />
                        </div>
                        <Button type="submit" size="lg" className="self-end">
                           Start Playing
                        </Button>
                    </form>
                )}
                 {gameState === GameState.BETTING && balance >= MIN_BET && (
                    <div className="w-full flex items-center gap-6">
                        <div className="flex-grow flex items-center gap-4">
                            <p className="text-lg font-semibold text-slate-300">ANTE BET</p>
                             <Slider value={anteBet} onValueChange={setAnteBet} min={MIN_BET} max={Math.min(MAX_BET, balance)} step={5}/>
                            <span 
                                key={anteBet}
                                className="inline-block animate-[pop-in_0.2s_ease-out] text-2xl font-bold text-amber-300 w-24 text-center"
                            >
                                ${anteBet}
                            </span>
                        </div>
                        <Button onClick={handleDeal} size="lg" className="w-64">
                            Deal Cards
                        </Button>
                    </div>
                )}
                 {gameState === GameState.PLAYER_TURN && (
                    <div className="w-full flex items-center justify-center gap-4">
                        <Button onClick={() => handlePlay()} size="lg" className="w-48 bg-green-600 hover:bg-green-700">
                            Play (${anteBet})
                        </Button>
                        <Button onClick={handleFold} size="lg" variant="destructive" className="w-48">
                            Fold
                        </Button>
                        <Button onClick={handleGetHint} size="lg" variant="outline" className="w-48" disabled={isHintLoading}>
                            {isHintLoading ? <LoaderIcon className="animate-spin w-5 h-5 mr-2" /> : <LightbulbIcon className="w-5 h-5 mr-2" />}
                            Get AI Hint
                        </Button>
                    </div>
                )}
                {aiHint && (
                     <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96">
                        <Alert className={`${getHintAlertClass()} bg-slate-800/80 backdrop-blur-sm`}>
                            <LightbulbIcon className="h-4 w-4 text-amber-300" />
                            <AlertTitle className="text-amber-300">AI Recommends: {aiHint.recommendation}</AlertTitle>
                            <AlertDescription className="text-slate-300">
                                {aiHint.reason}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                 {gameState === GameState.LOADING && (
                    <div className="w-full text-center text-slate-400 flex items-center justify-center gap-2">
                        <LoaderIcon className="animate-spin w-5 h-5" />
                        Loading Game Assets...
                    </div>
                 )}
            </div>

            <Dialog isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} title="Game Rules">
                <div className="space-y-4 text-slate-300">
                    <div>
                        <h3 className="font-bold text-lg text-amber-300 mb-2">How to Play</h3>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Place an 'Ante' bet to begin the round.</li>
                            <li>You and the Dealer each receive three cards.</li>
                            <li>Review your hand and decide to 'Play' by placing a second bet equal to your Ante, or 'Fold' to forfeit your Ante bet.</li>
                            <li>If you Play, the hands are compared. The Dealer's hand must be Queen-High or better to 'qualify'.</li>
                        </ol>
                    </div>
                     <div>
                        <h3 className="font-bold text-lg text-amber-300 mb-2">Hand Rankings (Highest to Lowest)</h3>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>Straight Flush:</strong> Three cards in sequence and of the same suit.</li>
                            <li><strong>Three of a Kind:</strong> Three cards of the same rank.</li>
                            <li><strong>Straight:</strong> Three cards in sequence, but not of the same suit.</li>
                            <li><strong>Flush:</strong> Three cards of the same suit, but not in sequence.</li>
                            <li><strong>Pair:</strong> Two cards of the same rank.</li>
                            <li><strong>High Card:</strong> The highest card in your hand.</li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="font-bold text-lg text-amber-300 mb-2">Payouts</h3>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>If you win (and Dealer qualifies):</strong> Ante and Play bets both pay 1-to-1.</li>
                            <li><strong>If you win (Dealer doesn't qualify):</strong> Ante bet pays 1-to-1, Play bet is a push (returned).</li>
                            <li><strong>If you lose:</strong> Both Ante and Play bets are lost.</li>
                            <li><strong>If it's a tie:</strong> Both Ante and Play bets are a push.</li>
                             <li><strong>Ante Bonus:</strong> You receive a special bonus for strong hands (Straight or better), paid regardless of the Dealer's hand. This is paid even if you fold.</li>
                        </ul>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default App;