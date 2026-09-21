import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Image as ImageIcon,
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

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibits: Exhibit[];
  onSaveExhibits: (exhibits: Exhibit[]) => void;
  onFocusExhibit: (exhibit: Exhibit) => void;
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

  // Active Tab: 'list' | 'editor'
  const [activeTab, setActiveTab] = useState<'list' | 'editor'>('list');
  const [editingExhibitId, setEditingExhibitId] = useState<string | null>(null);

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

  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      showNotification('Curator access authorized');
    } else {
      setAuthError('Invalid password. Please enter the curator password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('archaeo_admin_token');
    showNotification('Curator logged out');
  };

  const startCreateNew = () => {
    setEditingExhibitId(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormEra('c. 450 BCE (Classical Period)');
    setFormProvenance('Ancient Mediterranean Basin');
    setFormMaterial('Carved Marble / Bronze');
    setFormDimensions('1.8 m × 0.9 m');
    setFormDescription('Excavated archaeological artifact showcasing classical Mediterranean craftsmanship.');
    setFormCuratorNotes('Discovered during archaeological stratigraphy surveys.');
    setFormImageUrl('https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1200&q=80');
    setFormFrameStyle('stone_pedestal');
    
    // Auto find an unoccupied spot around the forum
    const count = exhibits.length;
    const angle = (count * (Math.PI * 2)) / 10;
    const dist = 10 + (count % 3) * 4;
    setFormPosX(Math.round(Math.sin(angle) * dist));
    setFormPosZ(Math.round(Math.cos(angle) * dist));
    setFormRotationY(Math.round((angle + Math.PI) * 100) / 100);
    setFormTags('Archaeology, Artifact, Classical');
    setFormAudioText('');
    setActiveTab('editor');
  };

  const startEdit = (exhibit: Exhibit) => {
    setEditingExhibitId(exhibit.id);
    setFormTitle(exhibit.title);
    setFormSubtitle(exhibit.subtitle || '');
    setFormEra(exhibit.era);
    setFormProvenance(exhibit.provenance);
    setFormMaterial(exhibit.material);
    setFormDimensions(exhibit.dimensions || '');
    setFormDescription(exhibit.description);
    setFormCuratorNotes(exhibit.curatorNotes || '');
    setFormImageUrl(exhibit.imageUrl);
    setFormFrameStyle(exhibit.frameStyle);
    setFormPosX(exhibit.position[0]);
    setFormPosZ(exhibit.position[2]);
    setFormRotationY(exhibit.rotationY || 0);
    setFormTags(exhibit.tags ? exhibit.tags.join(', ') : '');
    setFormAudioText(exhibit.audioGuideText || '');
    setActiveTab('editor');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setFormImageUrl(dataUrl);
      showNotification('Image uploaded successfully into 3D exhibit stand');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showNotification('Please enter an exhibit title', 'error');
      return;
    }
    if (!formImageUrl.trim()) {
      showNotification('Please provide an image URL or upload a file', 'error');
      return;
    }

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
            title: formTitle,
            subtitle: formSubtitle,
            era: formEra,
            provenance: formProvenance,
            material: formMaterial,
            dimensions: formDimensions,
            description: formDescription,
            curatorNotes: formCuratorNotes,
            imageUrl: formImageUrl,
            frameStyle: formFrameStyle,
            position: [formPosX, 0, formPosZ],
            rotationY: formRotationY,
            tags: tagsArray,
            audioGuideText: formAudioText || undefined,
          };
        }
        return ex;
      });
      showNotification(`Exhibit "${formTitle}" updated!`);
    } else {
      // Create new
      const newExhibit: Exhibit = {
        id: `exhibit-user-${Date.now()}`,
        title: formTitle,
        subtitle: formSubtitle,
        era: formEra || 'Ancient Era',
        provenance: formProvenance || 'Excavation Site',
        material: formMaterial || 'Limestone',
        dimensions: formDimensions,
        description: formDescription,
        curatorNotes: formCuratorNotes,
        imageUrl: formImageUrl,
        frameStyle: formFrameStyle,
        position: [formPosX, 0, formPosZ],
        rotationY: formRotationY,
        tags: tagsArray,
        createdAt: Date.now(),
        audioGuideText: formAudioText || undefined,
      };
      updatedList = [newExhibit, ...exhibits];
      showNotification(`New exhibit "${formTitle}" created in 3D exhibition!`);
    }

    onSaveExhibits(updatedList);
    setActiveTab('list');
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from the exhibition?`)) {
      const filtered = exhibits.filter((ex) => ex.id !== id);
      onSaveExhibits(filtered);
      showNotification(`Exhibit removed.`);
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(exhibits, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archaeological_exhibition_manifest_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Exhibition manifest JSON downloaded');
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
          showNotification(`Imported ${parsed.length} exhibits successfully!`);
        }
      } catch {
        showNotification('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset the exhibition to the default curated historical collection?')) {
      onSaveExhibits(DEFAULT_EXHIBITS);
      showNotification('Exhibition reset to default curated collection.');
    }
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
                Curator Administration & Exhibition Studio
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                Manage 3D plinths, photos, and archaeological metadata
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
                <span>Logout</span>
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
                Curator Portal Authentication
              </h4>
              <p className="text-xs text-stone-400 mt-1 font-sans">
                Sign in to upload custom photos, place 3D plinths, and curate artifacts.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-3">
              <div>
                <input
                  id="admin-password-input"
                  type="password"
                  placeholder="Enter curator password"
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
                Enter Curator Studio
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
                  Exhibition Inventory ({exhibits.length})
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
                  <span>Upload New Artifact</span>
                </button>
              </div>

              {/* Data Export / Import Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  id="export-exhibits-json-btn"
                  onClick={handleExportJSON}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-sans border border-stone-800 flex items-center gap-1"
                  title="Download exhibition manifest as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Manifest</span>
                </button>

                <label
                  htmlFor="import-manifest-input"
                  className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-sans border border-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON</span>
                  <input
                    id="import-manifest-input"
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>

                <button
                  id="reset-default-exhibits-btn"
                  onClick={handleResetDefaults}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-amber-300 border border-stone-800"
                  title="Reset to default collection"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Tab Panels */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'list' ? (
                /* Exhibits Inventory Table */
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
                            title="Edit exhibit metadata and position"
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
                            title="Fly camera to exhibit"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-exhibit-${ex.id}-btn`}
                            onClick={() => handleDelete(ex.id, ex.title)}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-600 hover:text-white text-stone-400 transition-colors"
                            title="Remove exhibit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Artifact Form Editor */
                <form onSubmit={handleSaveForm} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left Column: Image Upload & Frame Style */}
                    <div className="space-y-4">
                      {/* Image Preview & Upload Box */}
                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1.5">
                          Artifact Photo / 3D Canvas Image *
                        </label>
                        <div className="border-2 border-dashed border-stone-700 rounded-xl p-4 bg-stone-900/50 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                          {formImageUrl ? (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-stone-950">
                              <img
                                src={formImageUrl}
                                alt="Preview"
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 text-xs font-bold font-serif"
                                >
                                  Replace File
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
                                Drag & drop or click to upload photo
                              </p>
                              <p className="text-[11px] text-stone-400">
                                PNG, JPG, WebP supported
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
                      </div>

                      {/* Or direct URL input */}
                      <div>
                        <label className="block text-xs font-sans text-stone-400 mb-1">
                          Or Direct Image URL
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
                          3D Display Stand & Vitrine Style
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'stone_pedestal', label: 'Classical Marble Pedestal', desc: 'Carved stone with brass plaque' },
                            { id: 'glass_vitrine', label: 'Museum Glass Vitrine', desc: 'Tempered glass with brass frame' },
                            { id: 'bronze_stela', label: 'Ancient Bronze Stela', desc: 'Weathered patina stela' },
                            { id: 'obsidian_monolith', label: 'Obsidian Monolith', desc: 'Dark basalt with gold edging' },
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
                        <label className="block text-xs font-serif text-amber-200">
                          3D Coordinates in Archaeological Site (X, Z)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-stone-400 block font-mono">X Axis: {formPosX}</span>
                            <input
                              type="range"
                              min="-24"
                              max="24"
                              value={formPosX}
                              onChange={(e) => setFormPosX(Number(e.target.value))}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block font-mono">Z Axis: {formPosZ}</span>
                            <input
                              type="range"
                              min="-24"
                              max="24"
                              value={formPosZ}
                              onChange={(e) => setFormPosZ(Number(e.target.value))}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block font-mono">
                              Angle: {Math.round((formRotationY * 180) / Math.PI)}°
                            </span>
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
                          Artifact Title *
                        </label>
                        <input
                          id="form-title-input"
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="e.g. Bronze Charioteer of Delphi"
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-serif"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-serif text-amber-200 mb-1">
                            Historical Era / Date
                          </label>
                          <input
                            type="text"
                            value={formEra}
                            onChange={(e) => setFormEra(e.target.value)}
                            placeholder="e.g. c. 470 BCE (Classical)"
                            className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-serif text-amber-200 mb-1">
                            Excavation Provenance
                          </label>
                          <input
                            type="text"
                            value={formProvenance}
                            onChange={(e) => setFormProvenance(e.target.value)}
                            placeholder="e.g. Sanctuary of Apollo, Delphi"
                            className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-serif text-amber-200 mb-1">
                            Material / Medium
                          </label>
                          <input
                            type="text"
                            value={formMaterial}
                            onChange={(e) => setFormMaterial(e.target.value)}
                            placeholder="e.g. Cast Bronze, Glass Inlay"
                            className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-serif text-amber-200 mb-1">
                            Dimensions
                          </label>
                          <input
                            type="text"
                            value={formDimensions}
                            onChange={(e) => setFormDimensions(e.target.value)}
                            placeholder="e.g. 1.80 m height"
                            className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1">
                          Archaeological Description & History
                        </label>
                        <textarea
                          rows={3}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Comprehensive archaeological history and artistic context..."
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1">
                          Curator Excavation Notes
                        </label>
                        <textarea
                          rows={2}
                          value={formCuratorNotes}
                          onChange={(e) => setFormCuratorNotes(e.target.value)}
                          placeholder="Field notes on excavation stratigraphy, restoration, or discovery..."
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1">
                          Audio Guide Narration Script
                        </label>
                        <input
                          type="text"
                          value={formAudioText}
                          onChange={(e) => setFormAudioText(e.target.value)}
                          placeholder="Text spoken by the audio guide narrator..."
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-serif text-amber-200 mb-1">
                          Tags (comma separated)
                        </label>
                        <input
                          type="text"
                          value={formTags}
                          onChange={(e) => setFormTags(e.target.value)}
                          placeholder="Bronze, Classical, Delphi, Sculpture"
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
                      Back to Inventory
                    </button>

                    <button
                      id="save-exhibit-form-btn"
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-bold text-xs flex items-center gap-1.5 shadow-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingExhibitId ? 'Save Exhibit Changes' : 'Spawn 3D Exhibit Stand'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
