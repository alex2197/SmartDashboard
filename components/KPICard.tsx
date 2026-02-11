// components/KPICard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface KPICardProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icono: LucideIcon;
  colorIcono?: string;
  comparacion?: {
    valorAnterior: number;
    cambio: number;
    porcentaje: number;
  };
}

export default function KPICard({ 
  titulo, 
  valor, 
  subtitulo, 
  icono: Icono,
  colorIcono = 'text-blue-600',
  comparacion 
}: KPICardProps) {
  
  const obtenerColorCambio = (porcentaje: number) => {
    if (porcentaje > 0) return 'text-green-600 bg-green-50';
    if (porcentaje < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const obtenerIconoCambio = (porcentaje: number) => {
    if (porcentaje > 0) return TrendingUp;
    if (porcentaje < 0) return TrendingDown;
    return Minus;
  };

  const formatearCambio = (porcentaje: number) => {
    const abs = Math.abs(porcentaje);
    return `${porcentaje > 0 ? '+' : ''}${abs.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        <Icono className={`h-4 w-4 ${colorIcono}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valor}</div>
        
        {comparacion ? (
          <div className="mt-2 flex items-center gap-2">
            {(() => {
              const IconoCambio = obtenerIconoCambio(comparacion.porcentaje);
              return (
                <>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${obtenerColorCambio(comparacion.porcentaje)}`}>
                    <IconoCambio className="h-3 w-3" />
                    {formatearCambio(comparacion.porcentaje)}
                  </div>
                  <span className="text-xs text-gray-500">vs período anterior</span>
                </>
              );
            })()}
          </div>
        ) : (
          subtitulo && <p className="text-xs text-gray-500 mt-2">{subtitulo}</p>
        )}
      </CardContent>
    </Card>
  );
}