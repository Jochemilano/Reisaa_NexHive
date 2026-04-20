import React, { useState, useEffect, useRef } from 'react';
import { 
  Canvas, 
  PencilBrush, 
  FabricImage, 
  IText,
  Rect
} from 'fabric'; 
import { 
  FaArrowLeft, 
  FaCheck, 
  FaPencilAlt, 
  FaFont, 
  FaUndo, 
  FaTrash, 
  FaPlus,
  FaTimes,
  FaMousePointer,
  FaCrop,
  FaSmile
} from 'react-icons/fa';
import './ImageEditorModal.css';

const ImageEditorModal = ({ files, onSave, onClose, onAddMore }) => {
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

  // Inicializar/Actualizar archivos locales con estado de edición
  useEffect(() => {
    if (files && files.length > 0) {
      setActiveFiles(prev => {
        // Encontrar archivos que no están en el estado actual (por nombre y tamaño como proxy simple)
        const newFiles = files.filter(f => !prev.some(p => p.file.name === f.name && p.file.size === f.size));
        
        if (newFiles.length === 0) return prev;

        const initial = newFiles.map((file, idx) => ({
          id: `img-${Date.now()}-${idx}-${Math.random()}`,
          file: file,
          preview: URL.createObjectURL(file),
          canvasData: null
        }));
        
        return [...prev, ...initial];
      });
    }
  }, [files]);

  // Inicializar Fabric Canvas con ResizeObserver
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: containerRef.current.offsetWidth || 800,
      height: containerRef.current.offsetHeight || 600,
      backgroundColor: '#000000',
      preserveObjectStacking: true,
    });

    fabricCanvas.current = canvas;

    // Manejar tecla suprimir
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Solo si no estamos editando texto
        const activeObject = canvas.getActiveObject();
        if (activeObject && !activeObject.isEditing) {
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Eventos de selección para sincronizar UI
    canvas.on('selection:created', (e) => {
      const obj = e.selected[0];
      if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
        setIsTextSelected(true);
        setActiveColor(obj.fill);
        setFontFamily(obj.fontFamily);
      }
    });

    canvas.on('selection:updated', (e) => {
      const obj = e.selected[0];
      if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
        setIsTextSelected(true);
        setActiveColor(obj.fill);
        setFontFamily(obj.fontFamily);
      } else {
        setIsTextSelected(false);
      }
    });

    canvas.on('selection:cleared', () => {
      setIsTextSelected(false);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0] && fabricCanvas.current && containerRef.current) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          fabricCanvas.current.setDimensions({ width, height });
          fabricCanvas.current.renderAll();
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  // Cargar imagen actual al canvas
  useEffect(() => {
    if (!fabricCanvas.current || activeFiles.length === 0) return;

    const canvas = fabricCanvas.current;
    const currentData = activeFiles[currentIndex];

    const setupCanvas = async () => {
      // Limpiar canvas
      canvas.clear();
      canvas.backgroundColor = '#000000';

      try {
        // Cargar imagen de fondo
        const img = await FabricImage.fromURL(currentData.preview);
        
        // Escalar imagen para que quepa en el canvas manteniendo proporción
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
        
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          hoverCursor: 'default'
        });

        // Si hay datos guardados de edición previa, cargarlos
        if (currentData.canvasData) {
          await canvas.loadFromJSON(currentData.canvasData);
          // Después de cargar el JSON, nos aseguramos de que la imagen de fondo esté presente
          // (a veces el JSON puede no incluirla o queremos forzar la actual)
          const objects = canvas.getObjects();
          const existingBg = objects.find(obj => obj.type === 'image' && obj.selectable === false);
          if (existingBg) canvas.remove(existingBg);
        }

        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
        updateBrush();
      } catch (error) {
        console.error("Error loading image to canvas:", error);
      }
    };

    setupCanvas();
  }, [currentIndex, activeFiles.length]);

  // Sincronizar cambios de UI con el objeto seleccionado (Color, Tamaño, Fuente)
  useEffect(() => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        if (obj.type === 'i-text' || obj.type === 'text') {
          obj.set({
            fill: activeColor,
            fontSize: brushWidth * 3 + 20,
            fontFamily: fontFamily
          });
        } else if (obj.type === 'path') {
          // Si seleccionamos un trazo, también permitimos cambiar su color/grosor
          obj.set({
            stroke: activeColor,
            strokeWidth: brushWidth
          });
        }
      });
      canvas.renderAll();
    }

    // Actualizar pincel si estamos en modo dibujo
    if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = brushWidth;
    }
  }, [activeColor, brushWidth, fontFamily]);

  const updateBrush = (tool) => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    setActiveTool(tool);

    if (tool === 'pencil') {
      canvas.isDrawingMode = true;
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = brushWidth;
    } else {
      canvas.isDrawingMode = false;
    }
  };

  const handleAddText = () => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    
    const text = new IText('Texto...', {
      left: canvas.width / 2,
      top: canvas.height / 2,
      fontFamily: fontFamily,
      fill: activeColor,
      fontSize: 40,
      originX: 'center',
      originY: 'center',
      cornerColor: '#3498db',
      cornerStrokeColor: '#fff',
      transparentCorners: false,
      cornerSize: 12,
      padding: 10,
      borderDashArray: [3, 3],
      borderColor: '#3498db'
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    updateBrush('select');
    
    setTimeout(() => {
        text.enterEditing();
        text.selectAll();
        canvas.renderAll();
    }, 100);
  };

  const handleStartCrop = () => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    setIsCropping(true);
    updateBrush('select');

    // Crear un rectángulo de recorte
    const rect = new Rect({
        left: canvas.width * 0.1,
        top: canvas.height * 0.1,
        width: canvas.width * 0.8,
        height: canvas.height * 0.8,
        fill: 'rgba(0,0,0,0.3)',
        stroke: '#3498db',
        strokeWidth: 2,
        dashArray: [5, 5],
        cornerColor: '#3498db',
        cornerSize: 12,
        transparentCorners: false,
        selectable: true,
        hasRotatingPoint: false,
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    setCropRect(rect);
  };

  const handleApplyCrop = async () => {
    if (!fabricCanvas.current || !cropRect) return;
    const canvas = fabricCanvas.current;
    
    const { left, top, width, height, scaleX, scaleY } = cropRect;
    const actualWidth = width * scaleX;
    const actualHeight = height * scaleY;

    // Obtener la imagen recortada
    const dataUrl = canvas.toDataURL({
        left: left,
        top: top,
        width: actualWidth,
        height: actualHeight,
        format: 'png',
        multiplier: 1 // Mantener resolución actual del canvas
    });

    // Limpiar todo y poner la nueva imagen
    canvas.clear();
    canvas.backgroundColor = '#000000';
    
    try {
        const img = await FabricImage.fromURL(dataUrl);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        img.set({
            scaleX: scale,
            scaleY: scale,
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });
        
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
        
        setIsCropping(false);
        setCropRect(null);
        saveCurrentState();
    } catch (e) {
        console.error("Error applying crop:", e);
    }
  };

  const handleCancelCrop = () => {
    if (!fabricCanvas.current || !cropRect) return;
    fabricCanvas.current.remove(cropRect);
    setIsCropping(false);
    setCropRect(null);
  };

  const handleUndo = () => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    const objects = canvas.getObjects();
    // No borrar la imagen de fondo (último objeto añadido en setupCanvas, pero enviado al fondo)
    // Buscamos el último objeto que NO sea la imagen de fondo
    const reversibleObjects = objects.filter(obj => obj.selectable !== false);
    if (reversibleObjects.length > 0) {
      canvas.remove(reversibleObjects[reversibleObjects.length - 1]);
      canvas.renderAll();
    }
  };

  const handleClearAll = () => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if (obj.selectable !== false) {
        canvas.remove(obj);
      }
    });
    canvas.renderAll();
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        if (obj.selectable !== false) {
          canvas.remove(obj);
        }
      });
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const handleAddEmoji = (emoji) => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    
    const text = new IText(emoji, {
      left: canvas.width / 2,
      top: canvas.height / 2,
      fontSize: 80,
      originX: 'center',
      originY: 'center',
      selectable: true,
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    setActiveTool('select');
    setShowEmojis(false);
  };
  const saveCurrentState = () => {
    if (!fabricCanvas.current) return;
    const json = fabricCanvas.current.toJSON();
    
    setActiveFiles(prev => {
      const updated = [...prev];
      if (updated[currentIndex]) {
        updated[currentIndex].canvasData = json;
      }
      return updated;
    });
  };

  const switchImage = (index) => {
    saveCurrentState();
    setCurrentIndex(index);
  };

  const handleFinish = async () => {
    saveCurrentState();
    
    // Generar archivos finales
    const editedFilesPromises = activeFiles.map(async (item, idx) => {
      // Si somos el actual, usamos el canvas vivo. Si no, tendríamos que renderizar cada uno.
      // Para simplificar y asegurar calidad, renderizaremos el actual y usaremos los datos guardados para los demás si es necesario.
      // Pero mejor: iteramos y renderizamos cada uno en un canvas temporal o el mismo.
      
      // Renderizar el canvas actual para obtener la imagen editada
      const canvas = fabricCanvas.current;
      
      // Si estamos procesando el currentIndex, usamos el canvas tal cual
      if (idx === currentIndex) {
        return await canvasToFile(canvas, item.file.name);
      } else {
        // Para los otros, tendríamos que cargarlos.
        // Opción: Al guardar el estado, también guardamos un "preview" editado o simplemente procesamos todo al final.
        // Vamos a procesar todo al final cambiando el currentIndex programáticamente (oculto si es posible) o recreando un canvas.
        
        // Crear canvas temporal
        const tempElement = document.createElement('canvas');
        tempElement.width = canvas.width;
        tempElement.height = canvas.height;
        const tempCanvas = new Canvas(tempElement);
        
        // Cargar datos
        await tempCanvas.loadFromJSON(item.canvasData || {});
        
        // Cargar imagen de fondo si no estaba en JSON (depende de cómo se guarde en fabric)
        // Por defecto toJSON no guarda la imagen de fondo si la pusimos manualmente sin src persistente.
        // Así que la añadimos de nuevo.
        const img = await FabricImage.fromURL(item.preview);
        const scale = Math.min(tempCanvas.width / img.width, tempCanvas.height / img.height);
        img.set({
            scaleX: scale, scaleY: scale,
            left: tempCanvas.width / 2,
            top: tempCanvas.height / 2,
            originX: 'center',
            originY: 'center',
            selectable: false, evented: false
        });
        tempCanvas.add(img);
        tempCanvas.sendObjectToBack(img);
        
        const file = await canvasToFile(tempCanvas, item.file.name);
        tempCanvas.dispose();
        return file;
      }
    });

    const editedFiles = await Promise.all(editedFilesPromises);
    onSave(editedFiles);
  };

  const canvasToFile = (canvas, filename) => {
    return new Promise((resolve) => {
      // Exportar a mayor calidad/tamaño original si es posible, pero aquí usamos el tamaño de vista
      const dataUrl = canvas.toDataURL({
        format: 'jpeg',
        quality: 0.9,
      });
      
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], filename, { type: 'image/jpeg' });
          resolve(file);
        });
    });
  };

  const handleRemoveImage = (e, index) => {
    e.stopPropagation();
    const newFiles = activeFiles.filter((_, i) => i !== index);
    if (newFiles.length === 0) {
      onClose();
      return;
    }
    setActiveFiles(newFiles);
    if (currentIndex >= newFiles.length) {
      setCurrentIndex(newFiles.length - 1);
    }
  };

  return (
    <div className={`image-editor-modal ${isCropping ? 'mode-crop' : ''}`}>
      <div className="editor-overlay" onClick={onClose} />
      <div className="editor-content-v2">
        
        {/* TOP BAR - WhatsApp Style */}
        <div className="editor-top-bar">
          <button className="btn-icon-v2" onClick={onClose}>
            <FaArrowLeft />
          </button>
          
          <div className="top-tools">
            <button 
                className={`tool-btn-v2 ${isCropping ? 'active' : ''}`} 
                onClick={isCropping ? handleApplyCrop : handleStartCrop}
                title="Recortar"
            >
                <FaCrop />
            </button>
            <button 
                className="tool-btn-v2" 
                onClick={() => setShowEmojis(!showEmojis)}
                title="Stickers"
            >
                <FaSmile />
            </button>
            <button 
                className={`tool-btn-v2 ${activeTool === 'text' ? 'active' : ''}`} 
                onClick={handleAddText}
                title="Texto"
            >
                <FaFont />
            </button>
            <button 
                className={`tool-btn-v2 ${activeTool === 'pencil' ? 'active' : ''}`} 
                onClick={() => updateBrush('pencil')}
                title="Pincel"
            >
                <FaPencilAlt />
            </button>
            <button 
                className={`tool-btn-v2 ${activeTool === 'select' ? 'active' : ''}`} 
                onClick={() => setActiveTool('select')}
                title="Seleccionar"
            >
                <FaMousePointer />
            </button>
            <button className="tool-btn-v2" onClick={handleUndo} title="Deshacer">
                <FaUndo />
            </button>

            {(activeTool === 'text' || isTextSelected) && (
              <select 
                value={fontFamily} 
                onChange={(e) => setFontFamily(e.target.value)}
                className="font-select-v2"
              >
                <option value="Arial">Arial</option>
                <option value="Tahoma">Tahoma</option>
                <option value="Verdana">Verdana</option>
                <option value="Times New Roman">Times</option>
                <option value="Courier New">Mono</option>
                <option value="Impact">Impact</option>
              </select>
            )}
          </div>

          <button className="btn-send-v2" onClick={handleFinish}>
            {isCropping ? <FaCheck /> : <FaCheck />} {isCropping ? 'Aplicar' : 'Listo'}
          </button>
        </div>

        {/* MAIN AREA */}
        <div className="editor-workspace">
            <div className="editor-main-v2" ref={containerRef}>
                <canvas ref={canvasRef} />
                
                {/* Emoji Picker Popover */}
                {showEmojis && (
                    <div className="emoji-picker-v2">
                        {['😀', '😂', '😍', '🤔', '😎', '👍', '🔥', '❤️', '✨', '🎉'].map(e => (
                            <span key={e} onClick={() => handleAddEmoji(e)}>{e}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Side - Color Picker & Size Slider */}
            <div className="editor-side-tools">
                {/* Brush Preview Circle */}
                <div className="brush-preview-container">
                    <div 
                        className="brush-preview-dot"
                        style={{ 
                            width: `${brushWidth}px`, 
                            height: `${brushWidth}px`,
                            backgroundColor: activeColor,
                            boxShadow: `0 0 10px ${activeColor}88`
                        }}
                    />
                </div>

                <div className="vertical-color-picker">
                    {[
                        '#ffffff', '#000000', '#ff0000', '#ff7f00', '#ffff00', 
                        '#00ff00', '#00ffff', '#0000ff', '#8b00ff', '#ff00ff'
                    ].map(c => (
                        <div 
                            key={c} 
                            className={`color-dot ${activeColor === c ? 'active' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setActiveColor(c)}
                        />
                    ))}
                </div>
                
                <div className="vertical-size-slider">
                    <span className="size-label-v2">{brushWidth}px</span>
                    <div className="slider-wrapper-v2">
                        <input 
                            type="range" 
                            min="1" 
                            max="50" 
                            step="1"
                            value={brushWidth} 
                            onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* FOOTER - Thumbnails */}
        <div className="editor-footer-v2">
            <div className="thumbnails-v2">
                {activeFiles.map((item, idx) => (
                    <div 
                        key={item.id} 
                        className={`thumb-v2 ${idx === currentIndex ? 'active' : ''}`}
                        onClick={() => switchImage(idx)}
                    >
                        <img src={item.preview} alt="" />
                    </div>
                ))}
                <label className="thumb-v2 thumb-add">
                    <FaPlus />
                    <input type="file" multiple accept="image/*" onChange={(e) => onAddMore(Array.from(e.target.files))} hidden />
                </label>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ImageEditorModal;
