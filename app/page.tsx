// app/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Dashboard from '@/components/Dashboard';
import ChatBot from '@/components/ChatBot';
import FiltrosComponent from '@/components/Filtros';
import ComparacionPeriodos from '@/components/ComparacionPeriodos';
import ExportButton from '@/components/ExportButton';
import { VentaData, Filtros, ComparacionConfig } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [datosOriginales, setDatosOriginales] = useState<VentaData[]>([]);
  const [datosFiltrados, setDatosFiltrados] = useState<VentaData[]>([]);
  const [datosComparacion, setDatosComparacion] = useState<VentaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    año: 'Todos',
    mes: 'Todos',
    vendedor: 'Todos',
    marca: 'Todas',
    producto: 'Todos'
  });
  const [comparacion, setComparacion] = useState<ComparacionConfig>({
    activo: false,
    tipo: 'periodo-anterior'
  });

  // Cargar datos al inicio
  useEffect(() => {
    console.log('🔄 Intentando cargar datos...');
    fetch('/ventas_data.json')
      .then(res => {
        console.log('📡 Respuesta recibida:', res.status, res.ok);
        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('✅ Datos cargados:', data.length, 'registros');
        console.log('📊 Primer registro:', data[0]);
        setDatosOriginales(data);
        setDatosFiltrados(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('❌ Error cargando datos:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  // Función helper para aplicar filtros a un dataset
  const aplicarFiltros = (datos: VentaData[], filtrosAplicar: Filtros): VentaData[] => {
    let filtered = [...datos];

    if (filtrosAplicar.año !== 'Todos') {
      filtered = filtered.filter(d => d.Año.toString() === filtrosAplicar.año);
    }

    if (filtrosAplicar.mes !== 'Todos') {
      filtered = filtered.filter(d => d.Mes === filtrosAplicar.mes);
    }

    if (filtrosAplicar.vendedor !== 'Todos') {
      filtered = filtered.filter(d => d.Vendedor === filtrosAplicar.vendedor);
    }

    if (filtrosAplicar.marca !== 'Todas') {
      filtered = filtered.filter(d => d.Marca === filtrosAplicar.marca);
    }

    if (filtrosAplicar.producto !== 'Todos') {
      filtered = filtered.filter(d => d["Nombre (Producto,Servicio,Paquete)"] === filtrosAplicar.producto);
    }

    return filtered;
  };

  // Aplicar filtros cuando cambien
  useEffect(() => {
    const filtered = aplicarFiltros(datosOriginales, filtros);
    setDatosFiltrados(filtered);
  }, [filtros, datosOriginales]);

  // Aplicar filtros de comparación cuando cambien
  useEffect(() => {
    if (comparacion.activo && comparacion.periodoComparacion) {
      const filteredComparacion = aplicarFiltros(datosOriginales, comparacion.periodoComparacion);
      setDatosComparacion(filteredComparacion);
    } else {
      setDatosComparacion([]);
    }
  }, [comparacion, datosOriginales]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos de ventas...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error al cargar datos</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="text-sm text-gray-600 text-left bg-white p-4 rounded border">
              <p className="font-semibold mb-2">Pasos para solucionar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Verifica que <code className="bg-gray-100 px-1">public/ventas_data.json</code> existe</li>
                <li>Asegúrate de que el archivo JSON es válido</li>
                <li>Reinicia el servidor (Ctrl+C y luego npm run dev)</li>
              </ol>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Dashboard Inteligente de Ventas
            </h1>
            <p className="text-gray-600">
              Análisis completo de {datosOriginales.length.toLocaleString()} transacciones
              {datosFiltrados.length !== datosOriginales.length && (
                <span className="ml-2 text-blue-600 font-medium">
                  ({datosFiltrados.length.toLocaleString()} filtradas)
                </span>
              )}
            </p>
          </div>
          <ExportButton data={datosFiltrados} fileName="ventas_filtradas" />
        </div>

        {/* Filtros */}
        <FiltrosComponent 
          data={datosOriginales}
          filtros={filtros}
          onFiltrosChange={setFiltros}
        />

        {/* Comparación de Períodos */}
        <div className="mb-6">
          <ComparacionPeriodos 
            comparacion={comparacion}
            onComparacionChange={setComparacion}
            filtrosActuales={filtros}
          />
        </div>

        {/* Dashboard y Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Dashboard 
              data={datosFiltrados}
              datosComparacion={comparacion.activo ? datosComparacion : undefined}
            />
          </div>
          <div className="lg:col-span-1">
            <ChatBot 
              data={datosFiltrados} 
              filtros={filtros}
              onFiltrosChange={setFiltros}
              datosOriginales={datosOriginales}
            />
          </div>
        </div>
      </div>
    </main>
  );
}