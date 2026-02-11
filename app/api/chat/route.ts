// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { VentaData, Filtros } from '@/lib/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const { message, data, filtros, datosOriginales } = await req.json() as { 
    message: string; 
    data: VentaData[]; 
    filtros: Filtros;
    datosOriginales: VentaData[];
  };

  // Extraer valores únicos para que Claude conozca las opciones
  const añosDisponibles = Array.from(new Set(datosOriginales.map(d => d.Año.toString()))).sort();
  const vendedoresDisponibles = Array.from(new Set(datosOriginales.map(d => d.Vendedor).filter(v => v))).sort();
  const marcasDisponibles = Array.from(new Set(datosOriginales.map(d => d.Marca).filter(m => m))).sort();

  // Calcular estadísticas del dataset filtrado
  const totalVentas = data.reduce((sum, item) => sum + item.Total, 0);
  const totalCantidad = data.reduce((sum, item) => sum + item.Cantidad, 0);
  const numTransacciones = data.length;

  // Top productos
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
      acc[vendedor] = { total: 0, cantidad: 0 };
    }
    acc[vendedor].total += item.Total;
    acc[vendedor].cantidad += item.Cantidad;
    return acc;
  }, {} as Record<string, { total: number; cantidad: number }>);

  const vendedoresRanking = Object.entries(ventasPorVendedor)
    .map(([nombre, datos]) => ({ nombre, ...datos }))
    .sort((a, b) => b.total - a.total);

  // Ventas por marca
  const ventasPorMarca = data.reduce((acc, item) => {
    const marca = item.Marca || 'Sin marca';
    if (!acc[marca]) {
      acc[marca] = 0;
    }
    acc[marca] += item.Total;
    return acc;
  }, {} as Record<string, number>);

  const marcasRanking = Object.entries(ventasPorMarca)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Ventas por mes
  const ventasPorMes = data.reduce((acc, item) => {
    const mes = item.Mes;
    if (!acc[mes]) {
      acc[mes] = 0;
    }
    acc[mes] += item.Total;
    return acc;
  }, {} as Record<string, number>);

  const mesesRanking = Object.entries(ventasPorMes)
    .map(([mes, total]) => ({ mes, total }))
    .sort((a, b) => b.total - a.total);

  // Ventas por cliente (NUEVO)
  const ventasPorCliente = data.reduce((acc, item) => {
    const nombreCliente = item.Nombre || 'Sin nombre';
    const idCliente = item.Cliente;
    const key = `${nombreCliente} (ID: ${idCliente})`;
    
    if (!acc[key]) {
      acc[key] = { nombre: nombreCliente, id: idCliente, total: 0, cantidad: 0, transacciones: 0 };
    }
    acc[key].total += item.Total;
    acc[key].cantidad += item.Cantidad;
    acc[key].transacciones += 1;
    return acc;
  }, {} as Record<string, { nombre: string; id: number; total: number; cantidad: number; transacciones: number }>);

  const clientesRanking = Object.values(ventasPorCliente)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15); // Top 15 clientes

  // Análisis cruzado: Clientes por Marca (NUEVO)
  const clientesPorMarca: Record<string, Array<{cliente: string, id: number, total: number, cantidad: number}>> = {};
  
  data.forEach(item => {
    const marca = item.Marca || 'Sin marca';
    const nombreCliente = item.Nombre || 'Sin nombre';
    const idCliente = item.Cliente;
    const key = `${nombreCliente}-${idCliente}`;
    
    if (!clientesPorMarca[marca]) {
      clientesPorMarca[marca] = [];
    }
    
    let clienteExistente = clientesPorMarca[marca].find(c => c.cliente === nombreCliente && c.id === idCliente);
    if (!clienteExistente) {
      clienteExistente = { cliente: nombreCliente, id: idCliente, total: 0, cantidad: 0 };
      clientesPorMarca[marca].push(clienteExistente);
    }
    
    clienteExistente.total += item.Total;
    clienteExistente.cantidad += item.Cantidad;
  });

  // Ordenar clientes dentro de cada marca
  Object.keys(clientesPorMarca).forEach(marca => {
    clientesPorMarca[marca].sort((a, b) => b.total - a.total);
  });

  // Top 5 marcas con sus principales clientes
  const topMarcasConClientes = marcasRanking.slice(0, 5).map(marca => {
    const topClientesMarca = clientesPorMarca[marca.nombre]?.slice(0, 3) || [];
    return {
      marca: marca.nombre,
      totalMarca: marca.total,
      topClientes: topClientesMarca
    };
  });

  // Contexto para Claude
  const filtrosActivos = [];
  if (filtros.año !== 'Todos') filtrosActivos.push(`Año: ${filtros.año}`);
  if (filtros.mes !== 'Todos') filtrosActivos.push(`Mes: ${filtros.mes}`);
  if (filtros.vendedor !== 'Todos') filtrosActivos.push(`Vendedor: ${filtros.vendedor}`);
  if (filtros.marca !== 'Todas') filtrosActivos.push(`Marca: ${filtros.marca}`);
  if (filtros.producto !== 'Todos') filtrosActivos.push(`Producto: ${filtros.producto}`);

  const context = `
Eres un asistente de análisis de ventas para una distribuidora de vinos en México.
Analiza los datos y responde de manera clara, concisa y profesional en español.
Usa formato de pesos mexicanos ($X,XXX.XX) para cantidades monetarias.

IMPORTANTE: Puedes cambiar los filtros del dashboard respondiendo con un JSON especial.

OPCIONES DISPONIBLES PARA FILTROS:
- Años: ${añosDisponibles.join(', ')}
- Meses: Enero, Febrero, Marzo, Abril, Mayo, Junio, Julio, Agosto, Septiembre, Octubre, Noviembre, Diciembre
- Vendedores: ${vendedoresDisponibles.join(', ')}
- Marcas: ${marcasDisponibles.slice(0, 20).join(', ')}${marcasDisponibles.length > 20 ? '...' : ''}

FILTROS ACTUALES:
${filtrosActivos.length > 0 ? filtrosActivos.join(', ') : 'Ninguno (mostrando todos los datos)'}

RESUMEN DE DATOS (${numTransacciones} transacciones):
- Ventas totales: $${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- Unidades vendidas: ${totalCantidad.toLocaleString('es-MX')}
- Ticket promedio: $${(totalVentas / numTransacciones).toLocaleString('es-MX', { minimumFractionDigits: 2 })}

TOP 10 PRODUCTOS (por ventas en pesos):
${topProductos.map((p, i) => `${i + 1}. ${p.nombre}: $${p.total.toLocaleString('es-MX')} (${p.cantidad} unidades)`).join('\n')}

RANKING DE VENDEDORES:
${vendedoresRanking.map((v, i) => `${i + 1}. ${v.nombre}: $${v.total.toLocaleString('es-MX')} (${v.cantidad} unidades)`).join('\n')}

TOP 10 MARCAS:
${marcasRanking.map((m, i) => `${i + 1}. ${m.nombre}: $${m.total.toLocaleString('es-MX')}`).join('\n')}

VENTAS POR MES:
${mesesRanking.map(m => `${m.mes}: $${m.total.toLocaleString('es-MX')}`).join('\n')}

TOP 15 CLIENTES (por ventas en pesos):
${clientesRanking.map((c, i) => `${i + 1}. ${c.nombre} (ID: ${c.id}): $${c.total.toLocaleString('es-MX')} en ${c.transacciones} compras (${c.cantidad} unidades)`).join('\n')}

TOP 5 MARCAS CON SUS PRINCIPALES CLIENTES:
${topMarcasConClientes.map(m => `
${m.marca} (Total: $${m.totalMarca.toLocaleString('es-MX')}):
${m.topClientes.map((c, i) => `  ${i + 1}. ${c.cliente} (ID: ${c.id}): $${c.total.toLocaleString('es-MX')} - ${c.cantidad} unidades`).join('\n')}`).join('\n')}

IMPORTANTE: Tienes acceso a TODOS los datos transaccionales completos. Puedes analizar:
- Qué clientes compraron qué marcas
- Qué productos compró cada cliente
- Ventas por cliente en períodos específicos
- Cualquier combinación de cliente + marca + producto + vendedor + mes/año

NOTA: La columna "Nombre" en los datos originales contiene el nombre del cliente, y "Cliente" es el ID único del cliente.

INSTRUCCIONES ESPECIALES PARA CAMBIAR FILTROS:
Si el usuario pide cambiar filtros (ejemplos: "filtra febrero 2023", "muéstrame solo ventas de Sabrina", "marca NADA del 2024"), 
debes responder con DOS partes:

1. Un mensaje amigable confirmando el cambio
2. Un bloque JSON especial con el formato: <FILTROS>{"año": "2023", "mes": "Febrero", "vendedor": "Todos", "marca": "Todas", "producto": "Todos"}</FILTROS>

IMPORTANTE: 
- Los nombres deben coincidir EXACTAMENTE con las opciones disponibles
- Si el usuario no menciona un filtro, déjalo como "Todos" o "Todas"
- Los valores son case-sensitive

Ejemplos de respuestas con filtros:

Usuario: "Filtrame febrero del 2023"
Respuesta: "Perfecto, filtrando datos de febrero 2023. Aquí están los resultados:

En febrero de 2023 tuviste $XXX en ventas con YYY unidades vendidas.

<FILTROS>{"año": "2023", "mes": "Febrero", "vendedor": "Todos", "marca": "Todas", "producto": "Todos"}</FILTROS>"

Usuario: "Muéstrame solo las ventas de Sabrina en 2024"
Respuesta: "Listo, mostrando solo las ventas de Sabrina en 2024:

Sabrina generó $XXX en ventas durante 2024...

<FILTROS>{"año": "2024", "mes": "Todos", "vendedor": "Sabrina", "marca": "Todas", "producto": "Todos"}</FILTROS>"

Usuario: "Quita los filtros" o "Muéstrame todo"
Respuesta: "Filtros eliminados, mostrando todos los datos.

<FILTROS>{"año": "Todos", "mes": "Todos", "vendedor": "Todos", "marca": "Todas", "producto": "Todos"}</FILTROS>"

RESPUESTAS NORMALES (sin cambiar filtros):
- Responde de forma directa y concisa
- Usa bullets solo cuando sea necesario
- Incluye números específicos y porcentajes cuando sea relevante

ANÁLISIS CRUZADO - Puedes responder preguntas como:
- "¿Qué cliente compró más de la marca X?" → Busca en los datos quién tiene más ventas de esa marca específica
- "¿Qué productos compró el cliente Y?" → Lista los productos únicos de ese cliente
- "¿Cuáles son los clientes principales de la marca Z?" → Ordena clientes por ventas de esa marca
- "¿Qué marcas prefiere el cliente W?" → Agrupa ventas del cliente por marca

Cuando hagas análisis cruzado:
1. Filtra los datos por el criterio solicitado (marca, cliente, producto)
2. Agrupa y suma los totales
3. Presenta los top 3-5 resultados con números específicos
4. Menciona patrones interesantes si los encuentras

GENERACIÓN DE REPORTES:
Si el usuario pide "genera un reporte", "crea un documento", "dame un análisis completo" o similar, 
genera un reporte detallado en formato Markdown que incluya:

1. **Resumen Ejecutivo** - KPIs principales del período
2. **Análisis de Ventas** - Tendencias, comparaciones
3. **Top Performers** - Mejores productos, clientes, vendedores, marcas
4. **Insights Clave** - Hallazgos importantes, patrones, recomendaciones
5. **Detalle de Datos** - Tablas con información relevante

El reporte debe ser:
- Profesional y bien estructurado
- Con números específicos y porcentajes
- Incluir comparaciones cuando sea posible
- Terminar con recomendaciones accionables

Usa formato Markdown con headers (##), tablas, bullets, y negritas para énfasis.
`;

  try {
    // Preparar muestra de datos raw para análisis detallado
    // Solo enviamos los campos relevantes para reducir el tamaño
    const dataMuestra = data.slice(0, 200).map(item => ({
      cliente: item.Nombre,
      clienteId: item.Cliente,
      producto: item["Nombre (Producto,Servicio,Paquete)"],
      marca: item.Marca,
      vendedor: item.Vendedor,
      total: item.Total,
      cantidad: item.Cantidad,
      mes: item.Mes,
      año: item.Año
    }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `${context}\n\nMUESTRA DE DATOS RAW (primeras 200 transacciones del período actual):\n${JSON.stringify(dataMuestra, null, 2)}\n\nNOTA: Esta es una muestra de ${dataMuestra.length} de ${data.length} transacciones totales en el período filtrado. Usa estos datos de ejemplo para análisis detallados, pero recuerda que los totales y rankings ya calculados arriba son sobre el dataset completo.\n\nPregunta del usuario: ${message}`
        }
      ],
    });

    const textContent = response.content.find(block => block.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : 'No se pudo generar una respuesta';

    // Buscar si hay un bloque de filtros en la respuesta
    const filtrosMatch = responseText.match(/<FILTROS>(.*?)<\/FILTROS>/s);
    
    if (filtrosMatch) {
      try {
        const nuevosFiltros = JSON.parse(filtrosMatch[1]);
        // Remover el bloque de filtros del mensaje
        const mensajeLimpio = responseText.replace(/<FILTROS>.*?<\/FILTROS>/s, '').trim();
        
        return Response.json({ 
          message: mensajeLimpio,
          filtros: nuevosFiltros
        });
      } catch (e) {
        console.error('Error parseando filtros:', e);
        return Response.json({ message: responseText });
      }
    }
    
    return Response.json({ message: responseText });
    
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return Response.json({ 
      message: 'Lo siento, hubo un error al procesar tu pregunta. Por favor intenta de nuevo.' 
    }, { status: 500 });
  }
}