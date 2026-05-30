
import React, { useState } from 'react';
import { Card } from '../types';
import { Theme } from '../App';

interface CardListScreenProps {
  cards: Card[];
  deckName: string;
  onBack: () => void;
  T: Theme;
}

export const CardListScreen: React.FC<CardListScreenProps> = ({ cards, deckName, onBack, T }) => {
  // Store the current face index for each card: 0..3
  const [cardStates, setCardStates] = useState<number[]>(new Array(cards.length).fill(0));
  // Selection state mimicking the checkbox in provided images
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const getFaces = (card: Card) => {
      // Logic matching FlashcardScreen
      return [
          card.front,
          card.back,
          card.pronunciation,
          card.memo
      ].filter(f => typeof f === 'string' && f.trim() !== '');
  };

  const handleCardClick = (index: number) => {
      setCardStates(prev => {
          const next = [...prev];
          const facesCount = getFaces(cards[index]).length || 1;
          next[index] = (next[index] + 1) % facesCount;
          return next;
      });
  };

  const handleCheckboxClick = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setSelectedIndices(prev => {
          const next = new Set(prev);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
      });
  };

  const handleFlipAll = () => {
      setCardStates(prev => prev.map((s, i) => {
          const facesCount = getFaces(cards[i]).length || 1;
          return (s + 1) % facesCount;
      }));
  };

  const handleResetAll = () => {
      setCardStates(new Array(cards.length).fill(0));
  };

  return (
    <div className={`flex flex-col h-screen ${T.bg}`}>
      {/* Header */}
      <header className={`flex-shrink-0 flex items-center justify-between p-3 ${T.containerBg} shadow-md z-10 border-b ${T.border}`}>
        <div className="flex items-center gap-4">
             <button onClick={onBack} className={`flex items-center gap-2 px-3 py-2 text-sm ${T.button} rounded-md transition-colors`}>
              &larr; 戻る
            </button>
            <h1 className={`text-xl font-bold ${T.textPrimary}`}>{deckName} <span className="text-sm font-normal opacity-70">({cards.length}枚)</span></h1>
        </div>
        <div className="flex gap-2">
            <button onClick={handleResetAll} className={`px-3 py-2 text-xs sm:text-sm ${T.button} rounded-md whitespace-nowrap`}>
                すべて表へ
            </button>
            <button onClick={handleFlipAll} className={`px-3 py-2 text-xs sm:text-sm ${T.accentBg} text-white rounded-md font-bold whitespace-nowrap`}>
                一括めくり
            </button>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-grow overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {cards.map((card, index) => {
                const faces = getFaces(card);
                const currentFaceIdx = cardStates[index];
                const content = faces[currentFaceIdx % (faces.length || 1)] || '(No Content)';
                const isFront = currentFaceIdx === 0;
                const isSelected = selectedIndices.has(index);

                return (
                    <div 
                        key={card.id}
                        onClick={() => handleCardClick(index)}
                        className={`
                            relative aspect-[4/3] rounded-xl border cursor-pointer transition-all duration-200 select-none overflow-hidden flex items-center justify-center text-center p-4 shadow-sm hover:shadow-md
                            ${isFront ? T.containerBg : T.highlightBg}
                            ${T.border}
                            ${!isFront ? 'border-sky-500/50' : ''}
                        `}
                    >
                        {/* Checkbox */}
                        <div 
                            className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-colors hover:bg-white/10 z-10 ${isSelected ? 'bg-sky-500 border-sky-500' : `border-gray-500 ${T.bg}`}`}
                            onClick={(e) => handleCheckboxClick(e, index)}
                        >
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                        </div>

                        {/* ID Badge */}
                        <div className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded ${T.button} opacity-70`}>
                            ID {card.id}
                        </div>

                        {/* Content */}
                        <div className={`text-sm sm:text-base font-bold ${T.textPrimary} line-clamp-4 break-words w-full`}>
                            {content}
                        </div>

                        {/* Face Indicator (Dots) */}
                        {faces.length > 1 && (
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                {faces.map((_, i) => (
                                    <div key={i} className={`w-1 h-1 rounded-full ${i === currentFaceIdx ? 'bg-sky-400' : 'bg-gray-600'}`} />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </main>
    </div>
  );
};
