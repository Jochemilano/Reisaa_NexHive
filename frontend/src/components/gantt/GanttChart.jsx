import React, { useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import { FaFilePdf, FaDownload } from "react-icons/fa";
import { toast } from "sonner";
import "./GanttChart.css";

const GanttChart = ({ activities, onView }) => {
  const ganttRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  // Calcula el rango de fechas visible en el diagrama basándose en las actividades.
  // Incluye un margen de seguridad para asegurar que las barras no queden pegadas a los bordes.
  const dateRange = useMemo(() => {
    const validActs = activities.filter(a => a.start_date && a.deadline);
    if (validActs.length === 0) return null;

    let min = new Date(validActs[0].start_date);
    let max = new Date(validActs[0].deadline);

    validActs.forEach(a => {
      const s = new Date(a.start_date);
      const d = new Date(a.deadline);
      if (s < min) min = s;
      if (d > max) max = d;
    });

    // Margen de seguridad: 2 días antes y 7 días después
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 7);

    return { min, max };
  }, [activities]);

  const days = useMemo(() => {
    if (!dateRange) return [];
    const arr = [];
    let curr = new Date(dateRange.min);
    while (curr <= dateRange.max) {
      arr.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return arr;
  }, [dateRange]);

  // Agrupar días por meses para la cabecera superior
  const months = useMemo(() => {
    if (days.length === 0) return [];
    const m = [];
    days.forEach(d => {
      const monthLabel = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      if (m.length === 0 || m[m.length - 1].label !== monthLabel) {
        m.push({ label: monthLabel, days: 1 });
      } else {
        m[m.length - 1].days++;
      }
    });
    return m;
  }, [days]);

  if (!dateRange) {
    return (
      <div className="gantt-empty">
        <p>Asigna fechas de inicio y fin a tus actividades para ver el diagrama.</p>
      </div>
    );
  }

  const getStyle = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const offset = Math.max(0, (s - dateRange.min) / (1000 * 60 * 60 * 24));
    const duration = (e - s) / (1000 * 60 * 60 * 24) + 1;
    return {
      left: `calc(${offset} * var(--day-width))`,
      width: `calc(${duration} * var(--day-width))`
    };
  };

  const getStatusLabel = (status) => {
    if (status === 'done' || status === 'completed') return 'Completada';
    if (status === 'in-progress' || status === 'in_progress') return 'En progreso';
    return 'Pendiente';
  };

  const getStatusColor = (status) => {
    if (status === 'done' || status === 'completed') return [22, 163, 74]; // Green
    if (status === 'in-progress' || status === 'in_progress') return [59, 130, 246]; // Blue
    return [107, 114, 128]; // Gray
  };

  // Generación de reporte PDF vectorial utilizando jsPDF.
  // El diseño se construye manualmente coordenada a coordenada para garantizar precisión y un estilo premium 
  // que no dependa de capturas de pantalla (rasterizado).
  const handleExportPDF = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Generando diagrama vectorial...");

    try {
      // Configuraciones de dimensiones en mm (A4 Landscape por defecto o dinámico)
      const sidebarWidth = 60;
      const dayWidth = 10;
      const rowHeight = 10;
      const headerHeight = 20;
      const margin = 10;

      const totalWidth = sidebarWidth + (days.length * dayWidth) + (margin * 2);
      const totalHeight = headerHeight + (activities.length * rowHeight) + (margin * 2) + 20; // +20 para título

      const pdf = new jsPDF({
        orientation: totalWidth > totalHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [totalWidth, totalHeight]
      });

      // Fondo oscuro profesional
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, totalWidth, totalHeight, 'F');

      let currentY = margin;

      // Título
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("Diagrama de Gantt - Plan de Proyecto", margin, currentY + 5);
      currentY += 15;

      // Dibujar Cabecera - Meses
      pdf.setFontSize(8);
      pdf.setDrawColor(51, 65, 85); // slate-700
      let currentX = margin + sidebarWidth;
      
      months.forEach(m => {
        const mWidth = m.days * dayWidth;
        pdf.setDrawColor(51, 65, 85);
        pdf.rect(currentX, currentY, mWidth, 10);
        pdf.setTextColor(59, 130, 246); // blue-500
        pdf.text(m.label, currentX + 2, currentY + 7);
        currentX += mWidth;
      });

      currentY += 10;

      // Dibujar Cabecera - Días
      currentX = margin + sidebarWidth;
      days.forEach(d => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        if (isWeekend) {
          pdf.setFillColor(30, 41, 59); // slate-800
          pdf.rect(currentX, currentY, dayWidth, 10 + (activities.length * rowHeight), 'F');
        }
        pdf.setDrawColor(51, 65, 85);
        pdf.rect(currentX, currentY, dayWidth, 10);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text(d.getDate().toString(), currentX + (dayWidth / 2) - 1, currentY + 7);
        currentX += dayWidth;
      });

      // Etiqueta "Actividades"
      pdf.setFillColor(30, 41, 59);
      pdf.rect(margin, currentY - 10, sidebarWidth, 20, 'F');
      pdf.setDrawColor(51, 65, 85);
      pdf.rect(margin, currentY - 10, sidebarWidth, 20);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Actividades", margin + 5, currentY + 2);

      currentY += 10;

      // Dibujar Filas de Actividades
      activities.forEach((act, idx) => {
        const rowY = currentY + (idx * rowHeight);
        
        // Sidebar Row
        pdf.setDrawColor(51, 65, 85);
        pdf.rect(margin, rowY, sidebarWidth, rowHeight);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        const truncatedName = act.name.length > 30 ? act.name.substring(0, 27) + "..." : act.name;
        pdf.text(truncatedName, margin + 5, rowY + 6);

        // Timeline Grid Row
        pdf.rect(margin + sidebarWidth, rowY, days.length * dayWidth, rowHeight);

        // Barra de Gantt
        if (act.start_date && act.deadline) {
          const s = new Date(act.start_date);
          const e = new Date(act.deadline);
          const offset = Math.max(0, (s - dateRange.min) / (1000 * 60 * 60 * 24));
          const duration = (e - s) / (1000 * 60 * 60 * 24) + 1;

          const barX = margin + sidebarWidth + (offset * dayWidth);
          const barW = duration * dayWidth;
          const barColor = getStatusColor(act.status);

          pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
          pdf.rect(barX + 1, rowY + 2, barW - 2, rowHeight - 4, 'F');
          
          // Etiqueta opcional en la barra
          if (barW > 20) {
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(6);
            pdf.text(getStatusLabel(act.status), barX + 3, rowY + 6);
          }
        }
      });

      pdf.save(`Diagrama_Gantt_NexHive_${new Date().getTime()}.pdf`);
      toast.success("PDF generado correctamente", { id: toastId });
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.error("Error al generar el PDF vectorial", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="gantt-wrapper">
      <div className="gantt-actions">
        <button 
          className="gantt-export-btn" 
          onClick={handleExportPDF}
          disabled={isExporting}
        >
          {isExporting ? <FaDownload className="spinning" /> : <FaFilePdf />}
          {isExporting ? "Generando..." : "Exportar Diagrama PDF"}
        </button>
      </div>

      <div className="gantt-root" ref={ganttRef}>
        <div className="gantt-container-v3">
          <div className="gantt-sidebar">
            <div className="gantt-sidebar-header">Actividades</div>
            <div className="gantt-sidebar-content">
              {activities.map(act => (
                <div key={act.id} className="gantt-sidebar-row" title={act.name}>
                  {act.name}
                </div>
              ))}
            </div>
          </div>

          <div className="gantt-timeline-area">
            <div className="gantt-timeline-header">
              <div className="gantt-months-row">
                {months.map((m, i) => (
                  <div key={i} className="gantt-month-cell" style={{ width: `calc(${m.days} * var(--day-width))` }}>
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="gantt-days-row">
                {days.map((d, i) => (
                  <div key={i} className={`gantt-day-cell ${d.getDay() === 0 || d.getDay() === 6 ? 'is-weekend' : ''}`}>
                    {d.getDate()}
                  </div>
                ))}
              </div>
            </div>

            <div className="gantt-timeline-body">
              {activities.map(act => (
                <div key={act.id} className="gantt-body-row" onClick={() => onView(act)}>
                  {days.map((_, i) => <div key={i} className="gantt-grid-cell" />)}

                  {act.start_date && act.deadline && (
                    <div
                      className={`gantt-bar-v3 status-${act.status || 'pending'}`}
                      style={getStyle(act.start_date, act.deadline)}
                    >
                      <span className="gantt-bar-label">{act.name}</span>
                      <span className="gantt-bar-status">{getStatusLabel(act.status)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;