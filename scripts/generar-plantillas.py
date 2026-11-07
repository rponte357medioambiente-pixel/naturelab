"""
Genera public/data/plantillas.json: los puntos para unir de cada especie, en sus tres niveles.

Las formas están en plantillas_contornos.py (coordenadas en un área de 300 x 300).
Para añadir una especie: definir su forma allí, añadir su nombre en NOMBRES y ejecutar
    python3 scripts/generar-plantillas.py
Necesita Python 3 con la librería shapely (pip install shapely).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from plantillas_contornos import F, NOMBRES, puntos, niveles, etiquetas

def redondear(lista):
    return [[round(x, 1), round(y, 1)] for x, y in lista]

datos = {"version": 1, "area": 300, "plantillas": []}
for especie_id in F:
    nv = niveles(especie_id)
    datos["plantillas"].append({
        "especieId": especie_id,
        "parte": NOMBRES[especie_id][1],
        "niveles": {
            nivel: {"puntos": redondear(p), "etiquetas": redondear(etiquetas(especie_id, p))}
            for nivel, n in nv.items()
            for p in [puntos(especie_id, n)]
        },
    })
destino = os.path.join(os.path.dirname(__file__), "..", "public", "data", "plantillas.json")
with open(destino, "w", encoding="utf-8") as f:
    json.dump(datos, f, ensure_ascii=False, separators=(",", ":"))
    f.write("\n")
print(f"{len(datos['plantillas'])} plantillas en {os.path.normpath(destino)}")
