"""Plantillas de contorno de las 13 especies, en un área de 300 x 300 (y hacia abajo)."""
import math, json
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import unary_union
from shapely import affinity

def elipse(cx, cy, rx, ry, ang=0):
    e = affinity.scale(Point(0, 0).buffer(1, 64), rx, ry)
    e = affinity.rotate(e, ang, origin=(0, 0))
    return affinity.translate(e, cx, cy)

def trazo(puntos, ancho):
    return LineString(puntos).buffer(ancho / 2, 32)

def curva(p0, p1, p2, n=40):
    """Curva cuadrática de Bézier."""
    return [((1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0], (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1]) for t in [i/n for i in range(n+1)]]

def estrella_redondeada(cx, cy, puntas, r_ext, r_int, ancho_punta):
    partes = [Point(cx, cy).buffer(r_int, 64)]
    for k in range(puntas):
        a = -math.pi/2 + 2*math.pi*k/puntas
        partes.append(trazo([(cx + r_int*0.6*math.cos(a), cy + r_int*0.6*math.sin(a)),
                             (cx + (r_ext - ancho_punta/2)*math.cos(a), cy + (r_ext - ancho_punta/2)*math.sin(a))], ancho_punta))
    return unary_union(partes)

F = {}

# Taray: espiga de flores (racimo) con su tallo
F["tamarix-canariensis"] = unary_union([
    trazo([(150, 288), (150, 140)], 15), elipse(150, 92, 17, 62),
    trazo([(150, 215), (92, 162)], 13), elipse(78, 118, 15, 50, -25),
    trazo([(150, 190), (208, 145)], 13), elipse(222, 100, 15, 50, 25)])

# Albaida: hoja de tres folíolos
F["anthyllis-cytisoides"] = unary_union([
    elipse(150, 88, 32, 58), elipse(92, 150, 30, 54, -58), elipse(208, 150, 30, 54, 58),
    trazo([(150, 170), (150, 120)], 10), trazo([(150, 170), (110, 160)], 10), trazo([(150, 170), (190, 160)], 10),
    Point(150, 168).buffer(14), trazo([(150, 170), (150, 288)], 15)])

# Aulaga rascavieja: cabezuela amarilla de lígulas
F["launaea-arborescens"] = estrella_redondeada(150, 150, 6, 125, 56, 34)

# Boja negra: hoja muy dividida
F["artemisia-glutinosa"] = unary_union(
    [trazo([(150, 285), (150, 48)], 15), elipse(150, 52, 16, 30)]
    + [elipse(150 + s*50*f, y, 54*f, 18, s*-28) for (y, f) in [(120, 0.85), (195, 1.15)] for s in (-1, 1)])

# Albardín: mata de hojas estrechas en abanico
hojas = []
for k, ang in enumerate([-62, -38, -14, 10, 34, 58]):
    a = math.radians(ang - 90)
    largo = 225 - abs(ang) * 0.6
    punta = (150 + largo*math.cos(a), 280 + largo*math.sin(a))
    control = (150 + largo*0.45*math.cos(a + 0.15), 280 + largo*0.45*math.sin(a + 0.15))
    hojas.append(LineString(curva((150, 280), control, punta)).buffer(8, 16, cap_style=2))
F["lygeum-spartum"] = unary_union(hojas + [Point(150, 278).buffer(16, 32)])

# Siempreviva: hoja de la roseta (espatulada)
lado = []
for i in range(81):
    t = i / 80
    y = 285 - 245*t
    a = 8 + 82 * math.sin(math.pi * t**1.5) ** 0.9 * (t**0.6)
    lado.append((150 + a, y))
F["limonium-sp"] = Polygon(lado + [(150, 38)] + [(300 - x, y) for x, y in reversed(lado)]).buffer(2).buffer(-1)

# Salicornia: tallo articulado con dos ramas
seg = [elipse(150, 268 - 34*i, 17, 19) for i in range(7)]
rama_i = [elipse(150 - 30*j, 196 - 30*j, 15, 17, 35) for j in range(1, 3)]
rama_d = [elipse(150 + 30*j, 160 - 30*j, 15, 17, -35) for j in range(1, 3)]
F["salicornia-sp"] = unary_union(seg + rama_i + rama_d + [trazo([(150, 280), (150, 50)], 12)])

# Moricandia: flor de cuatro pétalos en cruz
def polar(fn, n=360, cx=150, cy=150):
    return Polygon([(cx + fn(2*math.pi*i/n)*math.cos(2*math.pi*i/n), cy + fn(2*math.pi*i/n)*math.sin(2*math.pi*i/n)) for i in range(n)])
F["moricandia-arvensis"] = affinity.rotate(polar(lambda t: 118 * (0.42 + 0.58 * abs(math.cos(2*t)) ** 0.8)), 45, origin=(150, 150))

# Verdolaga: roseta de cinco hojas carnosas
F["portulaca-oleracea"] = unary_union(
    [elipse(150 + 62*math.cos(a), 150 + 62*math.sin(a), 60, 34, math.degrees(a))
     for a in [-math.pi/2 + 2*math.pi*k/5 for k in range(5)]] + [Point(150, 150).buffer(30)])

# Grama de los arenales: espiga con espiguillas alternas
F["elymus-farctus"] = unary_union(
    [trazo([(150, 288), (150, 28)], 14)]
    + [elipse(150 + s*18, 55 + 34*i, 17, 28, s*24) for i, s in enumerate([1, -1, 1, -1, 1, -1])])

# Cuernecillo de mar: tres legumbres en «pata de pájaro»
F["lotus-creticus"] = unary_union([
    LineString(curva((150, 205), (148, 120), (156, 38))).buffer(10, 16),
    LineString(curva((150, 205), (105, 140), (62, 78))).buffer(10, 16),
    LineString(curva((150, 205), (198, 140), (240, 82))).buffer(10, 16),
    trazo([(150, 200), (150, 288)], 15), Point(150, 205).buffer(18)])

# Hierba carnicera: tallo con hojas opuestas y glomérulo de brácteas plateadas
F["paronychia-argentea"] = unary_union(
    [trazo([(150, 288), (150, 100)], 15)]
    + [elipse(150 + s*38, 215, 36, 14, s*-18) for s in (-1, 1)]
    + [Point(150, 90).buffer(34)] + [Point(150 + 40*math.cos(a), 90 + 40*math.sin(a)).buffer(22) for a in [-math.pi/2 + 2*math.pi*k/5 for k in range(5)]])

# Planta rodante: mata redonda y pinchuda
F["salsola-kali"] = estrella_redondeada(150, 150, 6, 130, 82, 20)

NOMBRES = {
  "tamarix-canariensis": ("Taray", "espiga de flores"), "anthyllis-cytisoides": ("Albaida", "hoja de tres folíolos"),
  "launaea-arborescens": ("Aulaga rascavieja", "cabezuela de flores"), "artemisia-glutinosa": ("Boja negra", "hoja dividida"),
  "lygeum-spartum": ("Albardín", "mata de hojas"), "limonium-sp": ("Siempreviva", "hoja de la roseta"),
  "salicornia-sp": ("Salicornia", "tallo articulado"), "moricandia-arvensis": ("Moricandia", "flor de cuatro pétalos"),
  "portulaca-oleracea": ("Verdolaga", "roseta de hojas carnosas"), "elymus-farctus": ("Grama de los arenales", "espiga"),
  "lotus-creticus": ("Cuernecillo de mar", "legumbres en pata de pájaro"), "paronychia-argentea": ("Hierba carnicera", "tallo y brácteas plateadas"),
  "salsola-kali": ("Planta rodante", "mata pinchuda"),
}

def contorno(id_):
    g = F[id_]
    if g.geom_type != "Polygon":
        g = max(g.geoms, key=lambda x: x.area)
    anillo = list(g.exterior.coords)[:-1]
    # Sentido horario en pantalla y empezando por el punto más alto
    area = sum(x1*y2 - x2*y1 for (x1, y1), (x2, y2) in zip(anillo, anillo[1:] + anillo[:1]))
    if area < 0:
        anillo = anillo[::-1]
    i0 = min(range(len(anillo)), key=lambda i: (round(anillo[i][1]), abs(anillo[i][0] - 150)))
    return anillo[i0:] + anillo[:i0]

def remuestrear(anillo, paso=2.0):
    """Puntos equidistantes a lo largo del contorno cerrado."""
    salida = []
    for (x1, y1), (x2, y2) in zip(anillo, anillo[1:] + anillo[:1]):
        d = math.dist((x1, y1), (x2, y2))
        k = max(1, int(d / paso))
        salida += [(x1 + (x2 - x1) * i / k, y1 + (y2 - y1) * i / k) for i in range(k)]
    return salida

def puntos(id_, n):
    """n puntos sobre el contorno, en su orden, que conservan la forma: se quitan uno a uno
    los que menos aportan (el triángulo de menor área con sus vecinos), como en el método de Visvalingam."""
    p = remuestrear(contorno(id_))
    vivos = list(range(len(p)))
    def area(i):
        a, b, c = p[vivos[i - 1]], p[vivos[i]], p[vivos[(i + 1) % len(vivos)]]
        return abs((b[0]-a[0])*(c[1]-a[1]) - (c[0]-a[0])*(b[1]-a[1])) / 2
    while len(vivos) > n:
        # el primer punto (el más alto) se conserva siempre
        j = min(range(1, len(vivos)), key=area)
        vivos.pop(j)
    return [(round(p[i][0], 1), round(p[i][1], 1)) for i in vivos]


def minimo_puntos(id_):
    """Menos puntos con los que la forma se conserva: sin cruces y cerca del contorno original."""
    from shapely.geometry import Polygon as _P
    original = _P(contorno(id_))
    for n in range(15, 51):
        p = _P(puntos(id_, n))
        if p.is_valid and original.hausdorff_distance(p) < 17 and p.area / original.area > 0.7:
            return n
    return 50


def niveles(id_):
    """Puntos de cada nivel para esta especie: el fácil es el mínimo que conserva la forma (al menos 15)."""
    facil = max(15, minimo_puntos(id_))
    medio = max(30, facil + 10)
    dificil = max(50, medio + 15)
    return {"facil": facil, "medio": medio, "dificil": dificil}


def etiquetas(id_, pts, distancia=13):
    """Posición de cada número: hacia fuera del contorno, según la dirección local de la línea."""
    from shapely.geometry import Polygon as _P, Point as _Pt
    pol = _P(contorno(id_))
    salida = []
    for i, (x, y) in enumerate(pts):
        ax, ay = pts[i - 1]; bx, by = pts[(i + 1) % len(pts)]
        tx, ty = bx - ax, by - ay
        d = math.hypot(tx, ty) or 1
        nx, ny = ty / d, -tx / d
        if pol.contains(_Pt(x + nx * 5, y + ny * 5)):
            nx, ny = -nx, -ny
        salida.append((round(x + nx * distancia, 1), round(y + ny * distancia + 4, 1)))
    return salida
