import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, PencilBrush, FabricImage, IText, Rect } from 'fabric';
import { FaArrowLeft, FaCheck, FaPencilAlt, FaFont, FaUndo, FaTrash, FaPlus, FaTimes, FaMousePointer, FaCrop, FaSmile, FaMinus } from 'react-icons/fa';
import './ImageEditorModal.css';

const ImageEditorModal = ({ files, onSave, onClose, onAddMore }) => {
  // --- STATE ---
  const [activeFiles, setActiveFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTool, setActiveTool] = useState('pencil');
  const [activeColor, setActiveColor] = useState('#ff0000');
  const [brushWidth, setBrushWidth] = useState(5);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);

  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);
  const containerRef = useRef(null);

  const currentImageIdRef = useRef(null);
  const isCanvasLoading = useRef(false);
  const blobUrlsRef = useRef(new Set());

  // --- INITIALIZATION ---
  useEffect(() => {
    // Only initialize if activeFiles is empty to prevent wiping out state when files change
    if (files && files.length > 0 && activeFiles.length === 0) {
      const initial = files.map((file, idx) => {
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.add(url);
        return {
          id: `img-${Date.now()}-${idx}-${Math.random()}`,
          file: file,
          preview: url,
          canvasData: null,
          initialScale: 1
        };
      });

      setActiveFiles(initial);
      setCurrentIndex(0);
      currentImageIdRef.current = null;
    }
  }, [files, activeFiles.length]);

  // --- FABRIC CANVAS SETUP ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    fabricCanvas.current = canvas;

    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        const activeObject = canvas.getActiveObject();
        if (activeObject && !activeObject.isEditing && activeObject.name !== 'crop-selection') {
          canvas.remove(activeObject);
          canvas.renderAll();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    canvas.on('selection:created', (e) => setIsTextSelected(e.selected[0]?.type.includes('text')));
    canvas.on('selection:updated', (e) => setIsTextSelected(e.selected[0]?.type.includes('text')));
    canvas.on('selection:cleared', () => setIsTextSelected(false));

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (fabricCanvas.current) {
        fabricCanvas.current.dispose();
        fabricCanvas.current = null;
      }
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
    };
  }, []);

  // --- TOOL MANAGEMENT ---
  const updateBrushState = useCallback(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    // El pincel solo está activo si la herramienta es 'pencil' Y no estamos recortando Y no hay emojis abiertos
    if (activeTool === 'pencil' && !isCropping && !showEmojis) {
      canvas.isDrawingMode = true;
      if (!canvas.freeDrawingBrush) canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = brushWidth;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [activeTool, isCropping, showEmojis, activeColor, brushWidth]);

  // --- IMAGE LOADING & RESIZING ---
  const setupCanvas = useCallback(async (token) => {
    if (!fabricCanvas.current || activeFiles.length === 0 || !containerRef.current) return;
    const canvas = fabricCanvas.current;
    const currentData = activeFiles[currentIndex];

    if (!currentData) return;

    const imgKey = `${currentData.id}-${currentData.preview}`;
    if (currentImageIdRef.current === imgKey) return;

    // UPDATE IMMEDIATELY to prevent concurrent starts for the same target
    currentImageIdRef.current = imgKey;
    isCanvasLoading.current = true;

    try {
      const img = await FabricImage.fromURL(currentData.preview);
      if (token && token.cancelled) return;

      const containerWidth = containerRef.current.clientWidth - 80;
      const containerHeight = containerRef.current.clientHeight - 80;

      const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
      const canvasW = img.width * scale;
      const canvasH = img.height * scale;

      canvas.setDimensions({ width: Math.floor(canvasW), height: Math.floor(canvasH) });
      canvas.clear();

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
        name: 'bg-img'
      });

      if (currentData.initialScale !== scale) {
        setActiveFiles(prev => {
          const updated = [...prev];
          if (updated[currentIndex]) {
            updated[currentIndex] = { ...updated[currentIndex], initialScale: scale };
          }
          return updated;
        });
      }

      if (currentData.canvasData) {
        await canvas.loadFromJSON(currentData.canvasData);
        if (token && token.cancelled) return;
        
        // Use a copied array to safely remove elements!
        const objects = [...canvas.getObjects()];
        objects.forEach(obj => {
          if (obj.name === 'bg-img' || (obj.type === 'image' && obj.selectable === false)) {
            canvas.remove(obj);
          }
        });
      }

      if (token && token.cancelled) return; // ONE FINAL CHECK BEFORE ADDING!

      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();

      updateBrushState();
    } catch (err) {
      console.error("Error setting up canvas:", err);
    } finally {
      if (!token || !token.cancelled) {
        isCanvasLoading.current = false;
      }
    }
  }, [currentIndex, activeFiles, updateBrushState]);

  useEffect(() => {
    const token = { cancelled: false };
    setupCanvas(token);
    return () => { token.cancelled = true; };
  }, [setupCanvas]);

  useEffect(() => {
    updateBrushState();
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj && (activeObj.type.includes('text') || activeObj.type === 'path')) {
      activeObj.set({
        fill: activeObj.type.includes('text') ? activeColor : activeObj.fill,
        stroke: activeObj.type === 'path' ? activeColor : activeObj.stroke,
        strokeWidth: activeObj.type === 'path' ? brushWidth : activeObj.strokeWidth,
        fontFamily: activeObj.type.includes('text') ? fontFamily : activeObj.fontFamily
      });
      canvas.renderAll();
    }
  }, [activeColor, brushWidth, activeTool, fontFamily, isCropping, showEmojis, updateBrushState]);

  // --- ACTIONS ---
  const handleAddText = () => {
    const canvas = fabricCanvas.current;
    setShowEmojis(false);
    const text = new IText('', {
      left: canvas.width / 2,
      top: canvas.height / 2,
      fontSize: 40,
      fill: activeColor,
      fontFamily: fontFamily,
      placeholder: 'Escribe aquí...',
      originX: 'center',
      originY: 'center',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    canvas.renderAll();
    setActiveTool('select');
  };

  const handleStartCrop = () => {
    const canvas = fabricCanvas.current;
    setIsCropping(true);
    canvas.isDrawingMode = false;
    canvas.discardActiveObject();

    const rect = new Rect({
      left: 0,
      top: 0,
      width: canvas.width,
      height: canvas.height,
      fill: 'transparent',
      stroke: '#fff',
      strokeWidth: 2,
      cornerColor: '#fff',
      cornerSize: 12,
      transparentCorners: false,
      selectable: true,
      hasRotatingPoint: false,
      name: 'crop-selection',
      lockRotation: true,
      originX: 'left',
      originY: 'top'
    });

    const createOverlay = (name) => new Rect({
      fill: 'rgba(0,0,0,0.7)',
      selectable: false,
      evented: false,
      name: name,
      originX: 'left',
      originY: 'top'
    });
    const overlays = [createOverlay('ov-t'), createOverlay('ov-b'), createOverlay('ov-l'), createOverlay('ov-r')];

    const updateOverlays = () => {
      const { left, top, width, height, scaleX, scaleY } = rect;
      const w = width * scaleX;
      const h = height * scaleY;

      // Restricción física dentro del canvas
      if (left < 0) rect.set('left', 0);
      if (top < 0) rect.set('top', 0);
      if (left + w > canvas.width) {
        if (w > canvas.width) rect.set('scaleX', canvas.width / width);
        else rect.set('left', canvas.width - w);
      }
      if (top + h > canvas.height) {
        if (h > canvas.height) rect.set('scaleY', canvas.height / height);
        else rect.set('top', canvas.height - h);
      }

      const curL = rect.left;
      const curT = rect.top;
      const curW = rect.width * rect.scaleX;
      const curH = rect.height * rect.scaleY;

      overlays[0].set({ left: 0, top: 0, width: canvas.width, height: curT }); // Top
      overlays[1].set({ left: 0, top: curT + curH, width: canvas.width, height: Math.max(0, canvas.height - (curT + curH)) }); // Bottom
      overlays[2].set({ left: 0, top: curT, width: curL, height: curH }); // Left
      overlays[3].set({ left: curL + curW, top: curT, width: Math.max(0, canvas.width - (curL + curW)), height: curH }); // Right

      canvas.renderAll();
    };

    rect.on('moving', updateOverlays);
    rect.on('scaling', updateOverlays);
    canvas.add(...overlays, rect);
    canvas.setActiveObject(rect);
    setCropRect(rect);
    updateOverlays();
  };

  const handleApplyCrop = () => {
    if (!fabricCanvas.current || !cropRect) return;
    const canvas = fabricCanvas.current;
    const currentData = activeFiles[currentIndex];
    const multiplier = 1 / (currentData.initialScale || 1);

    const { left, top, width, height, scaleX, scaleY } = cropRect;
    const w = Math.floor(width * scaleX);
    const h = Math.floor(height * scaleY);
    const l = Math.floor(left);
    const t = Math.floor(top);

    // Ocultar UI de recorte
    const overlays = canvas.getObjects().filter(o => o.name?.startsWith('ov-') || o.name === 'crop-selection');
    overlays.forEach(o => o.set('visible', false));
    canvas.discardActiveObject();
    canvas.renderAll();

    // Capturar el área recortada con multiplicador para mantener la resolución original
    const dataUrl = canvas.toDataURL({
      left: l,
      top: t,
      width: w,
      height: h,
      format: 'jpeg',
      quality: 0.9,
      multiplier: 1 / (currentData.initialScale || 1)
    });

    setActiveFiles(prev => {
      const updated = [...prev];
      if (updated[currentIndex]) {
        updated[currentIndex] = {
          ...updated[currentIndex],
          preview: dataUrl,
          canvasData: null,
          initialScale: 1
        };
      }
      return updated;
    });

    setIsCropping(false);
    setCropRect(null);
  };

  const handleCancelCrop = () => {
    const canvas = fabricCanvas.current;
    canvas.getObjects().filter(o => o.name?.startsWith('ov-') || o.name === 'crop-selection').forEach(o => canvas.remove(o));
    setIsCropping(false);
    setCropRect(null);
    canvas.renderAll();
  };

  const saveCurrentState = useCallback(() => {
    if (!fabricCanvas.current || isCanvasLoading.current) return;
    const json = fabricCanvas.current.toJSON(['name']);
    setActiveFiles(prev => {
      const updated = [...prev];
      if (updated[currentIndex]) {
        updated[currentIndex] = { ...updated[currentIndex], canvasData: json };
      }
      return updated;
    });
  }, [currentIndex]);

  const handleBack = () => {
    // Limpieza agresiva antes de cerrar para asegurar que la próxima apertura sea limpia
    if (fabricCanvas.current) {
      fabricCanvas.current.dispose();
      fabricCanvas.current = null;
    }
    onClose();
  };

  const handleFinish = async () => {
    saveCurrentState();
    const editedFilesPromises = activeFiles.map(async (item, idx) => {
      if (idx === currentIndex) {
        return await canvasToFile(fabricCanvas.current, item.file.name, 1 / (item.initialScale || 1));
      } else {
        const tempElement = document.createElement('canvas');
        const tempCanvas = new Canvas(tempElement);
        const bgImg = await FabricImage.fromURL(item.preview);
        
        const scale = item.initialScale || 1;
        tempCanvas.setDimensions({ 
          width: Math.floor(bgImg.width * scale), 
          height: Math.floor(bgImg.height * scale) 
        });
        
        if (item.canvasData) await tempCanvas.loadFromJSON(item.canvasData);
        
        bgImg.set({ 
          left: 0, 
          top: 0, 
          scaleX: scale, 
          scaleY: scale, 
          originX: 'left',
          originY: 'top',
          selectable: false,
          name: 'bg-img'
        });
        
        const objects = [...tempCanvas.getObjects()];
        objects.forEach(o => { 
          if (o.name === 'bg-img' || (o.type === 'image' && !o.selectable)) {
            tempCanvas.remove(o); 
          }
        });
        
        tempCanvas.add(bgImg);
        tempCanvas.sendObjectToBack(bgImg);
        
        const file = await canvasToFile(tempCanvas, item.file.name, 1 / scale);
        tempCanvas.dispose();
        return file;
      }
    });
    const editedFiles = await Promise.all(editedFilesPromises);
    onSave(editedFiles);
  };

  const canvasToFile = (canvas, filename, multiplier) => {
    return new Promise((resolve) => {
      const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier });
      fetch(dataUrl).then(res => res.blob()).then(blob => {
        resolve(new File([blob], filename, { type: 'image/jpeg' }));
      });
    });
  };

  return (
    <div className={`image-editor-modal ${isCropping ? 'mode-crop' : ''}`}>
      <div className="editor-content-v2">

        {/* TOP BAR */}
        <div className="editor-top-bar">
          <div className="top-left-group">
            <button className="tool-btn-v2" onClick={handleBack} disabled={isCropping} title="Atrás"><FaArrowLeft /></button>
            <div className="active-tool-indicator">
              {isCropping ? 'Modo: Recortar' :
                showEmojis ? 'Modo: Stickers' :
                  activeTool === 'pencil' ? 'Modo: Pincel' :
                    activeTool === 'text' ? 'Modo: Texto' : 'Modo: Selección'}
            </div>
          </div>

          <div className="top-tools">
            {isCropping ? (
              <div className="crop-actions-group">
                <button className="crop-action-btn cancel" onClick={handleCancelCrop}>
                  Cancelar recorte
                </button>
                <button className="crop-action-btn confirm" onClick={handleApplyCrop}>
                  Confirmar recorte
                </button>
              </div>
            ) : (
              <>
                <button
                  className={`tool-btn-v2 ${isCropping ? 'active' : ''}`}
                  onClick={handleStartCrop}
                  title="Recortar"
                >
                  <FaCrop />
                  <span className="tool-label">Recortar</span>
                </button>
                <button
                  className={`tool-btn-v2 ${showEmojis ? 'active' : ''}`}
                  onClick={() => {
                    setShowEmojis(!showEmojis);
                    if (!showEmojis) setActiveTool('select');
                  }}
                  title="Stickers"
                >
                  <FaSmile />
                  <span className="tool-label">Stickers</span>
                </button>
                <button
                  className={`tool-btn-v2 ${activeTool === 'text' ? 'active' : ''}`}
                  onClick={handleAddText}
                  title="Texto"
                >
                  <FaFont />
                  <span className="tool-label">Texto</span>
                </button>
                <button
                  className={`tool-btn-v2 ${activeTool === 'pencil' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTool('pencil');
                    setShowEmojis(false);
                  }}
                  title="Pincel"
                >
                  <FaPencilAlt />
                  <span className="tool-label">Pincel</span>
                </button>
                <button
                  className={`tool-btn-v2 ${activeTool === 'select' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTool('select');
                    setShowEmojis(false);
                  }}
                  title="Mover"
                >
                  <FaMousePointer />
                  <span className="tool-label">Mover</span>
                </button>
                <button
                  className="tool-btn-v2"
                  onClick={() => { fabricCanvas.current.getObjects().forEach(o => { if (o.selectable) fabricCanvas.current.remove(o); }); fabricCanvas.current.renderAll(); }}
                  title="Limpiar"
                >
                  <FaTrash />
                  <span className="tool-label">Limpiar</span>
                </button>
                <button
                  className="tool-btn-v2"
                  onClick={() => { const obs = fabricCanvas.current.getObjects().filter(o => o.selectable); if (obs.length) fabricCanvas.current.remove(obs[obs.length - 1]); fabricCanvas.current.renderAll(); }}
                  title="Deshacer"
                >
                  <FaUndo />
                  <span className="tool-label">Deshacer</span>
                </button>
              </>
            )}
          </div>

          <button className="btn-send-v2" onClick={handleFinish} disabled={isCropping}>
            <FaCheck /> Listo
          </button>
        </div>

        {/* WORKSPACE */}
        <div className="editor-workspace">
          <div className="editor-main-v2" ref={containerRef}>
            <canvas ref={canvasRef} />
            {showEmojis && (
              <div className="emoji-picker-v2">
                {['🎨', '✨', '🔥', '❤️', '🙌', '🚀', '⭐', '🌈', '💡', '✅', '❌', '⚠️', '👀', '📌', '🎭', '🥳', '😎', '🎉', '💪', '🍕'].map(e => (
                  <span key={e} onClick={() => {
                    const text = new IText(e, { left: fabricCanvas.current.width / 2, top: fabricCanvas.current.height / 2, fontSize: 80, originX: 'center', originY: 'center' });
                    fabricCanvas.current.add(text);
                    fabricCanvas.current.setActiveObject(text);
                    setShowEmojis(false);
                  }}>{e}</span>
                ))}
              </div>
            )}
          </div>

          <div className="editor-side-tools">
            <div className="vertical-color-picker">
              {[
                '#ffffff', '#000000', // Blanco y Negro
                '#ff5c5c', '#d63031', // Rojos
                '#ff9f5c', '#e17055', // Naranjas
                '#ffef5c', '#fdcb6e', // Amarillos
                '#5cff9f', '#00b894', // Verdes
                '#5c9fff', '#0984e3', // Azules
                '#9f5cff', '#6c5ce7', // Morados
                '#8b0000', '#a0522d', // Oscuros / Café
                '#b8860b', '#006400', // Oro / Verde Oscuro
                '#00008b', '#4b0082'  // Azul Oscuro / Índigo
              ].map(c => (
                <div key={c} className={`color-dot ${activeColor === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setActiveColor(c)} />
              ))}
            </div>
            <div className="vertical-size-slider">
              <button className="size-step-btn" onClick={() => setBrushWidth(prev => Math.min(50, prev + 2))}><FaPlus /></button>
              <input
                type="range"
                min="1"
                max="50"
                value={brushWidth}
                onChange={(e) => setBrushWidth(parseInt(e.target.value))}
              />
              <button className="size-step-btn" onClick={() => setBrushWidth(prev => Math.max(1, prev - 2))}><FaMinus /></button>
            </div>

            <div className="font-selector-v2">
              {['Arial', 'Georgia', 'Courier New', 'Brush Script MT', 'Impact'].map(f => (
                <button
                  key={f}
                  className={`font-btn ${fontFamily === f ? 'active' : ''}`}
                  style={{ fontFamily: f }}
                  onClick={() => setFontFamily(f)}
                >
                  Abc
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="editor-footer-v2">
          <div className="thumbnails-v2">
            {activeFiles.map((item, idx) => (
              <div 
                key={item.id} 
                className={`thumb-v2 ${idx === currentIndex ? 'active' : ''}`} 
                style={isCropping ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                onClick={() => { 
                  if (isCropping) return;
                  saveCurrentState(); 
                  setCurrentIndex(idx); 
                }}
              >
                <img src={item.preview} alt="" />
                <button 
                  className="btn-remove-thumb" 
                  disabled={isCropping}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isCropping) return;
                    const n = activeFiles.filter((_, i) => i !== idx); 
                    if (n.length === 0) onClose(); 
                    else { 
                      setActiveFiles(n); 
                      if (currentIndex >= n.length) setCurrentIndex(n.length - 1); 
                    } 
                  }}
                >
                  <FaTimes />
                </button>
              </div>
            ))}
            <label className="thumb-v2 thumb-add" style={isCropping ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
              <FaPlus />
              <input type="file" multiple accept="image/*" disabled={isCropping} onChange={(e) => {
                const newFiles = Array.from(e.target.files);
                if (newFiles.length > 0) {
                  const processed = newFiles.map((file, idx) => {
                    const url = URL.createObjectURL(file);
                    blobUrlsRef.current.add(url);
                    return {
                      id: `img-${Date.now()}-new-${idx}-${Math.random()}`,
                      file: file,
                      preview: url,
                      canvasData: null,
                      initialScale: 1
                    };
                  });
                  setActiveFiles(prev => [...prev, ...processed]);
                }
                e.target.value = null;
              }} hidden />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ImageEditorModal;