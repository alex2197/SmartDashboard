// components/ComparacionPeriodos.tsx
'use client';

import { ComparacionConfig, Filtros } from '@/lib/types';
import { ArrowLeftRight, X } from 'lucide-react';

interface ComparacionPeriodosProps {
  comparacion: ComparacionConfig;
  onComparacionChange: (config: ComparacionConfig) => void;
  filtrosActuales: Filtros;
}

export default function ComparacionPeriodos({ 
  comparacion, 
  onComparacionChange,
  filtrosActuales 
}: ComparacionPeriodosProps) {
  
  const activarComparacion = (tipo: 'periodo-anterior' | 'mismo-periodo-año-anterior') => {
    onComparacionChange({
      activo: true,
      tipo,
      periodoComparacion: calcularPeriodoComparacion(tipo)
    });
  };

  const desactivarComparacion = () => {
    onComparacionChange({
      activo: false,
      tipo: 'periodo-anterior'
    });
  };

  const calcularPeriodoComparacion = (tipo: 'periodo-anterior' | 'mismo-periodo-año-anterior'): Filtros => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    if (tipo === 'mismo-periodo-año-anterior') {
      // Mismo mes, año anterior
      if (filtrosActuales.año !== 'Todos') {
        const añoAnterior = (parseInt(filtrosActuales.año) - 1).toString();
        return {
          ...filtrosActuales,
          año: añoAnterior
        };
      }
    } else if (tipo === 'periodo-anterior') {
      // Mes anterior
      if (filtrosActuales.mes !== 'Todos' && filtrosActuales.año !== 'Todos') {
        const indiceMes = meses.indexOf(filtrosActuales.mes);
        if (indiceMes === 0) {
          // Si es enero, ir a diciembre del año anterior
          return {
            ...filtrosActuales,
            mes: 'Diciembre',
            año: (parseInt(filtrosActuales.año) - 1).toString()
          };
        } else {
          return {
            ...filtrosActuales,
            mes: meses[indiceMes - 1]
          };
        }
      } else if (filtrosActuales.año !== 'Todos') {
        // Solo año seleccionado, comparar con año anterior
        return {
          ...filtrosActuales,
          año: (parseInt(filtrosActuales.año) - 1).toString()
        };
      }
    }
    
    return filtrosActuales;
  };

  const obtenerEtiquetaComparacion = () => {
    if (!comparacion.activo) return '';
    
    if (comparacion.tipo === 'mismo-periodo-año-anterior') {
      return 'vs Mismo período año anterior';
    } else {
      if (filtrosActuales.mes !== 'Todos') {
        return 'vs Mes anterior';
      } else {
        return 'vs Año anterior';
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Comparar Períodos</h3>
        </div>
        {comparacion.activo && (
          <button
            onClick={desactivarComparacion}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Desactivar
          </button>
        )}
      </div>

      {!comparacion.activo ? (
        <div className="flex gap-2">
          <button
            onClick={() => activarComparacion('periodo-anterior')}
            className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            Período Anterior
          </button>
          <button
            onClick={() => activarComparacion('mismo-periodo-año-anterior')}
            className="flex-1 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-medium transition-colors"
          >
            Mismo Período Año Pasado
          </button>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Modo Comparación Activo</p>
              <p className="text-xs text-blue-700 mt-1">{obtenerEtiquetaComparacion()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600">
                {comparacion.periodoComparacion?.año !== 'Todos' && `Año: ${comparacion.periodoComparacion?.año}`}
                {comparacion.periodoComparacion?.mes !== 'Todos' && ` • ${comparacion.periodoComparacion?.mes}`}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Los KPIs mostrarán el cambio porcentual y las gráficas incluirán ambos períodos
      </p>
    </div>
  );
}