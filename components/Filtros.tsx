// components/Filtros.tsx
'use client';

import { VentaData, Filtros } from '@/lib/types';

interface FiltrosProps {
  data: VentaData[];
  filtros: Filtros;
  onFiltrosChange: (filtros: Filtros) => void;
}

export default function FiltrosComponent({ data, filtros, onFiltrosChange }: FiltrosProps) {
  // Extraer valores únicos para cada filtro
  const años = ['Todos', ...Array.from(new Set(data.map(d => d.Año.toString())))].sort();
  const meses = ['Todos', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const vendedores = ['Todos', ...Array.from(new Set(data.map(d => d.Vendedor).filter(v => v)))].sort();
  const marcas = ['Todas', ...Array.from(new Set(data.map(d => d.Marca).filter(m => m)))].sort();
  const productos = ['Todos', ...Array.from(new Set(data.map(d => d["Nombre (Producto,Servicio,Paquete)"])))].sort();

  const handleChange = (key: keyof Filtros, value: string) => {
    onFiltrosChange({ ...filtros, [key]: value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h3 className="font-semibold text-lg mb-4">Filtros</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Filtro Año */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
          <select
            value={filtros.año}
            onChange={(e) => handleChange('año', e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
          >
            {años.map(año => (
              <option key={año} value={año}>{año}</option>
            ))}
          </select>
        </div>

        {/* Filtro Mes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
          <select
            value={filtros.mes}
            onChange={(e) => handleChange('mes', e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
          >
            {meses.map(mes => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
        </div>

        {/* Filtro Vendedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
          <select
            value={filtros.vendedor}
            onChange={(e) => handleChange('vendedor', e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
          >
            {vendedores.map(vendedor => (
              <option key={vendedor} value={vendedor}>{vendedor}</option>
            ))}
          </select>
        </div>

        {/* Filtro Marca */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
          <select
            value={filtros.marca}
            onChange={(e) => handleChange('marca', e.target.value)}
            className="w-full p-2 border rounded-md text-sm max-w-full"
          >
            {marcas.map(marca => (
              <option key={marca} value={marca}>{marca}</option>
            ))}
          </select>
        </div>

        {/* Filtro Producto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
          <select
            value={filtros.producto}
            onChange={(e) => handleChange('producto', e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="Todos">Todos</option>
            {productos.slice(0, 100).map(producto => (
              <option key={producto} value={producto} title={producto}>
                {producto.length > 30 ? producto.substring(0, 30) + '...' : producto}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botón limpiar filtros */}
      <div className="mt-4">
        <button
          onClick={() => onFiltrosChange({ año: 'Todos', mes: 'Todos', vendedor: 'Todos', marca: 'Todas', producto: 'Todos' })}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}