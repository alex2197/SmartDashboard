// components/ChatBot.tsx
'use client';

import { useState } from 'react';
import { Send, Loader2, Download } from 'lucide-react';
import { VentaData, Filtros } from '@/lib/types';

interface ChatBotProps {
  data: VentaData[];
  filtros: Filtros;
  onFiltrosChange: (filtros: Filtros) => void;
  datosOriginales: VentaData[];
}

export default function ChatBot({ data, filtros, onFiltrosChange, datosOriginales }: ChatBotProps) {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de análisis de ventas. Puedo responder preguntas sobre tus datos. Por ejemplo: "¿Cuál es mi mejor vendedor?" o "¿Qué productos se venden más?"'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Preguntas sugeridas
  const preguntasSugeridas = [
    "Genera un reporte completo del período",
    "Filtrame el mes de febrero del 2023",
    "Muéstrame solo las ventas de Sabrina",
    "¿Cuál es mi producto más vendido?",
    "Dame un análisis ejecutivo"
  ];

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: textToSend,
          data: data,
          filtros: filtros,
          datosOriginales: datosOriginales
        }),
      });

      const responseData = await response.json();
      
      // Si la respuesta incluye cambios de filtros, aplicarlos
      if (responseData.filtros) {
        onFiltrosChange(responseData.filtros);
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: responseData.message }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu pregunta. Intenta de nuevo.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Función para descargar reporte como archivo
  const descargarReporte = (contenido: string, nombreArchivo: string = 'reporte') => {
    const blob = new Blob([contenido], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Función para generar Excel con análisis
  const generarExcelConAnalisis = async (mensaje: string) => {
    const XLSX = await import('xlsx');
    
    // Hoja 1: Datos transaccionales
    const datosParaExcel = data.map(item => ({
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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosParaExcel);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    // Hoja 2: Resumen
    const totalVentas = data.reduce((sum, item) => sum + item.Total, 0);
    const totalUnidades = data.reduce((sum, item) => sum + item.Cantidad, 0);
    const clientesUnicos = new Set(data.map(d => d.Cliente)).size;
    
    const resumen = [
      { 'Métrica': 'Total de Ventas', 'Valor': `$${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
      { 'Métrica': 'Unidades Vendidas', 'Valor': totalUnidades },
      { 'Métrica': 'Clientes Únicos', 'Valor': clientesUnicos },
      { 'Métrica': 'Ticket Promedio', 'Valor': `$${(totalVentas / data.length).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
      { 'Métrica': 'Total de Transacciones', 'Valor': data.length },
      { 'Métrica': 'Fecha de Generación', 'Valor': new Date().toLocaleString('es-MX') },
      {},
      { 'Métrica': 'FILTROS APLICADOS', 'Valor': '' },
      { 'Métrica': 'Año', 'Valor': filtros.año },
      { 'Métrica': 'Mes', 'Valor': filtros.mes },
      { 'Métrica': 'Vendedor', 'Valor': filtros.vendedor },
      { 'Métrica': 'Marca', 'Valor': filtros.marca }
    ];
    
    const wsResumen = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Hoja 3: Top Productos
    const productosSuma = data.reduce((acc, item) => {
      const nombre = item["Nombre (Producto,Servicio,Paquete)"];
      if (!acc[nombre]) {
        acc[nombre] = { nombre, total: 0, cantidad: 0 };
      }
      acc[nombre].total += item.Total;
      acc[nombre].cantidad += item.Cantidad;
      return acc;
    }, {} as Record<string, { nombre: string; total: number; cantidad: number }>);

    const topProductos = Object.values(productosSuma)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
      .map((p, i) => ({
        'Ranking': i + 1,
        'Producto': p.nombre,
        'Total Ventas': `$${p.total.toLocaleString('es-MX')}`,
        'Unidades': p.cantidad
      }));

    const wsProductos = XLSX.utils.json_to_sheet(topProductos);
    XLSX.utils.book_append_sheet(wb, wsProductos, 'Top Productos');

    // Hoja 4: Top Clientes
    const ventasPorCliente = data.reduce((acc, item) => {
      const key = `${item.Nombre}-${item.Cliente}`;
      if (!acc[key]) {
        acc[key] = { nombre: item.Nombre, id: item.Cliente, total: 0, cantidad: 0, transacciones: 0 };
      }
      acc[key].total += item.Total;
      acc[key].cantidad += item.Cantidad;
      acc[key].transacciones += 1;
      return acc;
    }, {} as Record<string, any>);

    const topClientes = Object.values(ventasPorCliente)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 20)
      .map((c: any, i: number) => ({
        'Ranking': i + 1,
        'Cliente': c.nombre,
        'ID': c.id,
        'Total Ventas': `$${c.total.toLocaleString('es-MX')}`,
        'Compras': c.transacciones,
        'Unidades': c.cantidad,
        'Ticket Promedio': `$${(c.total / c.transacciones).toLocaleString('es-MX')}`
      }));

    const wsClientes = XLSX.utils.json_to_sheet(topClientes);
    XLSX.utils.book_append_sheet(wb, wsClientes, 'Top Clientes');

    // Hoja 5: Por Vendedor
    const ventasPorVendedor = data.reduce((acc, item) => {
      const vendedor = item.Vendedor || 'Sin asignar';
      if (!acc[vendedor]) {
        acc[vendedor] = { total: 0, cantidad: 0, transacciones: 0 };
      }
      acc[vendedor].total += item.Total;
      acc[vendedor].cantidad += item.Cantidad;
      acc[vendedor].transacciones += 1;
      return acc;
    }, {} as Record<string, any>);

    const vendedoresData = Object.entries(ventasPorVendedor)
      .map(([nombre, datos]: [string, any]) => ({
        'Vendedor': nombre,
        'Total Ventas': `$${datos.total.toLocaleString('es-MX')}`,
        'Transacciones': datos.transacciones,
        'Unidades': datos.cantidad,
        'Ticket Promedio': `$${(datos.total / datos.transacciones).toLocaleString('es-MX')}`
      }))
      .sort((a, b) => parseFloat(b['Total Ventas'].replace(/[$,]/g, '')) - parseFloat(a['Total Ventas'].replace(/[$,]/g, '')));

    const wsVendedores = XLSX.utils.json_to_sheet(vendedoresData);
    XLSX.utils.book_append_sheet(wb, wsVendedores, 'Por Vendedor');

    // Hoja 6: Análisis IA
    const analisisIA = [
      { 'Sección': 'ANÁLISIS GENERADO POR IA', 'Contenido': '' },
      {},
      { 'Sección': 'Respuesta:', 'Contenido': mensaje }
    ];
    
    const wsAnalisis = XLSX.utils.json_to_sheet(analisisIA);
    XLSX.utils.book_append_sheet(wb, wsAnalisis, 'Análisis IA');

    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_ventas_${fecha}.xlsx`);
  };

  // Detectar si un mensaje es un reporte largo
  const esReporte = (mensaje: string) => {
    return mensaje.includes('## ') && mensaje.length > 500;
  };

  return (
    <div className="flex flex-col h-[700px] border rounded-lg bg-white shadow-sm">
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <h3 className="font-semibold text-lg">Asistente IA de Ventas</h3>
        <p className="text-sm opacity-90">
          {data.length.toLocaleString()} ventas analizables
        </p>
      </div>

      {/* Filtros activos */}
      {(filtros.año !== 'Todos' || filtros.mes !== 'Todos' || filtros.vendedor !== 'Todos' || 
        filtros.marca !== 'Todas' || filtros.producto !== 'Todos') && (
        <div className="p-3 bg-blue-50 border-b text-sm">
          <span className="font-medium">Filtros activos:</span>
          {filtros.año !== 'Todos' && <span className="ml-2 px-2 py-1 bg-blue-200 rounded">Año: {filtros.año}</span>}
          {filtros.mes !== 'Todos' && <span className="ml-2 px-2 py-1 bg-blue-200 rounded">Mes: {filtros.mes}</span>}
          {filtros.vendedor !== 'Todos' && <span className="ml-2 px-2 py-1 bg-blue-200 rounded">Vendedor: {filtros.vendedor}</span>}
          {filtros.marca !== 'Todas' && <span className="ml-2 px-2 py-1 bg-blue-200 rounded">Marca: {filtros.marca}</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 rounded-bl-none'
            } p-3 rounded-lg shadow-sm`}>
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              {/* Botón de descarga si es un reporte */}
              {msg.role === 'assistant' && esReporte(msg.content) && (
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => generarExcelConAnalisis(msg.content)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Descargar Excel Completo
                  </button>
                  <button
                    onClick={() => descargarReporte(msg.content, 'analisis')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Descargar Análisis (.md)
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">Analizando datos...</span>
            </div>
          </div>
        )}
      </div>

      {/* Preguntas sugeridas */}
      {messages.length === 1 && (
        <div className="p-3 border-t bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">Preguntas sugeridas:</p>
          <div className="flex flex-wrap gap-2">
            {preguntasSugeridas.map((pregunta, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(pregunta)}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                {pregunta}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Pregunta sobre tus ventas..."
            disabled={loading}
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}