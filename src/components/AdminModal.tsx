import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Image as ImageIcon,
  Images,
  FolderPlus,
  Loader2,
  Check,
  Save,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Exhibit, DisplayFrameStyle } from '../types';
import { DEFAULT_EXHIBITS } from '../data/defaultExhibits';

export interface BulkItemCandidate {
  id: string;
  file: File;
  title: string;
  imageUrl: string;
  aspectRatio: number;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibits: Exhibit[];
  onSaveExhibits: (exhibits: Exhibit[]) => void;
  onFocusExhibit: (exhibit: Exhibit) => void;
}

export function calculateSpiralPosition(index: number): { posX: number; posZ: number; rotY: number } {
  let ring = 0;
  let accumulated = 0;
  let currentRadius = 7.0;
  let ringCapacity = 10;

  while (accumulated + ringCapacity <= index) {
    accumulated += ringCapacity;
    ring++;
    currentRadius += 4.5;
    ringCapacity = Math.max(10, Math.floor((2 * Math.PI * currentRadius) / 4.2));
  }

  const indexInRing = index - accumulated;
  const ringOffset = ring * 0.35;
  const angle = (indexInRing * Math.PI * 2) / ringCapacity + ringOffset;

  const posX = Math.round(Math.sin(angle) * currentRadius * 10) / 10;
  const posZ = Math.round(Math.cos(angle) * currentRadius * 10) / 10;
  const rotY = Math.round((angle + Math.PI) * 100) / 100;

  return { posX, posZ, rotY };
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  exhibits,
  onSaveExhibits,
  onFocusExhibit,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('archaeo_admin_token') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Tab: 'list' | 'editor' | 'bulk'
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'bulk'>('list');
  const [editingExhibitId, setEditingExhibitId] = useState<string | null>(null);

  // Bulk Upload State
  const [bulkCandidates, setBulkCandidates] = useState<BulkItemCandidate[]>([]);
  const [bulkFrameStyle, setBulkFrameStyle] = useState<DisplayFrameStyle>('stone_pedestal');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formEra, setFormEra] = useState('');
  const [formProvenance, setFormProvenance] = useState('');
  const [formMaterial, setFormMaterial] = useState('');
  const [formDimensions, setFormDimensions] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCuratorNotes, setFormCuratorNotes] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formFrameStyle, setFormFrameStyle] = useState<DisplayFrameStyle>('stone_pedestal');
  const [formPosX, setFormPosX] = useState<number>(0);
  const [formPosZ, setFormPosZ] = useState<number>(0);
  const [formRotationY, setFormRotationY] = useState<number>(0);
  const [formTags, setFormTags] = useState('');
  const [formAudioText, setFormAudioText] = useState('');
  const [formAspectRatio, setFormAspectRatio] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to process a single file for bulk queue
  const processSingleImageFile = (file: File): Promise<BulkItemCandidate> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
        img.onload = () => {
          const aspect = Math.round((img.naturalWidth / img.naturalHeight) * 100) / 100;
          const maxDim = 600;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          let finalUrl = dataUrl;
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            let optimized = canvas.toDataURL('image/jpeg', 0.65);
            if (optimized.length > 250000) {
              optimized = canvas.toDataURL('image/jpeg', 0.5);
            }
            finalUrl = optimized;
          }

          let cleanTitle = file.name.replace(/\.[^/.]+$/, '');
          cleanTitle = cleanTitle.replace(/[-_]/g, ' ');
          cleanTitle = cleanTitle.trim();
          if (cleanTitle) {
            cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
          } else {
            cleanTitle = 'Arkeolojik Eser';
          }

          resolve({
            id: `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            file,
            title: cleanTitle,
            imageUrl: finalUrl,
            aspectRatio: aspect,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleBulkFilesSelected = async (filesList: FileList | File[]) => {
    const files = Array.from(filesList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      showNotification('Lütfen geçerli görsel dosyaları seçin (PNG, JPG, WebP)', 'error');
      return;
    }

    setIsProcessingBulk(true);
    showNotification(`${files.length} fotoğraf işleniyor ve 3D oranlar hesaplanıyor...`);

    try {
      const results: BulkItemCandidate[] = [];
      for (const file of files) {
        try {
          const item = await processSingleImageFile(file);
          results.push(item);
        } catch (err) {
          console.error('Görsel işlenemedi:', file.name, err);
        }
      }

      setBulkCandidates((prev) => [...prev, ...results]);
      showNotification(`${results.length} fotoğraf toplu listeye eklendi!`);
    } catch {
      showNotification('Fotoğraflar işlenirken hata oluştu', 'error');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleRemoveBulkCandidate = (id: string) => {
    setBulkCandidates((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearBulkCandidates = () => {
    setBulkCandidates([]);
  };

  const handleSaveBulk = async () => {
    if (bulkCandidates.length === 0) {
      showNotification('Lütfen önce yüklenecek fotoğrafları seçin', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const startCount = exhibits.length;
      const newExhibits: Exhibit[] = bulkCandidates.map((item, idx) => {
        const posIdx = startCount + idx;
        const { posX, posZ, rotY } = calculateSpiralPosition(posIdx);

        return {
          id: item.id,
          title: item.title.trim() || 'Arkeolojik Eser',
          subtitle: '',
          era: 'Bilinmiyor',
          provenance: 'Arkeolojik Saha',
          material: 'Çeşitli',
          description: `${item.title.trim()} için detaylı açıklama.`,
          imageUrl: item.imageUrl,
          frameStyle: bulkFrameStyle,
          position: [posX, 0, posZ],
          rotationY: rotY,
          aspectRatio: item.aspectRatio,
          tags: ['Toplu Yükleme'],
          createdAt: Date.now() + idx,
        };
      });

      const updatedList = [...newExhibits, ...exhibits];
      await onSaveExhibits(updatedList);

      showNotification(`${bulkCandidates.length} adet eser sergiye başarıyla kaydedildi ve yayınlandı!`);
      setBulkCandidates([]);
      setActiveTab('list');
    } catch (err) {
      showNotification(
        'Toplu kayıt hatası: ' + (err instanceof Error ? err.message : String(err)),
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-detect image aspect ratio if user pastes an external image URL
  useEffect(() => {
    if (formImageUrl && (formImageUrl.startsWith('http://') || formImageUrl.startsWith('https://'))) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const aspect = Math.round((img.naturalWidth / img.naturalHeight) * 100) / 100;
          setFormAspectRatio(aspect);
        }
      };
      img.src = formImageUrl;
    }
  }, [formImageUrl]);

  if (!isOpen) return null;

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Emind3646') {
      setIsAuthenticated(true);
      localStorage.setItem('archaeo_admin_token', 'true');
      setAuthError('');
      showNotification('Küratör girişi başarılı');
    } else {
      setAuthError('Geçersiz şifre. Lütfen küratör şifresini girin.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('archaeo_admin_token');
    showNotification('Küratör oturumu kapatıldı');
  };

  const startCreateNew = () => {
    setEditingExhibitId(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormEra('');
    setFormProvenance('');
    setFormMaterial('');
    setFormDimensions('');
    setFormDescription('');
    setFormCuratorNotes('');
    setFormImageUrl('');
    setFormFrameStyle('stone_pedestal');
    setFormAspectRatio(undefined);
    
    // Auto find an open spot with spiral expansion around the sanctuary forum
    const { posX, posZ, rotY } = calculateSpiralPosition(exhibits.length);
    setFormPosX(posX);
    setFormPosZ(posZ);
    setFormRotationY(rotY);
    setFormTags('');
    setFormAudioText('');
    setActiveTab('editor');
  };

  const startEdit = (exhibit: Exhibit) => {
    setEditingExhibitId(exhibit.id);
    setFormTitle(exhibit.title || '');
    setFormSubtitle(exhibit.subtitle || '');
    setFormEra(exhibit.era || '');
    setFormProvenance(exhibit.provenance || '');
    setFormMaterial(exhibit.material || '');
    setFormDimensions(exhibit.dimensions || '');
    setFormDescription(exhibit.description || '');
    setFormCuratorNotes(exhibit.curatorNotes || '');
    setFormImageUrl(exhibit.imageUrl || '');
    setFormFrameStyle(exhibit.frameStyle || 'stone_pedestal');
    setFormPosX(exhibit.position ? exhibit.position[0] : 0);
    setFormPosZ(exhibit.position ? exhibit.position[2] : 0);
    setFormRotationY(exhibit.rotationY || 0);
    setFormTags(exhibit.tags ? exhibit.tags.join(', ') : '');
    setFormAudioText(exhibit.audioGuideText || '');
    setFormAspectRatio(exhibit.aspectRatio);
    setActiveTab('editor');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Lütfen geçerli bir görsel dosyası seçin', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      
      // Optimize image via Canvas to avoid large base64 strings and ensure fast sync
      const img = new Image();
      img.onload = () => {
        const aspect = Math.round((img.naturalWidth / img.naturalHeight) * 100) / 100;
        setFormAspectRatio(aspect);

        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          let optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          // If still large, compress to 0.6
          if (optimizedDataUrl.length > 500000) {
            optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          }
          setFormImageUrl(optimizedDataUrl);
          showNotification('Fotoğraf yüklendi ve 3D kaide oranı uyarlandı');
        } else {
          setFormImageUrl(dataUrl);
          showNotification('Fotoğraf yüklendi');
        }
      };
      img.onerror = () => {
        setFormImageUrl(dataUrl);
        showNotification('Fotoğraf yüklendi');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showNotification('Lütfen eser başlığı girin', 'error');
      return;
    }
    if (!formImageUrl.trim()) {
      showNotification('Lütfen bir görsel URLsi girin veya fotoğraf yükleyin', 'error');
      return;
    }

    setIsSaving(true);
    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    let updatedList: Exhibit[];

    if (editingExhibitId) {
      // Update existing
      updatedList = exhibits.map((ex) => {
        if (ex.id === editingExhibitId) {
          return {
            ...ex,
            title: formTitle.trim(),
            subtitle: formSubtitle.trim(),
            era: formEra.trim(),
            provenance: formProvenance.trim(),
            material: formMaterial.trim(),
            dimensions: formDimensions.trim(),
            description: formDescription.trim(),
            curatorNotes: formCuratorNotes.trim(),
            imageUrl: formImageUrl.trim(),
            frameStyle: formFrameStyle,
            position: [formPosX, 0, formPosZ],
            rotationY: formRotationY,
            tags: tagsArray,
            aspectRatio: formAspectRatio,
            audioGuideText: formAudioText.trim() || undefined,
          };
        }
        return ex;
      });
    } else {
      // Create new with robust unique ID
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const newExhibit: Exhibit = {
        id: `art_${Date.now()}_${randomSuffix}`,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        era: formEra.trim(),
        provenance: formProvenance.trim(),
        material: formMaterial.trim(),
        dimensions: formDimensions.trim(),
        description: formDescription.trim(),
        curatorNotes: formCuratorNotes.trim(),
        imageUrl: formImageUrl.trim(),
        frameStyle: formFrameStyle,
        position: [formPosX, 0, formPosZ],
        rotationY: formRotationY,
        tags: tagsArray,
        aspectRatio: formAspectRatio,
        createdAt: Date.now(),
        audioGuideText: formAudioText.trim() || undefined,
      };
      updatedList = [newExhibit, ...exhibits];
    }

    try {
      await onSaveExhibits(updatedList);
      showNotification(
        editingExhibitId
          ? `"${formTitle}" eseri güncellendi ve tüm ziyaretçilere yayınlandı!`
          : `"${formTitle}" eseri 3D sergide oluşturuldu ve herkese yayınlandı!`
      );
      setActiveTab('list');
    } catch (err) {
      showNotification('Bulut veritabanına kaydederken hata oluştu: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`"${title}" eserini sergiden kaldırmak istediğinize emin misiniz?`)) {
      const filtered = exhibits.filter((ex) => ex.id !== id);
      try {
        await onSaveExhibits(filtered);
        showNotification(`Eser kaldırıldı ve buluttan silindi.`);
      } catch (err) {
        showNotification('Silme işlemi sırasında hata oluştu', 'error');
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Tüm eserleri sergiden temizlemek istediğinize emin misiniz?')) {
      try {
        await onSaveExhibits([]);
        showNotification('Tüm eserler temizlendi.');
      } catch (err) {
        showNotification('Temizleme işlemi sırasında hata oluştu', 'error');
      }
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(exhibits, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arkeolojik_sergi_manifest_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Sergi manifestosu JSON olarak indirildi');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          onSaveExhibits(parsed);
          showNotification(`${parsed.length} eser başarıyla içe aktarıldı!`);
        }
      } catch {
        showNotification('Geçersiz JSON dosyası', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="admin-management-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in"
    >
      <div
        id="admin-modal-panel"
        className="relative w-full max-w-4xl max-h-[90vh] bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-amber-200">
                Küratör Yönetimi & Sergi Stüdyosu
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                3D kaideleri, fotoğrafları ve arkeolojik üstverileri yönetin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                id="admin-logout-btn"
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-lg text-xs font-sans text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800 flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Çıkış Yap</span>
              </button>
            )}
            <button
              id="close-admin-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 font-sans ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-b border-rose-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Content Area */}
        {!isAuthenticated ? (
          /* Authentication Login Screen */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-xl font-serif font-semibold text-stone-200">
                Küratör Giriş Portalı
              </h4>
              <p className="text-xs text-stone-400 mt-1 font-sans">
                Özel fotoğraf yüklemek, 3D kaideler yerleştirmek ve eserleri düzenlemek için giriş yapın.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-3">
              <div>
                <input
                  id="admin-password-input"
                  type="password"
                  placeholder="Küratör şifresini girin"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:border-amber-500"
                />
                {authError && (
                  <p className="text-rose-400 text-[11px] text-left mt-1 font-sans">{authError}</p>
                )}
              </div>

              <button
                id="submit-curator-login-btn"
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-bold text-sm transition-colors shadow-lg"
              >
                Küratör Stüdyosuna Giriş Yap
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Curator Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs & Action Bar */}
            <div className="px-5 py-3 border-b border-stone-800 bg-stone-900/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  id="admin-tab-list-btn"
                  onClick={() => setActiveTab('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-serif transition-colors ${
                    activeTab === 'list'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Sergi Envanteri ({exhibits.length})
                </button>
                <button
                  id="admin-tab-editor-btn"
                  onClick={startCreateNew}
                  className={`px-3 py-1.5 rounded-lg text-xs font-serif flex items-center gap-1 transition-colors ${
                    activeTab === 'editor' && !editingExhibitId
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tekli Eser Ekle</span>
                </button>
                <button
                  id="admin-tab-bulk-btn"
                  onClick={() => setActiveTab('bulk')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-serif flex items-center gap-1.5 transition-colors ${
                    activeTab === 'bulk'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Images className="w-3.5 h-3.5" />
                  <span>Toplu Görsel Yükle</span>
                  {bulkCandidates.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 font-mono text-[10px] border border-amber-400/40">
                      {bulkCandidates.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Data Export / Import Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  id="export-exhibits-json-btn"
                  onClick={handleExportJSON}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-sans border border-stone-800 flex items-center gap-1"
                  title="Sergi manifestosunu JSON olarak indir"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON Dışa Aktar</span>
                </button>

                <label
                  htmlFor="import-manifest-input"
                  className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-sans border border-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>JSON İçe Aktar</span>
                  <input
                    id="import-manifest-input"
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>

                {exhibits.length > 0 && (
                  <button
                    id="clear-all-exhibits-btn"
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-rose-950/40 text-stone-400 hover:text-rose-400 border border-stone-800 transition-colors"
                    title="Tüm eserleri temizle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Tab Panels */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'list' ? (
                /* Exhibits Inventory Table */
                exhibits.length === 0 ? (
                  <div className="py-14 px-4 text-center flex flex-col items-center justify-center border border-dashed border-stone-800 rounded-2xl bg-stone-900/30">
                    <div className="w-12 h-12 rounded-xl bg-stone-800/90 text-amber-400 flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif text-base text-stone-200 font-semibold mb-1">
                      Henüz Eser Eklenmedi
                    </h4>
                    <p className="text-xs text-stone-400 max-w-sm mb-5 leading-relaxed">
                      Açık hava sergi alanı hazır. Eser eklemek ve 3D kaidesini sergiye yerleştirmek için aşağıdaki butona tıklayın.
                    </p>
                    <button
                      id="empty-state-add-artifact-btn"
                      onClick={startCreateNew}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>İlk Eseri Ekle</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {exhibits.map((ex) => (
                        <div
                          key={ex.id}
                          className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 hover:border-amber-500/40 transition-colors flex gap-3.5 items-start group"
                        >
                          {/* Thumbnail */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-950 shrink-0 border border-stone-800 relative">
                            <img
                              src={ex.imageUrl}
                              alt={ex.title}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className="font-serif font-bold text-sm text-amber-100 truncate">
                                {ex.title}
                              </h5>
                            </div>
                            <p className="text-xs text-amber-400/80 font-sans mt-0.5">{ex.era}</p>
                            <p className="text-[11px] text-stone-400 truncate mt-0.5 font-sans">
                              {ex.provenance}
                            </p>

                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-300 capitalize">
                                {ex.frameStyle.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] font-mono text-stone-400">
                                X:{ex.position[0]} Z:{ex.position[2]}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0 opacity-80 group-hover:opacity-100">
                            <button
                              id={`edit-exhibit-${ex.id}-btn`}
                              onClick={() => startEdit(ex)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-300 transition-colors"
                              title="Eser bilgilerini ve konumunu düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`focus-exhibit-${ex.id}-btn`}
                              onClick={() => {
                                onFocusExhibit(ex);
                                onClose();
                              }}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 transition-colors"
                              title="Kamerayı esere yönlendir"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-exhibit-${ex.id}-btn`}
                              onClick={() => handleDelete(ex.id, ex.title)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-600 hover:text-white text-stone-400 transition-colors"
                              title="Eseri kaldır"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : activeTab === 'editor' ? (
                /* Artifact Form Editor */
                <form onSubmit={handleSaveForm} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left Column: Image Upload & Frame Style */}
                    <div className="space-y-4">
                      {/* Image Preview & Upload Box */}
                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1.5">
                          Eser Fotoğrafı / Görsel *
                        </label>
                        <div className="border-2 border-dashed border-stone-700 rounded-xl p-4 bg-stone-900/50 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                          {formImageUrl ? (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-stone-950">
                              <img
                                src={formImageUrl}
                                alt="Önizleme"
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 text-xs font-bold font-serif"
                                >
                                  Fotoğrafı Değiştir
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="cursor-pointer py-6 flex flex-col items-center gap-2"
                            >
                              <div className="p-3 rounded-full bg-stone-800 text-amber-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                              <p className="text-xs text-stone-300 font-medium">
                                Fotoğraf yüklemek için tıklayın veya sürükleyin
                              </p>
                              <p className="text-[11px] text-stone-400">
                                PNG, JPG, WebP formatları desteklenir
                              </p>
                            </div>
                          )}

                          <input
                            ref={fileInputRef}
                            id="admin-file-upload-input"
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                        {formAspectRatio && (
                          <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-stone-900/80 border border-amber-500/30 text-[11px]">
                            <span className="text-stone-400">
                              Otomatik En-Boy Oranı:
                            </span>
                            <span className="font-mono text-amber-300 font-semibold">
                              {formAspectRatio >= 1.4
                                ? `${formAspectRatio}:1 (Geniş Yatay)`
                                : formAspectRatio > 1.05
                                ? `${formAspectRatio}:1 (Yatay)`
                                : formAspectRatio >= 0.95
                                ? '1:1 (Kare)'
                                : `${formAspectRatio}:1 (Dikey)`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Or direct URL input */}
                      <div>
                        <label className="block text-xs font-sans text-stone-400 mb-1">
                          Veya Doğrudan Görsel URLsi
                        </label>
                        <input
                          id="form-image-url-input"
                          type="url"
                          value={formImageUrl}
                          onChange={(e) => setFormImageUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Display Stand Frame Style */}
                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1.5">
                          3D Kaide & Vitrin Stili
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'stone_pedestal', label: 'Klasik Mermer Kaide', desc: 'Pirinç plakalı yontma taş' },
                            { id: 'glass_vitrine', label: 'Müze Cam Vitrini', desc: 'Pirinç çerçeveli temperli cam' },
                            { id: 'bronze_stela', label: 'Antik Bronz Stel', desc: 'Eskitilmiş patinalı stel' },
                            { id: 'obsidian_monolith', label: 'Obsidyen Monolit', desc: 'Altın kenarlı koyu bazalt' },
                          ].map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setFormFrameStyle(style.id as DisplayFrameStyle)}
                              className={`p-2.5 rounded-xl border text-left transition-all ${
                                formFrameStyle === style.id
                                  ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                              }`}
                            >
                              <span className="text-xs font-serif font-semibold block">
                                {style.label}
                              </span>
                              <span className="text-[10px] text-stone-400 block mt-0.5">
                                {style.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3D World Positioning Coordinates */}
                      <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-serif text-amber-200">
                            Sergi Alanı 3D Konumu (Genişletilebilir Saha)
                          </label>
                          <span className="text-[10px] text-stone-500 font-mono">X / Z / Açı</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                              <span>X:</span>
                              <input
                                type="number"
                                min="-80"
                                max="80"
                                step="0.5"
                                value={formPosX}
                                onChange={(e) => setFormPosX(Number(e.target.value))}
                                className="w-14 px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-amber-200 text-right font-mono text-[10px]"
                              />
                            </div>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              step="0.5"
                              value={formPosX}
                              onChange={(e) => setFormPosX(Number(e.target.value))}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                              <span>Z:</span>
                              <input
                                type="number"
                                min="-80"
                                max="80"
                                step="0.5"
                                value={formPosZ}
                                onChange={(e) => setFormPosZ(Number(e.target.value))}
                                className="w-14 px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-amber-200 text-right font-mono text-[10px]"
                              />
                            </div>
                            <input
                              type="range"
                              min="-80"
                              max="80"
                              step="0.5"
                              value={formPosZ}
                              onChange={(e) => setFormPosZ(Number(e.target.value))}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                              <span>Açı:</span>
                              <span className="text-amber-200 font-mono text-[10px]">{Math.round((formRotationY * 180) / Math.PI)}°</span>
                            </div>
                            <input
                              type="range"
                              min="-3.14"
                              max="3.14"
                              step="0.1"
                              value={formRotationY}
                              onChange={(e) => setFormRotationY(Number(e.target.value))}
                              className="w-full accent-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Metadata Details */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1">
                          Eser Başlığı *
                        </label>
                        <input
                          id="form-title-input"
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="Örn. Truva Altın Takıları"
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-serif"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-serif font-semibold text-amber-200 mb-1">
                          Açıklama
                        </label>
                        <textarea
                          rows={6}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Eser hakkında detaylı açıklama..."
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1">
                          Etiketler (virgülle ayırın)
                        </label>
                        <input
                          type="text"
                          value={formTags}
                          onChange={(e) => setFormTags(e.target.value)}
                          placeholder="Altın, Tunç Çağı, Truva, Takı"
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit / Cancel Buttons */}
                  <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                    <button
                      id="cancel-form-btn"
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-sans border border-stone-800"
                    >
                      Envantere Dön
                    </button>

                    <button
                      id="save-exhibit-form-btn"
                      type="submit"
                      disabled={isSaving}
                      className={`px-6 py-2 rounded-xl font-serif font-bold text-xs flex items-center gap-1.5 shadow-lg transition-colors ${
                        isSaving
                          ? 'bg-amber-600/60 text-stone-900 cursor-wait opacity-75'
                          : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                      }`}
                    >
                      <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                      <span>
                        {isSaving
                          ? 'Buluta Kaydediliyor...'
                          : editingExhibitId
                          ? 'Değişiklikleri Kaydet & Yayınla'
                          : '3D Sergi Kaidesi Oluştur & Yayınla'}
                      </span>
                    </button>
                  </div>
                </form>
              ) : activeTab === 'bulk' ? (
                /* Bulk Upload Studio */
                <div className="space-y-5">
                  {/* Info Header */}
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                      <Images className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-amber-200">
                        Toplu Görsel Yükleme Stüdyosu
                      </h4>
                      <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                        Birden fazla fotoğraf yükleyerek tek tıkla onlarca 3D eser oluşturun. Her bir fotoğrafın boyutu ve en-boy oranı otomatik tespit edilecek, 3D kaidesi sergi alanına helezonik düzende yerleştirilecektir.
                      </p>
                    </div>
                  </div>

                  {/* Batch Settings & File Picker */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Frame Style Selector */}
                    <div className="md:col-span-1 space-y-2">
                      <label className="block text-xs font-serif text-amber-200">
                        Varsayılan 3D Kaide Stili
                      </label>
                      <div className="space-y-1.5">
                        {[
                          { id: 'stone_pedestal', label: 'Klasik Mermer Kaide' },
                          { id: 'glass_vitrine', label: 'Müze Cam Vitrini' },
                          { id: 'bronze_stela', label: 'Antik Bronz Stel' },
                          { id: 'obsidian_monolith', label: 'Obsidyen Monolit' },
                        ].map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setBulkFrameStyle(style.id as DisplayFrameStyle)}
                            className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                              bulkFrameStyle === style.id
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                                : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Multi-file Upload Box */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-serif text-amber-200 mb-2">
                        Fotoğrafları Seçin veya Sürükleyin
                      </label>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files) {
                            handleBulkFilesSelected(e.dataTransfer.files);
                          }
                        }}
                        onClick={() => bulkFileInputRef.current?.click()}
                        className="border-2 border-dashed border-stone-700 hover:border-amber-500/60 transition-colors rounded-2xl p-6 bg-stone-900/40 cursor-pointer flex flex-col items-center justify-center text-center h-[180px] group"
                      >
                        <div className="p-3 rounded-full bg-stone-800 group-hover:bg-amber-500 group-hover:text-stone-950 text-amber-400 transition-colors mb-2">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-medium text-stone-200">
                          Toplu fotoğraf seçmek için tıklayın veya sürükleyin
                        </p>
                        <p className="text-[11px] text-stone-400 mt-1">
                          Birden fazla PNG, JPG, WebP fotoğraf seçebilirsiniz
                        </p>
                        <input
                          ref={bulkFileInputRef}
                          id="bulk-file-input"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) handleBulkFilesSelected(e.target.files);
                          }}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Candidate List Preview */}
                  {isProcessingBulk ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center bg-stone-900/30 rounded-2xl border border-stone-800">
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                      <p className="text-xs font-serif text-stone-200">Fotoğraflar işleniyor ve 3D kaideler oranlanıyor...</p>
                    </div>
                  ) : bulkCandidates.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                        <span className="text-xs font-serif text-amber-300 font-semibold">
                          Hazırlanan Eserler ({bulkCandidates.length} Adet)
                        </span>
                        <button
                          type="button"
                          onClick={handleClearBulkCandidates}
                          className="text-xs text-stone-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Listeyi Temizle</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                        {bulkCandidates.map((cand, idx) => (
                          <div
                            key={cand.id}
                            className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center gap-3 relative group"
                          >
                            <div className="w-14 h-14 rounded-lg bg-stone-950 overflow-hidden shrink-0 border border-stone-800">
                              <img src={cand.imageUrl} alt={cand.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                type="text"
                                value={cand.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkCandidates((prev) =>
                                    prev.map((c) => (c.id === cand.id ? { ...c, title: val } : c))
                                  );
                                }}
                                className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-serif"
                                placeholder="Eser başlığı..."
                              />
                              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono">
                                <span>Sıra #{idx + 1}</span>
                                <span className="text-amber-300/80">
                                  {cand.aspectRatio >= 1.4
                                    ? `${cand.aspectRatio}:1 (Geniş)`
                                    : cand.aspectRatio > 1.05
                                    ? `${cand.aspectRatio}:1 (Yatay)`
                                    : cand.aspectRatio >= 0.95
                                    ? '1:1 (Kare)'
                                    : `${cand.aspectRatio}:1 (Dikey)`}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBulkCandidate(cand.id)}
                              className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-rose-400 hover:bg-stone-700 transition-colors shrink-0"
                              title="Kaldır"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => bulkFileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-sans border border-stone-800 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Daha Fazla Fotoğraf Ekle</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleSaveBulk}
                          className={`px-6 py-2.5 rounded-xl font-serif font-bold text-xs flex items-center gap-2 shadow-lg transition-colors ${
                            isSaving
                              ? 'bg-amber-600/60 text-stone-900 cursor-wait opacity-75'
                              : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                          }`}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>3D Kaideler Oluşturuluyor...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>{bulkCandidates.length} Adet Eseri Sergide Oluştur & Yayınla</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
