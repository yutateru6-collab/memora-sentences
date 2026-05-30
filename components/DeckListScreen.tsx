
import React from 'react';
import { StoredMaterial } from '../types';
import { Theme } from '../App';
import GridIcon from './icons/GridIcon';

interface DeckListScreenProps {
  decks: StoredMaterial[];
  onStudy: (id: number) => void;
  onGame: (id: number) => void;
  onBack: () => void;
  onRead: (id: number) => void;
  onViewList: (id: number) => void;
  T: Theme;
}

const DeckItem: React.FC<{
  deck: StoredMaterial;
  onStudy: (id: number) => void;
  onGame: (id: number) => void;
  onRead: (id: number) => void;
  onViewList: (id: number) => void;
  T: Theme;
}> = ({ deck, onStudy, onGame, onRead, onViewList, T }) => {
  // A placeholder for word count, would require reading the file or storing it.
  const cardCount = deck.cardStats ? Object.keys(deck.cardStats).length : '??';

  return (
    <div className={`${T.containerBg} rounded-lg shadow-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
      <div className="flex-grow">
        <h2 className={`text-xl font-bold ${T.textPrimary}`}>{deck.name}</h2>
        <p className={`text-sm ${T.textMuted}`}>{cardCount} 枚のカード</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
         <button 
            onClick={() => onViewList(deck.id)}
            className={`px-3 py-2 ${T.button} rounded-md font-semibold text-sm transition-colors flex items-center gap-1`}
            title="一覧表示"
        >
            <GridIcon className="w-4 h-4" />
            <span className="hidden sm:inline">一覧</span>
        </button>
        <button 
            onClick={() => onGame(deck.id)}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-md font-semibold text-sm transition-colors"
        >
          ゲーム
        </button>
        <button 
          onClick={() => onStudy(deck.id)}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md font-semibold text-sm transition-colors"
        >
          学習
        </button>
        {deck.hasTextFile && (
          <button 
            onClick={() => onRead(deck.id)}
            className={`px-4 py-2 ${T.button} rounded-md font-semibold text-sm transition-colors`}
          >
            読込
          </button>
        )}
      </div>
    </div>
  );
};

const DeckListScreen: React.FC<DeckListScreenProps> = ({ decks, onStudy, onGame, onBack, onRead, onViewList, T }) => {
  return (
    <div className="flex-grow flex flex-col items-center justify-start p-4 md:p-8 space-y-8">
      <div className="w-full max-w-4xl">
        <header className="flex justify-between items-center mb-6">
          <button onClick={onBack} className={`flex items-center gap-2 px-3 py-2 text-sm ${T.button} rounded-md transition-colors`}>
            &larr; 戻る
          </button>
          <h1 className={`text-3xl font-bold ${T.textPrimary}`}>マイデッキ一覧</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </header>

        <div className="space-y-4">
          {decks.length > 0 ? (
            decks.map(deck => (
              <DeckItem key={deck.id} deck={deck} onStudy={onStudy} onGame={onGame} onRead={onRead} onViewList={onViewList} T={T} />
            ))
          ) : (
            <div className={`text-center p-8 rounded-lg ${T.containerBg}`}>
              <p className={`${T.textMuted}`}>利用可能な単語デッキはありません。</p>
              <p className={`${T.textMuted} text-sm mt-2`}>ライブラリから単語データ付きの教材を追加してください。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckListScreen;
