// lib/types.ts
export interface VentaData {
  "Código": string;
  "Nombre (Producto,Servicio,Paquete)": string;
  "Cantidad": number;
  "Unidad": number;
  "Neto": number;
  "Descuento": number;
  "Neto-Desc.": number;
  "Impuesto": number;
  "Total": number;
  "Nombre": string;
  "Año": number;
  "Cliente": number;
  "Mes": string;
  "Vendedor": string;
  "Marca": string;
}

export interface Filtros {
  año: string;
  mes: string;
  vendedor: string;
  marca: string;
  producto: string;
}

export interface ComparacionConfig {
  activo: boolean;
  tipo: 'periodo-anterior' | 'mismo-periodo-año-anterior' | 'personalizado';
  periodoComparacion?: Filtros;
}