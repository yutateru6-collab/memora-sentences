
import React, { useState, useRef, useEffect } from 'react';
import { StoredMaterial, StoredFolder, TranscriptEntry, Word } from '../types';
import { Theme, Themes } from '../App';
import TrashIcon from './icons/TrashIcon';
import FolderIcon from './icons/FolderIcon';
import MusicIcon from './icons/MusicIcon';
import PlusIcon from './icons/PlusIcon';
import XMarkIcon from './icons/XMarkIcon';
import { getMaterialById } from '../lib/db';

interface UploadScreenProps {
  onLoad: (data: {
    name: string;
    mediaFile?: File;
    textFile?: File;
    wordFile?: File;
    wordContent?: string;
    plainTextContent?: string;
    thumbnail?: string;
  }) => void;
  error: string | null;
  storedMaterials: StoredMaterial[];
  storedFolders: StoredFolder[];
  onLoadFromDB: (id: number) => void;
  onDeleteFromDB: (id: number) => void;
  onUpdateMaterial: (id: number, data: { name?: string; thumbnail?: string, folderId?: number | null, bgmFile?: File | null, wordFile?: File | null, mediaFile?: File | null, textFile?: File | null, quizFile?: File | null, quizBookmarks?: number[] }) => Promise<void>;
  onAddFolder: (name: string) => void;
  onUpdateFolder: (id: number, name: string) => void;
  onDeleteFolder: (id: number) => void;
  onGoToDeckList: () => void;
  onGoToPromptLibrary: () => void;
  onStudy: (id: number) => void;
  onGame: (id: number) => void;
  onStartQuiz: (id: number) => void;
  onLoadBoard?: (data: any) => void; // New prop for board data
  T: Theme;
  setTheme: (themeName: string) => void;
  themes: Themes;
  dueCardCount?: number;
  onStartDailyReview?: () => void;
}

const EditableTitle: React.FC<{ initialTitle: string; onSave: (newTitle: string) => void; T: Theme, isFolder?: boolean }> = ({ initialTitle, onSave, T, isFolder=false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(initialTitle);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        setIsEditing(false);
        if (title.trim() && title !== initialTitle) {
            onSave(title);
        } else {
            setTitle(initialTitle);
        }
    };
    
    const titleClass = isFolder ? `text-lg font-semibold ${T.textPrimary}` : `text-lg font-bold ${T.textPrimary} line-clamp-1`;

    return isEditing ? (
        <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setTitle(initialTitle); setIsEditing(false); } }}
            className={`${titleClass} bg-transparent border-b-2 ${T.border} ${T.ring} outline-none w-full p-0 m-0`}
        />
    ) : (
        <div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className={`${titleClass} cursor-pointer hover:opacity-70 transition-opacity`} title="タイトルを編集">
            {title}
        </div>
    );
};

const formatDuration = (seconds: number | undefined) => {
    if (seconds === undefined || isNaN(seconds)) return '?:??';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// --- Daily Quest Banner ---
const DailyQuestBanner: React.FC<{ count: number; onStart: () => void; T: Theme }> = ({ count, onStart, T }) => {
    if (count <= 0) return null;

    return (
        <div className="w-full mb-8 animate-fade-in">
            <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl group cursor-pointer border border-yellow-500/30 bg-gradient-to-r from-orange-900/80 to-amber-900/80`} onClick={onStart}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-2xl">🔥</span>
                             <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">今日のクエスト</h2>
                        </div>
                        <p className="text-orange-100 text-sm md:text-base font-medium">
                            忘却曲線に基づき、今日復習すべきカードが <span className="text-xl md:text-2xl font-bold text-white">{count}</span> 枚あります。
                        </p>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onStart(); }}
                        className="px-6 py-2 md:px-8 md:py-3 text-sm md:text-base bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold rounded-full shadow-lg transform transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                    >
                        復習を開始する
                    </button>
                </div>
            </div>
        </div>
    );
};

const MaterialCard: React.FC<{
    material: StoredMaterial;
    isDeleteMode: boolean;
    storedFolders: StoredFolder[];
    onLoadFromDB: (id: number) => void;
    onDeleteFromDB: (id: number) => void;
    onUpdateMaterial: (id: number, data: any) => Promise<void>;
    setEditingMaterialId: (id: number | null) => void;
    thumbnailInputRef: React.RefObject<HTMLInputElement>;
    onStudy: (id: number) => void;
    onGame: (id: number) => void;
    onStartQuiz: (id: number) => void;
    T: Theme;
    onLoadBoard?: (data: any) => void;
}> = ({ material, isDeleteMode, storedFolders, onLoadFromDB, onDeleteFromDB, onUpdateMaterial, setEditingMaterialId, thumbnailInputRef, onStudy, onGame, onStartQuiz, T, onLoadBoard }) => {
    const [isAddingBgm, setIsAddingBgm] = useState(false);
    const [isAddingWordFile, setIsAddingWordFile] = useState(false);
    const [isAddingFile, setIsAddingFile] = useState(false);
    const [isEditingFolder, setIsEditingFolder] = useState(false);
    
    const [isPasting, setIsPasting] = useState(false);
    const [pasteContent, setPasteContent] = useState('');

    const folderName = material.folderId ? storedFolders.find(f => f.id === material.folderId)?.name : 'フォルダなし';

    const handleBgmFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onUpdateMaterial(material.id, { bgmFile: file });
        setIsAddingBgm(false);
        e.target.value = '';
    };
    const handleWordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onUpdateMaterial(material.id, { wordFile: file });
        setIsAddingWordFile(false);
        e.target.value = '';
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isAudioVideo = file.type.startsWith('audio/') || file.type.startsWith('video/') || /\.(mp3|m4a|mp4|mov|wav|ogg|flac)$/i.test(file.name);
            const isText = file.type === 'application/json' || file.type === 'text/plain' || /\.(json|txt)$/i.test(file.name);
            if (isAudioVideo) onUpdateMaterial(material.id, { mediaFile: file });
            else if (isText) onUpdateMaterial(material.id, { textFile: file });
            else onUpdateMaterial(material.id, { mediaFile: file });
        }
        setIsAddingFile(false);
        e.target.value = '';
    };
    
    const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const handlePasteSave = async () => {
         if (!pasteContent.trim()) return;
        
        try {
            const cleanedContent = pasteContent.trim()
                .replace(/^```json\s*/, '')
                .replace(/^```\s*/, '')
                .replace(/\s*```$/, '');

            const parsedData = JSON.parse(cleanedContent);

            // Check if it is Board Data or Amazon Data
            if ((parsedData.posts || parsedData.mode === 'amazon') && onLoadBoard) {
                if (parsedData.posts || parsedData.product) {
                    const contentToSave = JSON.stringify(parsedData);
                    const fileName = parsedData.mode === 'amazon' ? 'amazon_data.json' : 'board_data.json';
                    const file = new File([new Blob([contentToSave], { type: 'application/json' })], fileName, { type: 'application/json' });
                    await onUpdateMaterial(material.id, { textFile: file });
                    setIsPasting(false);
                    setPasteContent('');
                    setIsAddingFile(false);
                    onLoadFromDB(material.id);
                    return;
                }
            }

            let finalEntries: TranscriptEntry[] = [];
            let flatTimestamps: Word[] | null = null;
            let sentenceEntries: TranscriptEntry[] | null = null;

            if (Array.isArray(parsedData)) {
                sentenceEntries = parsedData as TranscriptEntry[];
            } else if (parsedData.timestamps && Array.isArray(parsedData.timestamps)) {
                flatTimestamps = parsedData.timestamps as Word[];
            } else {
                 throw new Error("Invalid format: Expected array or object with 'timestamps', 'posts', or 'mode: amazon'");
            }
            
             if (flatTimestamps) {
                 if (!material.hasTextFile) {
                     alert("エラー: タイムスタンプを適用するためのテキストが見つかりません。先にテキストを追加してください。");
                     return;
                 }
                 const fullMaterial = await getMaterialById(material.id);
                 if (!fullMaterial.textFile) throw new Error("Text file missing");
                 
                 const text = await fullMaterial.textFile.text();
                 const existingEntries = JSON.parse(text) as TranscriptEntry[];
                 let tsIndex = 0;
                 finalEntries = existingEntries.map(entry => {
                     const targetClean = normalize(entry.english);
                     if (targetClean.length === 0) return { ...entry, words: [], start: 0, end: 0 };
                     let accumulatedClean = "";
                     const newWords: Word[] = [];
                     let start = Infinity;
                     let end = -Infinity;

                     while (flatTimestamps && tsIndex < flatTimestamps.length) {
                         const ts = flatTimestamps[tsIndex];
                         const tsWordClean = normalize(ts.word);
                         if (accumulatedClean.length + tsWordClean.length > targetClean.length) {
                             const overrun = (accumulatedClean.length + tsWordClean.length) - targetClean.length;
                             const underrun = targetClean.length - accumulatedClean.length;
                             if (underrun < overrun && newWords.length > 0) break;
                         }
                         accumulatedClean += tsWordClean;
                         newWords.push(ts);
                         if (ts.start < start) start = ts.start;
                         if (ts.end > end) end = ts.end;
                         tsIndex++;
                         if (accumulatedClean.length >= targetClean.length) break;
                     }
                     if (newWords.length === 0) return { ...entry, words: [], start: 0, end: 0 };
                     return { ...entry, start: start === Infinity ? 0 : start, end: end === -Infinity ? 0 : end, words: newWords };
                 });

            } else if (sentenceEntries) {
                  finalEntries = sentenceEntries; 
                  if (material.hasTextFile) {
                      try {
                        const fullMaterial = await getMaterialById(material.id);
                        if (fullMaterial.textFile) {
                            const text = await fullMaterial.textFile.text();
                            const existing = JSON.parse(text);
                            if (Array.isArray(existing)) {
                                finalEntries = sentenceEntries.map((ent, i) => {
                                    const ex = existing[i];
                                    if (ex) return { ...ent, japanese: ex.japanese || ent.japanese, explanation: ex.explanation || ent.explanation };
                                    return ent;
                                });
                                 if (existing.length > 0 && existing[0].explanation) {
                                    const existingExpl = existing[0].explanation;
                                    if (finalEntries.length > 0) {
                                        const newExpl = finalEntries[0].explanation || '';
                                        if (!newExpl.includes('__PERSONA_PROFILE__') && existingExpl.includes('__PERSONA_PROFILE__')) {
                                            const match = existingExpl.match(/(__PERSONA_PROFILE__[\s\S]*?__END_PERSONA__)/);
                                            if (match) finalEntries[0].explanation = match[1] + newExpl;
                                        }
                                        const bgMatch = existingExpl.match(/(__BACKGROUND_INFO__[\s\S]*?__END_BACKGROUND__)/);
                                        if (bgMatch) {
                                             if(!finalEntries[0].explanation?.includes('__BACKGROUND_INFO__')) finalEntries[0].explanation = (finalEntries[0].explanation || '') + bgMatch[1];
                                        }
                                    }
                                 }
                            }
                        }
                      } catch(e) { console.warn("Merge failed", e); }
                  }
            }
            const contentToSave = JSON.stringify(finalEntries);
            const file = new File([new Blob([contentToSave], { type: 'application/json' })], 'timestamp.json', { type: 'application/json' });
            await onUpdateMaterial(material.id, { textFile: file });
            setIsPasting(false);
            setPasteContent('');
            setIsAddingFile(false);
            onLoadFromDB(material.id);

        } catch (e) {
            console.error(e);
            alert("エラー: データの解析に失敗しました。\n" + (e instanceof Error ? e.message : ""));
        }
    };

    return (
        <>
            <div className={`${T.containerBg} group relative flex flex-col rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl border ${T.border}`}>
                 <div 
                  className="relative aspect-video w-full cursor-pointer overflow-hidden bg-black/10"
                  onClick={() => { setEditingMaterialId(material.id); thumbnailInputRef.current?.click(); }}
                >
                    {material.thumbnail ? (
                        <img src={material.thumbnail} alt={material.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${T.panelBg}`}>
                            <svg className={`w-8 h-8 md:w-12 md:h-12 ${T.textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    )}
                    {material.cardStats && (
                         <div className="absolute top-2 left-2">
                             <span className="bg-green-500/80 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm font-bold shadow-sm">
                                学習中: {Object.keys(material.cardStats).length}
                             </span>
                         </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-semibold px-3 py-1 bg-black/50 rounded-full backdrop-blur-sm">画像を変更</span>
                    </div>
                     <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {material.duration && (
                            <span className="text-xs font-mono bg-black/60 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                                {formatDuration(material.duration)}
                            </span>
                        )}
                    </div>
                    <div className="absolute bottom-2 left-2 flex gap-1">
                        {material.hasBgm && <span className={`p-1 rounded-full bg-black/50 text-white backdrop-blur-sm`} title="BGMあり"><MusicIcon className="w-3 h-3" /></span>}
                         {material.hasWordFile && !material.duration && <span className={`p-1 rounded-full bg-black/50 text-white backdrop-blur-sm`} title="単語帳"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" /></svg></span>}
                    </div>
                </div>

                <div className="flex flex-col flex-grow p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-grow min-w-0 mr-2">
                            <EditableTitle initialTitle={material.name} onSave={(newTitle) => onUpdateMaterial(material.id, { name: newTitle })} T={T} />
                             <div className="flex items-center mt-1">
                                {isEditingFolder ? (
                                    <select
                                        autoFocus
                                        value={material.folderId || ''}
                                        onChange={(e) => { onUpdateMaterial(material.id, { folderId: e.target.value ? Number(e.target.value) : null }); setIsEditingFolder(false); }}
                                        onBlur={() => setIsEditingFolder(false)}
                                        className={`w-full p-1 text-xs ${T.button} ${T.textSecondary} rounded-md border ${T.border}`}
                                    >
                                        <option value="">(フォルダなし)</option>
                                        {storedFolders.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                                    </select>
                                ) : (
                                    <div onClick={(e) => { e.stopPropagation(); !isDeleteMode && setIsEditingFolder(true); }} className={`flex items-center gap-1 text-xs ${T.textMuted} hover:text-sky-400 cursor-pointer transition-colors truncate`} title="フォルダを移動">
                                        <FolderIcon className="w-3 h-3" /><span>{folderName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {isDeleteMode && <ConfirmDeleteButton itemType="file" onDelete={() => onDeleteFromDB(Number(material.id))} />}
                    </div>

                     {!isDeleteMode && (
                        <div className="flex items-center justify-end gap-2 mb-3">
                             {/* Dynamic Add Buttons */}
                             {isAddingFile ? (
                                <div className={`absolute inset-x-2 bottom-16 z-10 p-2 rounded-lg shadow-xl ${T.panelBg} border ${T.border} flex items-center justify-between gap-2 animate-fade-in`}>
                                     <label className="flex-grow text-xs text-center cursor-pointer hover:text-sky-400 p-1">
                                        ファイル
                                        <input type="file" accept="audio/*,video/*,.json,.txt" onChange={handleFileChange} className="hidden" />
                                    </label>
                                    <span className={`text-xs ${T.textMuted}`}>|</span>
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setIsPasting(true); }}
                                        className="flex-grow text-xs text-center hover:text-sky-400 p-1"
                                     >
                                        貼付
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setIsAddingFile(false); }} className={`text-xs p-1 rounded-full hover:bg-red-500 hover:text-white`}>✕</button>
                                </div>
                             ) : null}
                             
                             {isAddingWordFile && (
                                <div className={`absolute inset-x-2 bottom-16 z-10 p-2 rounded-lg shadow-xl ${T.panelBg} border ${T.border} flex items-center justify-between animate-fade-in`}>
                                    <label className="flex-grow text-xs text-center cursor-pointer hover:text-sky-400 p-1">
                                        単語ファイル
                                        <input type="file" accept=".json,.txt,text/plain,application/json" onChange={handleWordFileChange} className="hidden" />
                                    </label>
                                    <button onClick={(e) => { e.stopPropagation(); setIsAddingWordFile(false); }} className={`text-xs p-1 rounded-full hover:bg-red-500 hover:text-white`}>✕</button>
                                </div>
                             )}
                             
                             {isAddingBgm && (
                                <div className={`absolute inset-x-2 bottom-16 z-10 p-2 rounded-lg shadow-xl ${T.panelBg} border ${T.border} flex items-center justify-between animate-fade-in`}>
                                     <label className="flex-grow text-xs text-center cursor-pointer hover:text-sky-400 p-1">
                                        BGMファイル
                                        <input type="file" accept="audio/*" onChange={handleBgmFileChange} className="hidden" />
                                    </label>
                                    <button onClick={(e) => { e.stopPropagation(); setIsAddingBgm(false); }} className={`text-xs p-1 rounded-full hover:bg-red-500 hover:text-white`}>✕</button>
                                </div>
                             )}

                            <button onClick={(e) => {e.stopPropagation(); setIsAddingFile(!isAddingFile)}} className={`p-1.5 rounded-md ${T.button} text-xs text-opacity-70`} title="音源・テキスト追加">＋音源</button>
                            <button onClick={(e) => {e.stopPropagation(); setIsAddingWordFile(!isAddingWordFile)}} className={`p-1.5 rounded-md ${T.button} text-xs text-opacity-70`} title="単語追加">＋単語</button>
                            <button onClick={(e) => {e.stopPropagation(); setIsAddingBgm(!isAddingBgm)}} className={`p-1.5 rounded-md ${T.button} text-xs text-opacity-70`} title="BGM追加">＋BGM</button>
                        </div>
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-2">
                         {(material.hasTextFile || material.duration) ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); onLoadFromDB(material.id); }}
                              className={`col-span-2 w-full py-2 ${T.accentBg} hover:brightness-110 text-white rounded-lg font-bold text-sm shadow-sm transition-all`}
                            >
                              学習スタート
                            </button>
                        ) : (
                            <button disabled className={`col-span-2 w-full py-2 ${T.button} opacity-50 cursor-not-allowed rounded-lg text-xs`}>
                                テキスト/音声なし
                            </button>
                        )}
                        
                        {material.hasWordFile && (
                            <>
                                <button onClick={(e) => {e.stopPropagation(); onGame(material.id)}} className="py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-md font-semibold text-xs transition-colors">ゲーム</button>
                                <button onClick={(e) => {e.stopPropagation(); onStudy(material.id)}} className="py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md font-semibold text-xs transition-colors">単語</button>
                            </>
                        )}
                         {material.hasQuizFile && (
                             <button onClick={(e) => {e.stopPropagation(); onStartQuiz(material.id)}} className={`py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-semibold text-xs transition-colors ${!material.hasWordFile ? 'col-span-2' : ''}`}>
                                クイズ
                            </button>
                        )}
                    </div>
                </div>
            </div>
              {isPasting && (
                 <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setIsPasting(false); }}>
                    <div className={`${T.containerBg} p-6 rounded-lg shadow-xl max-w-lg w-full border ${T.border}`} onClick={e => e.stopPropagation()}>
                        <h3 className={`text-lg font-bold ${T.textPrimary} mb-4`}>データを貼り付け</h3>
                         <textarea
                            value={pasteContent}
                            onChange={(e) => setPasteContent(e.target.value)}
                            placeholder="JSONデータ、またはタイムスタンプデータをここに貼り付けてください..."
                            rows={10}
                            className={`w-full p-2 text-sm ${T.button} ${T.textSecondary} rounded-md border ${T.border} focus:outline-none focus:ring-2 ${T.ring} font-mono mb-4`}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                             <button onClick={() => setIsPasting(false)} className={`px-4 py-2 text-sm ${T.button} rounded-md`}>キャンセル</button>
                             <button onClick={handlePasteSave} className={`px-4 py-2 text-sm ${T.accentBg} hover:brightness-110 text-white rounded-md`}>保存</button>
                        </div>
                    </div>
                 </div>
            )}
        </>
    );
};

const HeroSection: React.FC<{ material: StoredMaterial; onLoad: (id: number) => void; T: Theme; }> = ({ material, onLoad, T }) => {
    return (
        <div className="w-full mb-8 animate-fade-in">
            <div className={`relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden shadow-2xl group cursor-pointer border ${T.border}`} onClick={() => onLoad(material.id)}>
                {material.thumbnail ? (
                    <>
                        <img src={material.thumbnail} alt={material.name} className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50 scale-105 group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    </>
                ) : (
                    <div className={`absolute inset-0 ${T.accentBg} opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]`} />
                )}
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-white/20 text-white backdrop-blur-md`}>Recent</span>
                        <span className="text-white/70 text-sm">{new Date(material.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 line-clamp-2 drop-shadow-md">{material.name}</h2>
                    <div className="flex items-center gap-4">
                        <button onClick={(e) => { e.stopPropagation(); onLoad(material.id); }} className={`flex items-center gap-2 px-6 py-3 ${T.accentBg} hover:brightness-110 text-white rounded-full font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><span>続きから学習</span>
                        </button>
                        {material.duration && <span className="text-white/80 font-mono text-sm bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">{formatDuration(material.duration)}</span>}
                    </div>
                </div>
                 {material.thumbnail && (
                    <div className="absolute right-8 bottom-8 w-32 aspect-video rounded-lg shadow-xl overflow-hidden border-2 border-white/20 hidden sm:block transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                         <img src={material.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
            </div>
        </div>
    );
};

const ConfirmDeleteButton: React.FC<{ onDelete: () => void; itemType: 'file' | 'folder'; }> = ({ onDelete, itemType }) => {
    const [confirming, setConfirming] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const handleClick = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); if (confirming) onDelete(); else { setConfirming(true); timeoutRef.current = window.setTimeout(() => setConfirming(false), 3000); } };
    useEffect(() => () => { if(timeoutRef.current) clearTimeout(timeoutRef.current); }, []);
    return <button type="button" onClick={handleClick} className={`relative z-50 p-2 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0 cursor-pointer shadow-md ${confirming ? 'bg-red-600 text-white w-auto px-3' : 'bg-red-500 text-white w-8 h-8 hover:bg-red-600'}`} title={confirming ? "クリックして削除" : "削除"}>{confirming ? <span className="text-xs font-bold whitespace-nowrap">削除?</span> : <TrashIcon className="w-4 h-4 pointer-events-none" />}</button>;
};

const UploadScreen: React.FC<UploadScreenProps> = ({ onLoad, error, storedMaterials, storedFolders, onLoadFromDB, onDeleteFromDB, onUpdateMaterial, onAddFolder, onUpdateFolder, onDeleteFolder, onGoToDeckList, onGoToPromptLibrary, onStudy, onGame, onStartQuiz, onLoadBoard, T, setTheme, themes, dueCardCount = 0, onStartDailyReview }) => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [textFile, setTextFile] = useState<File | null>(null);
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [wordContent, setWordContent] = useState('');
  const [plainTextContent, setPlainTextContent] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<string | undefined>(undefined);
  
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null); 

  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const settingsContainerRef = useRef<HTMLDivElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTimestampPasteMode, setIsTimestampPasteMode] = useState(false);
  const [timestampPasteContent, setTimestampPasteContent] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (settingsContainerRef.current && !settingsContainerRef.current.contains(event.target as Node)) {
            setIsSettingsOpen(false);
        }
    };
    if (isSettingsOpen) { document.addEventListener('mousedown', handleClickOutside); }
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [isSettingsOpen]);
  
  useEffect(() => { if (isCreatingFolder) newFolderInputRef.current?.focus(); }, [isCreatingFolder]);

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setMediaFile(file); if (!materialName) setMaterialName(file.name.replace(/\.[^/.]+$/, "")); } };
  const handleTextFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { setTextFile(e.target.files?.[0] || null); };
  const handleWordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { setWordFile(e.target.files?.[0] || null); if (e.target.files?.[0]) setWordContent(''); };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => setThumbnailFile(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
          if (item.type.indexOf("image") !== -1) {
              const blob = item.getAsFile();
              if (blob) {
                  const reader = new FileReader();
                  reader.onload = () => setThumbnailFile(reader.result as string);
                  reader.readAsDataURL(blob);
              }
              e.preventDefault();
              return;
          }
      }
  };


  const handleLoadClick = () => {
    if (isTimestampPasteMode && timestampPasteContent && onLoadBoard) {
    }

    let finalTextFile = textFile;
    let finalPlainText = plainTextContent;

    if (isTimestampPasteMode && timestampPasteContent) {
        finalPlainText = timestampPasteContent;
        const blob = new Blob([timestampPasteContent], { type: 'application/json' });
        finalTextFile = new File([blob], 'timestamp.json', { type: 'application/json' });
    }

    onLoad({ 
        name: materialName, 
        mediaFile: mediaFile || undefined, 
        textFile: finalTextFile || undefined, 
        wordFile: wordFile || undefined, 
        wordContent: wordContent || undefined, 
        plainTextContent: finalPlainText || undefined,
        thumbnail: thumbnailFile
    });
    setIsAddModalOpen(false); setMediaFile(null); setTextFile(null); setWordFile(null); setMaterialName(''); setWordContent(''); setPlainTextContent(''); setIsTimestampPasteMode(false); setTimestampPasteContent(''); setThumbnailFile(undefined);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>, materialId: number) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onUpdateMaterial(materialId, { thumbnail: reader.result as string });
      reader.readAsDataURL(file);
  };

  const handleCreateFolder = () => { if(newFolderName.trim()){ onAddFolder(newFolderName.trim()); setNewFolderName(""); setIsCreatingFolder(false); } };

  const rootMaterials = storedMaterials.filter(m => !m.folderId);
  const isLoadable = mediaFile || textFile || wordFile || wordContent || plainTextContent || timestampPasteContent;
  const latestMaterial = storedMaterials.length > 0 ? storedMaterials[0] : null;

  return (
    <div className="flex-grow flex flex-col items-center justify-start p-4 pb-24 md:p-8 space-y-8 relative min-h-screen">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 md:gap-4">
               <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${T.textPrimary}`}>Library</h1>
               <button onClick={onGoToPromptLibrary} className={`flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm ${T.accentBg} hover:brightness-110 text-white rounded-full font-bold shadow-lg transition-all hover:-translate-y-0.5`}>
                  <span className="text-base md:text-lg">✨</span> <span className="whitespace-nowrap">作成</span>
               </button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={onGoToDeckList} className={`flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm ${T.button} rounded-full transition-colors`} title="マイデッキ一覧">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                 <span className="hidden sm:inline font-medium">デッキ</span>
            </button>
            {!isDeleteMode && (
                <button onClick={() => setIsCreatingFolder(true)} className={`flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm ${T.button} rounded-full transition-colors`} title="新しいフォルダ">
                    <FolderIcon className="h-4 w-4 md:h-5 md:w-5" />
                </button>
            )}
             <div className="relative" ref={settingsContainerRef}>
                <button onClick={() => isDeleteMode ? setIsDeleteMode(false) : setIsSettingsOpen(prev => !prev)} className={`p-2 rounded-full transition-colors ${ isDeleteMode ? `${T.accentBg} text-white ring-2 ring-offset-2 ${T.ringOffset}` : `${T.button} text-white/80 hover:bg-white/20`}`} title={isDeleteMode ? "編集を完了" : "設定"}>
                    {isDeleteMode ? <span className="font-bold text-xs md:text-sm px-2">完了</span> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                </button>
              {isSettingsOpen && (
                <div className={`absolute top-full right-0 mt-2 w-64 ${T.containerBg} rounded-xl shadow-2xl border ${T.border} z-20 overflow-hidden`}>
                  <div className={`p-4 border-b ${T.border}`}>
                    <label htmlFor="theme-select" className={`block text-xs font-bold uppercase tracking-wider ${T.textMuted} mb-2`}>Color Theme</label>
                    <select id="theme-select" value={Object.keys(themes).find(key => themes[key as keyof Themes]?.name === T.name)} onChange={(e) => setTheme(e.target.value)} className={`w-full p-2 ${T.button} ${T.textSecondary} rounded-lg border ${T.border} focus:outline-none focus:ring-2 ${T.ring}`}>
                      {Object.entries(themes).map(([key, theme]) => (<option key={key} value={key}>{(theme as Theme).name}</option>))}
                    </select>
                  </div>
                  <button onClick={() => { setIsDeleteMode(true); setIsSettingsOpen(false); }} className={`w-full flex items-center gap-3 p-4 text-left ${T.textSecondary} hover:${T.button} transition-colors`}>
                    <TrashIcon className="h-5 w-5" /><span>整理・削除モード</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-6 animate-fade-in">{error}</div>}
        
        {!isDeleteMode && dueCardCount > 0 && onStartDailyReview && (
            <DailyQuestBanner count={dueCardCount} onStart={onStartDailyReview} T={T} />
        )}

        {isCreatingFolder && (
            <div className={`p-4 rounded-xl ${T.containerBg} border ${T.border} mb-8 flex items-center gap-4 animate-fade-in shadow-lg`}>
                <FolderIcon className={`h-6 w-6 ${T.textMuted}`} />
                <input ref={newFolderInputRef} type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if(e.key === 'Escape') setIsCreatingFolder(false); }} placeholder="新しいフォルダ名" className={`flex-grow ${T.textPrimary} bg-transparent border-b-2 ${T.border} ${T.ring} outline-none py-1`}/>
                <button onClick={handleCreateFolder} className={`px-4 py-2 text-sm ${T.accentBg} hover:brightness-110 text-white rounded-lg font-bold`}>作成</button>
                <button onClick={() => setIsCreatingFolder(false)} className={`px-4 py-2 text-sm ${T.button} rounded-lg`}>キャンセル</button>
            </div>
        )}

        {latestMaterial && !isDeleteMode && dueCardCount === 0 && (
            <HeroSection material={latestMaterial} onLoad={onLoadFromDB} T={T} />
        )}

        {storedMaterials.length > 0 || storedFolders.length > 0 ? (
          <div className="space-y-12">
            {storedFolders.map(folder => {
              const materialsInFolder = storedMaterials.filter(m => m.folderId === folder.id);
              return (
                <div key={folder.id} className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2 border-white/10">
                        <div className="flex items-center gap-3">
                            <FolderIcon className={`h-5 w-5 md:h-6 md:w-6 ${T.textMuted}`} />
                            <EditableTitle initialTitle={folder.name} onSave={(newName) => onUpdateFolder(folder.id, newName)} T={T} isFolder />
                            <span className={`text-xs px-2 py-1 rounded-full ${T.button} ${T.textMuted}`}>{materialsInFolder.length}</span>
                        </div>
                         {isDeleteMode && <ConfirmDeleteButton itemType="folder" onDelete={() => onDeleteFolder(folder.id)} />}
                    </div>
                    {materialsInFolder.length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {materialsInFolder.map(material => (
                                <MaterialCard {...{material, isDeleteMode, storedFolders, onLoadFromDB, onDeleteFromDB, onUpdateMaterial, setEditingMaterialId, thumbnailInputRef, onStudy, onGame, onStartQuiz, T, onLoadBoard}} key={material.id}/>
                            ))}
                         </div>
                    ) : (
                        <p className={`text-sm ${T.textMuted} italic ml-9`}>このフォルダは空です。</p>
                    )}
                </div>
              )
            })}
            {rootMaterials.length > 0 && (
                <div className="space-y-4">
                     <div className="flex items-center gap-3 border-b pb-2 border-white/10">
                        <span className={`text-base md:text-lg font-semibold ${T.textPrimary}`}>すべてのファイル</span>
                     </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rootMaterials.map(material => (
                            <MaterialCard {...{material, isDeleteMode, storedFolders, onLoadFromDB, onDeleteFromDB, onUpdateMaterial, setEditingMaterialId, thumbnailInputRef, onStudy, onGame, onStartQuiz, T, onLoadBoard}} key={material.id}/>
                        ))}
                    </div>
                </div>
            )}
            <input type="file" ref={thumbnailInputRef} accept="image/*" onChange={(e) => editingMaterialId && handleThumbnailChange(e, editingMaterialId)} className="hidden"/>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed ${T.border} bg-white/5`}>
            <div className="w-24 h-24 mb-6 opacity-50"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className={`${T.textMuted}`}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
            <p className={`text-xl font-semibold ${T.textPrimary}`}>No Materials Yet</p>
            <p className={`${T.textMuted} mt-2`}>右下の＋ボタンから学習コンテンツを追加しましょう</p>
          </div>
        )}
      </div>

      <button onClick={() => setIsAddModalOpen(true)} className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl ${T.accentBg} text-white flex items-center justify-center hover:scale-110 transition-transform z-30 group`} title="新規追加">
        <PlusIcon className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-90 transition-transform duration-300" />
      </button>
      
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAddModalOpen(false)}>
            <div className={`${T.containerBg} w-full max-w-2xl rounded-2xl shadow-2xl border ${T.border} overflow-hidden animate-fade-in flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className={`flex items-center justify-between p-6 border-b ${T.border}`}>
                    <h2 className={`text-2xl font-bold ${T.textPrimary}`}>新しいデータを追加</h2>
                    <button onClick={() => setIsAddModalOpen(false)} className={`p-2 rounded-full ${T.button} hover:bg-red-500 hover:text-white transition-colors`}><XMarkIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-8">
                     <div>
                        <label className={`text-sm font-bold uppercase tracking-wide ${T.textMuted} block mb-2`}>TITLE</label>
                        <input type="text" value={materialName} onChange={(e) => setMaterialName(e.target.value)} placeholder="教材名 (任意)" className={`w-full p-3 ${T.button} ${T.textPrimary} rounded-xl border ${T.border} focus:outline-none focus:ring-2 ${T.ring} text-lg`}/>
                    </div>
                    
                    <div>
                        <label className={`text-sm font-bold uppercase tracking-wide ${T.textMuted} block mb-2`}>1. Plain Text / Prompt</label>
                        <textarea value={plainTextContent} onChange={(e) => { setPlainTextContent(e.target.value); if (e.target.value) { setWordFile(null); setTextFile(null); setWordContent(''); } }} placeholder="テキスト、または匿名掲示板/AmazonメーカーのJSONデータをここに貼り付けてください" rows={5} className={`w-full p-3 text-sm ${T.button} ${T.textSecondary} rounded-xl border ${T.border} focus:outline-none focus:ring-2 ${T.ring} font-mono`}/>
                    </div>

                    <div>
                         <label className={`text-sm font-bold uppercase tracking-wide ${T.textMuted} block mb-3`}>2. Media & Timestamp</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button type="button" onClick={() => mediaInputRef.current?.click()} className={`group relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed ${T.border} hover:border-sky-500 hover:bg-sky-500/10 transition-all`}>
                                <div className={`mb-2 p-3 rounded-full ${T.button} group-hover:bg-sky-500 group-hover:text-white transition-colors`}><MusicIcon className="w-6 h-6" /></div>
                                <span className={`font-semibold ${T.textPrimary}`}>音声・動画</span>
                                <span className={`text-xs ${T.textMuted} mt-1 text-center max-w-full truncate px-2`}>{mediaFile?.name || 'Select File...'}</span>
                                <input type="file" ref={mediaInputRef} accept="audio/*,video/*,.mp3,.m4a,.mp4,.mov,.wav,.ogg,.flac" onChange={handleMediaFileChange} className="hidden"/>
                            </button>
                            {isTimestampPasteMode ? (
                                <div className={`relative flex flex-col p-0 rounded-xl border-2 ${T.border} overflow-hidden`}>
                                    <textarea autoFocus value={timestampPasteContent} onChange={(e) => setTimestampPasteContent(e.target.value)} placeholder="JSONデータを貼り付け..." className={`w-full h-full p-3 text-xs ${T.button} ${T.textSecondary} resize-none focus:outline-none`} style={{ minHeight: '120px' }}/>
                                    <button onClick={() => { setIsTimestampPasteMode(false); setTimestampPasteContent(''); }} className={`absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-red-500`}><XMarkIcon className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => textInputRef.current?.click()} className={`group relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed ${T.border} hover:border-sky-500 hover:bg-sky-500/10 transition-all`}>
                                    <div className={`mb-2 p-3 rounded-full ${T.button} group-hover:bg-sky-500 group-hover:text-white transition-colors`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                                    <span className={`font-semibold ${T.textPrimary}`}>タイムスタンプ</span>
                                    <span className={`text-xs ${T.textMuted} mt-1 text-center max-w-full truncate px-2`}>{textFile?.name || 'Select File...'}</span>
                                    <input type="file" ref={textInputRef} accept=".txt,.json,text/plain,application/json" onChange={handleTextFileChange} className="hidden"/>
                                    <div onClick={(e) => { e.stopPropagation(); setIsTimestampPasteMode(true); setTextFile(null); }} className={`mt-2 text-xs text-sky-400 hover:underline z-10`}>またはJSONデータを直接貼り付け</div>
                                </button>
                            )}
                         </div>
                    </div>
                     
                     <div>
                        <label className={`text-sm font-bold uppercase tracking-wide ${T.textMuted} block mb-2`}>3. Word Data (JSON)</label>
                        <div className="flex gap-2 mb-2">
                            <button type="button" onClick={() => wordInputRef.current?.click()} className={`px-4 py-2 ${T.button} rounded-lg text-xs font-bold`}>ファイル選択</button>
                            <span className={`flex items-center text-xs ${T.textMuted}`}>{wordFile?.name}</span>
                            <input type="file" ref={wordInputRef} accept=".json,.txt,text/plain,application/json" onChange={handleWordFileChange} className="hidden"/>
                        </div>
                        <textarea value={wordContent} onChange={(e) => { setWordContent(e.target.value); if (e.target.value) { setWordFile(null); setPlainTextContent(''); } }} placeholder="またはJSONデータを直接貼り付け..." rows={3} className={`w-full p-3 text-sm ${T.button} ${T.textSecondary} rounded-xl border ${T.border} focus:outline-none focus:ring-2 ${T.ring} font-mono`}/>
                    </div>

                    <div onPaste={handleImagePaste}>
                        <label className={`text-sm font-bold uppercase tracking-wide ${T.textMuted} block mb-2`}>4. PRODUCT IMAGE (商品画像)</label>
                        <div className={`w-full border-2 border-dashed ${T.border} rounded-xl p-6 flex flex-col items-center justify-center transition-colors hover:bg-white/5 relative`}>
                            {thumbnailFile ? (
                                <div className="relative w-full aspect-video flex items-center justify-center overflow-hidden rounded-lg">
                                    <img src={thumbnailFile} alt="Preview" className="max-w-full max-h-48 object-contain" />
                                    <button onClick={() => setThumbnailFile(undefined)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md"><XMarkIcon className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <div className="text-center" onClick={() => imageInputRef.current?.click()}>
                                    <div className="mb-2 text-4xl opacity-50">🖼️</div>
                                    <p className={`text-sm font-bold ${T.textPrimary} mb-1`}>クリックして画像を選択</p>
                                    <p className={`text-xs ${T.textMuted}`}>または Ctrl+V で画像を貼り付け</p>
                                </div>
                            )}
                            <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageFileChange} className="hidden" />
                        </div>
                    </div>

                </div>
                <div className={`p-6 border-t ${T.border} bg-black/10`}>
                    <button onClick={handleLoadClick} disabled={!isLoadable && !thumbnailFile} className={`w-full py-4 ${T.buttonStrong} disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg`}>データを読み込んで作成</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default UploadScreen;
