import pandas as pd
import json
import sys

try:
    print("🔄 Leyendo Excel...")
    df = pd.read_excel('Reporte_Maestro.xlsx', sheet_name=0)
    print(f"✅ Leídas {len(df)} filas")
    
    # Limpia los datos
    print("🧹 Limpiando datos...")
    df = df.fillna(0)
    
    # Convierte a JSON
    print("📦 Convirtiendo a JSON...")
    data = df.to_dict('records')
    
    # Guarda en public/
    print("💾 Guardando archivo...")
    with open('public/ventas_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Archivo guardado exitosamente!")
    print(f"📊 Total de registros: {len(data)}")
    print(f"📄 Tamaño del archivo: {len(json.dumps(data))/1024/1024:.2f} MB")
    
    # Verificar que el JSON es válido
    print("🔍 Verificando JSON...")
    with open('public/ventas_data.json', 'r', encoding='utf-8') as f:
        test = json.load(f)
    print(f"✅ JSON válido con {len(test)} registros")
    
    print("\n🎉 TODO LISTO!")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    sys.exit(1)