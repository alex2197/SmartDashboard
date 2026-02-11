// components/ExportButton.tsx
'use client';

import { VentaData } from '@/lib/types';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data: VentaData[];
  fileName?: string;
}

export default function ExportButton({ data, fileName = 'ventas_filtradas' }: ExportButtonProps) {
  const exportToExcel = () => {
    // Preparar datos para exportar
    const dataParaExcel = data.map(item => ({
      'Código': item.Código,
      'Producto': item["Nombre (Producto,Servicio,Paquete)"],
      'Cantidad': item.Cantidad,
      'Precio Neto': item.Neto,
      'Descuento': item.Descuento,
      'Total': item.Total,
      'Cliente': item.Nombre,
      'ID Cliente': item.Cliente,
      'Año': item.Año,
      'Mes': item.Mes,
      'Vendedor': item.Vendedor,
      'Marca': item.Marca
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Crear hoja con los datos
    const ws = XLSX.utils.json_to_sheet(dataParaExcel);
    
    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    
    // Crear hoja de resumen
    const totalVentas = data.reduce((sum, item) => sum + item.Total, 0);
    const totalUnidades = data.reduce((sum, item) => sum + item.Cantidad, 0);
    const clientesUnicos = new Set(data.map(d => d.Cliente)).size;
    
    const resumen = [
      { 'Métrica': 'Total de Ventas', 'Valor': `$${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
      { 'Métrica': 'Unidades Vendidas', 'Valor': totalUnidades },
      { 'Métrica': 'Clientes Únicos', 'Valor': clientesUnicos },
      { 'Métrica': 'Ticket Promedio', 'Valor': `$${(totalVentas / data.length).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
      { 'Métrica': 'Total de Transacciones', 'Valor': data.length },
      { 'Métrica': 'Fecha de Exportación', 'Valor': new Date().toLocaleString('es-MX') }
    ];
    
    const wsResumen = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    
    // Generar archivo
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${fileName}_${fecha}.xlsx`);
  };

  return (
    <button
      onClick={exportToExcel}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
    >
      <Download className="h-4 w-4" />
      Exportar a Excel
    </button>
  );
}