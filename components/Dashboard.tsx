// components/Dashboard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { VentaData } from '@/lib/types';
import { DollarSign, Package, Users, TrendingUp } from 'lucide-react';
import KPICard from './KPICard';

interface DashboardProps {
  data: VentaData[];
  datosComparacion?: VentaData[];
}

// Helper para formatear valores en tooltips de manera type-safe
const formatCurrency = (value: any): string => {
  if (typeof value === 'number') {
    return `$${value.toLocaleString('es-MX')}`;
  }
  return String(value || '');
};

export default function Dashboard({ data, datosComparacion }: DashboardProps) {
  // Calcular métricas principales
  const totalVentas = data.reduce((sum, item) => sum + item.Total, 0);
  const totalCantidad = data.reduce((sum, item) => sum + item.Cantidad, 0);
  const clientesUnicos = new Set(data.map(d => d.Cliente)).size;
  const promedioVenta = data.length > 0 ? totalVentas / data.length : 0;

  // Calcular métricas de comparación
  const metricasComparacion = datosComparacion ? {
    totalVentas: datosComparacion.reduce((sum, item) => sum + item.Total, 0),
    totalCantidad: datosComparacion.reduce((sum, item) => sum + item.Cantidad, 0),
    clientesUnicos: new Set(datosComparacion.map(d => d.Cliente)).size,
    promedioVenta: datosComparacion.length > 0 
      ? datosComparacion.reduce((sum, item) => sum + item.Total, 0) / datosComparacion.length 
      : 0
  } : undefined;

  // Función helper para calcular cambio
  const calcularCambio = (actual: number, anterior: number) => {
    if (!anterior || anterior === 0) return undefined;
    const cambio = actual - anterior;
    const porcentaje = (cambio / anterior) * 100;
    return { valorAnterior: anterior, cambio, porcentaje };
  };

  // Ventas por mes
  const ventasPorMes = data.reduce((acc, item) => {
    const mes = item.Mes;
    if (!acc[mes]) {
      acc[mes] = { mes, total: 0, cantidad: 0 };
    }
    acc[mes].total += item.Total;
    acc[mes].cantidad += item.Cantidad;
    return acc;
  }, {} as Record<string, { mes: string; total: number; cantidad: number }>);

  const mesesOrdenados = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const ventasPorMesArray = mesesOrdenados
    .filter(mes => ventasPorMes[mes])
    .map(mes => ({
      mes: mes.substring(0, 3),
      total: Math.round(ventasPorMes[mes].total),
      cantidad: ventasPorMes[mes].cantidad
    }));

  // Ventas por mes de comparación (si existe)
  const ventasPorMesComparacion = datosComparacion ? datosComparacion.reduce((acc, item) => {
    const mes = item.Mes;
    if (!acc[mes]) {
      acc[mes] = { mes, total: 0, cantidad: 0 };
    }
    acc[mes].total += item.Total;
    acc[mes].cantidad += item.Cantidad;
    return acc;
  }, {} as Record<string, { mes: string; total: number; cantidad: number }>) : null;

  const ventasPorMesComparacionArray = ventasPorMesComparacion ? mesesOrdenados
    .filter(mes => ventasPorMesComparacion[mes])
    .map(mes => ({
      mes: mes.substring(0, 3),
      totalComparacion: Math.round(ventasPorMesComparacion[mes].total)
    })) : [];

  // Combinar datos actuales y de comparación para gráfica
  const datosGraficaMensual = ventasPorMesArray.map(item => {
    const comparacion = ventasPorMesComparacionArray.find(c => c.mes === item.mes);
    return {
      ...item,
      totalComparacion: comparacion?.totalComparacion || 0
    };
  });

  // Top 10 productos
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
    .slice(0, 10);

  // Ventas por vendedor
  const ventasPorVendedor = data.reduce((acc, item) => {
    const vendedor = item.Vendedor || 'Sin asignar';
    if (!acc[vendedor]) {
      acc[vendedor] = 0;
    }
    acc[vendedor] += item.Total;
    return acc;
  }, {} as Record<string, number>);

  const vendedoresData = Object.entries(ventasPorVendedor)
    .map(([nombre, total]) => ({ nombre, total: Math.round(total) }))
    .sort((a, b) => b.total - a.total);

  // Ventas por marca (top 10)
  const ventasPorMarca = data.reduce((acc, item) => {
    const marca = item.Marca || 'Sin marca';
    if (!acc[marca]) {
      acc[marca] = 0;
    }
    acc[marca] += item.Total;
    return acc;
  }, {} as Record<string, number>);

  const marcasData = Object.entries(ventasPorMarca)
    .map(([nombre, total]) => ({ nombre, total: Math.round(total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Ventas por cliente
  const ventasPorCliente = data.reduce((acc, item) => {
    const nombreCliente = item.Nombre || 'Sin nombre';
    const idCliente = item.Cliente;
    const key = `${nombreCliente}-${idCliente}`;
    
    if (!acc[key]) {
      acc[key] = { nombre: nombreCliente, id: idCliente, total: 0, cantidad: 0, transacciones: 0 };
    }
    acc[key].total += item.Total;
    acc[key].cantidad += item.Cantidad;
    acc[key].transacciones += 1;
    return acc;
  }, {} as Record<string, { nombre: string; id: number; total: number; cantidad: number; transacciones: number }>);

  const clientesData = Object.values(ventasPorCliente)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D', '#C9A0DC', '#FFD700'];

  return (
    <div className="space-y-6">
      {/* KPIs principales con comparación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          titulo="Ventas Totales"
          valor={`$${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitulo={`${data.length} transacciones`}
          icono={DollarSign}
          colorIcono="text-green-600"
          comparacion={metricasComparacion ? calcularCambio(totalVentas, metricasComparacion.totalVentas) : undefined}
        />

        <KPICard
          titulo="Unidades Vendidas"
          valor={totalCantidad.toLocaleString('es-MX')}
          subtitulo="Productos"
          icono={Package}
          colorIcono="text-blue-600"
          comparacion={metricasComparacion ? calcularCambio(totalCantidad, metricasComparacion.totalCantidad) : undefined}
        />

        <KPICard
          titulo="Clientes Únicos"
          valor={clientesUnicos}
          subtitulo="Activos"
          icono={Users}
          colorIcono="text-purple-600"
          comparacion={metricasComparacion ? calcularCambio(clientesUnicos, metricasComparacion.clientesUnicos) : undefined}
        />

        <KPICard
          titulo="Ticket Promedio"
          valor={`$${promedioVenta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitulo="Por venta"
          icono={TrendingUp}
          colorIcono="text-orange-600"
          comparacion={metricasComparacion ? calcularCambio(promedioVenta, metricasComparacion.promedioVenta) : undefined}
        />
      </div>

      {/* Gráfica de ventas mensuales */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Ventas Mensuales</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosGraficaMensual}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={formatCurrency} />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#8884d8" 
                strokeWidth={2} 
                name="Período Actual"
              />
              {datosComparacion && (
                <Line 
                  type="monotone" 
                  dataKey="totalComparacion" 
                  stroke="#82ca9d" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  name="Período Anterior"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {topProductos.map((product, idx) => (
                <div key={idx} className="flex justify-between items-start border-b pb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{idx + 1}. {product.nombre.substring(0, 40)}{product.nombre.length > 40 ? '...' : ''}</div>
                    <div className="text-xs text-gray-500">{product.cantidad} unidades</div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="font-bold text-sm">${product.total.toLocaleString('es-MX')}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ventas por vendedor */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendedoresData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip formatter={formatCurrency} />
                <Bar dataKey="total" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ventas por marca */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Marcas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marcasData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="nombre" type="category" width={100} />
              <Tooltip formatter={formatCurrency} />
              <Bar dataKey="total" fill="#8884d8">
                {marcasData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {clientesData.map((cliente, idx) => (
              <div key={idx} className="flex justify-between items-start border-b pb-2">
                <div className="flex-1">
                  <div className="font-medium text-sm">{idx + 1}. {cliente.nombre}</div>
                  <div className="text-xs text-gray-500">
                    ID: {cliente.id} • {cliente.transacciones} compras • {cliente.cantidad} unidades
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-bold text-sm">${cliente.total.toLocaleString('es-MX')}</div>
                  <div className="text-xs text-gray-500">
                    ${Math.round(cliente.total / cliente.transacciones).toLocaleString('es-MX')} promedio
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}