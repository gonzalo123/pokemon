# Backend FastAPI — Proxy hacia PokeAPI

## Objetivo

Crear un backend FastAPI que actúe como proxy normalizado hacia la PokeAPI pública
(`https://pokeapi.co/api/v2`), exponiendo endpoints simplificados para el frontend
React. El backend aplana y normaliza las respuestas de PokeAPI al shape exacto que
necesita el frontend.

## Estado actual observado

Proyecto vacío. Carpeta `backend/` no existe todavía. No hay código previo que heredar.

## Contexto

- PokeAPI es pública y gratuita, sin autenticación.
- El frontend se ejecuta en `localhost:5173` (Vite). El backend en `localhost:8000`.
- El backend no implementa caché (proxy simple). Si se necesita caché en el futuro,
  envolver `pokeapi.py` con `cachetools.TTLCache`.
- El cliente httpx es `AsyncClient` compartido vía lifespan de FastAPI. No crear un
  cliente nuevo por request.
- Stack: Python, FastAPI, uvicorn, httpx.
- Tests: pytest + respx (mock de httpx).
- Metodología: TDD (escribir test que falla → implementar → verde).

## Alcance

- Scaffold de `backend/` con estructura de carpetas.
- `requirements.txt` con dependencias exactas.
- Cliente httpx async compartido (`pokeapi.py`).
- 4 endpoints proxy en `routes.py`.
- Tests TDD con respx en `tests/test_routes.py`.
- `main.py` con CORS, lifespan y montaje de router.

## Fuera de alcance

- Caché de respuestas.
- Autenticación o autorización.
- Base de datos.
- Docker / containerización.
- Favoritos o persistencia de estado de usuario.
- Endpoints de búsqueda textual (la búsqueda la hace el frontend filtrando sobre la
  lista paginada).

## No tocar

No hay ficheros previos que proteger. Al crear, no introducir:
- Abstracciones innecesarias (repositorios, servicios, capas de dominio).
- Dependencias no listadas en esta spec.
- Logging elaborado (no pedido).

## Requisitos funcionales

- `GET /api/pokemon?limit=20&offset=0` devuelve lista paginada. Cada ítem contiene:
  `id`, `name`, `sprite` (URL del sprite frontal por defecto), `types` (lista de strings).
- `GET /api/pokemon/{id_or_name}` devuelve detalle con: `id`, `name`, `height`,
  `weight`, `types` (lista de strings), `abilities` (lista de strings),
  `stats` (objeto `{hp, attack, defense, special-attack, special-defense, speed}`),
  `sprites` (objeto `{default, shiny, animated}` — `animated` puede ser `null`).
- `GET /api/types` devuelve lista de strings con los nombres de todos los tipos
  (excluyendo `unknown` y `shadow`).
- `GET /api/types/{type}` devuelve lista de `id` enteros de Pokémon pertenecientes a
  ese tipo, ordenados por id ascendente.
- Cuando PokeAPI devuelve 404, el backend retorna HTTP 404 con `{"detail": "Not found"}`.
- Cuando PokeAPI devuelve otro error (5xx, timeout), el backend retorna HTTP 502 con
  `{"detail": "PokeAPI error"}`.

## Requisitos técnicos

- Python ≥ 3.11.
- Dependencias exactas en `requirements.txt`:
  ```
  fastapi>=0.111.0
  uvicorn[standard]>=0.29.0
  httpx>=0.27.0
  pytest>=8.2.0
  respx>=0.21.0
  pytest-asyncio>=0.23.0
  ```
- `AsyncClient` instanciado una vez en lifespan de FastAPI y almacenado en
  `app.state.http_client`. No usar `httpx.Client` síncrono.
- CORS: `allow_origins=["http://localhost:5173"]`, `allow_methods=["GET"]`.
- Los endpoints del router tienen prefijo `/api`.
- El fichero `pokeapi.py` expone funciones async que reciben el `AsyncClient` y
  devuelven el shape normalizado (dict). Las funciones no acceden a `app.state`.
- Los tests mockean httpx con respx y no hacen llamadas reales a internet.
- `pytest-asyncio` en modo `asyncio_mode = "auto"` (configurado en `pytest.ini` o
  `pyproject.toml`).

## Regla de minimalismo

La implementación debe ser la mínima necesaria para cumplir los criterios de aceptación.
No introducir:
- Abstracciones innecesarias.
- Dependencias nuevas no indicadas.
- Refactors oportunistas.
- Logging no pedido.
- Paginación en el endpoint de tipos.

## Prohibido dejar placeholders

Todos los shapes de respuesta están definidos arriba. No dejar "TBD" ni "similar a X".

## Ficheros probablemente afectados

```
backend/
├── app/
│   ├── __init__.py          (vacío)
│   ├── main.py              FastAPI app + CORS + lifespan + router
│   ├── pokeapi.py           funciones async que llaman a PokeAPI y normalizan
│   └── routes.py            4 endpoints, dependen de pokeapi.py
├── tests/
│   ├── __init__.py          (vacío)
│   └── test_routes.py       tests TDD con respx
├── requirements.txt
└── pytest.ini               asyncio_mode = auto
```

## Comandos relevantes

```bash
# Desde la raíz del proyecto
cd backend

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar backend
uvicorn app.main:app --reload

# Ejecutar tests
pytest tests/ -v

# Test específico
pytest tests/test_routes.py::test_list_pokemon -v
```

## Decisiones tomadas

- **Inferidas del plan aprobado**: proxy sin caché, `AsyncClient` compartido vía
  lifespan, CORS a `localhost:5173`, pytest + respx.
- **Adoptadas por minimalismo**: los tipos `unknown` y `shadow` se excluyen de
  `GET /api/types` porque PokeAPI los expone pero no son tipos de combate reales.
- **Decisión de diseño**: `pokeapi.py` recibe el cliente como parámetro (en lugar de
  importarlo globalmente) para facilitar el mock en tests.
- **Orden stats**: el objeto `stats` usa los nombres exactos de PokeAPI:
  `hp`, `attack`, `defense`, `special-attack`, `special-defense`, `speed`.

## Plan de implementación sugerido

Seguir TDD: escribir el test que falla, luego implementar lo mínimo para que pase.

### Paso 0 — Scaffold
Crear la estructura de carpetas y ficheros vacíos:
```
backend/app/__init__.py
backend/app/main.py        (vacío por ahora)
backend/app/pokeapi.py     (vacío por ahora)
backend/app/routes.py      (vacío por ahora)
backend/tests/__init__.py
backend/tests/test_routes.py (vacío por ahora)
backend/requirements.txt
backend/pytest.ini
```
Verificar: `ls backend/app/` lista los 4 ficheros.

### Paso 1 — Test + implementar `GET /api/pokemon`
1. En `test_routes.py`, escribir `test_list_pokemon`: mockear con respx la respuesta de
   `https://pokeapi.co/api/v2/pokemon?limit=20&offset=0` con fixture que incluya 2
   Pokémon. Afirmar que el response tiene status 200 y los campos `id`, `name`,
   `sprite`, `types`.
2. Ejecutar → FALLA (no hay implementación).
3. Implementar `list_pokemon(client, limit, offset)` en `pokeapi.py` + endpoint en
   `routes.py` + app básica en `main.py`.
4. Ejecutar → VERDE.

#### Shape de respuesta esperado para lista:
```json
[
  {"id": 1, "name": "bulbasaur", "sprite": "https://...front_default...", "types": ["grass", "poison"]}
]
```

#### Fixture respx para `GET /api/pokemon?limit=20&offset=0`:
PokeAPI devuelve `{"results": [{"name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon/1/"}]}`.
Para obtener `id` y `sprite`, el backend debe hacer un segundo request a cada URL de
detalle, O extraer el `id` de la URL con una regex/split.

**Decisión**: extraer `id` de la URL (`url.rstrip("/").split("/")[-1]`), construir
la URL del sprite directamente:
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`.
Así no se necesita un request por cada Pokémon para la lista.

Para `types`: el endpoint de lista de PokeAPI no incluye tipos. Los tipos en la lista
se obtienen del endpoint de detalle. Esto implica N+1 requests.

**Decisión simplificada**: la lista devuelve `types: []` (array vacío). El detalle
sí devuelve los tipos. El frontend puede omitir badges de tipo en la lista si `types`
está vacío, o hacer una llamada a detalle al hacer hover. Esto evita N+1 requests.

> ponytail: lista devuelve types:[] para evitar N+1. Si se necesitan tipos en la lista,
> añadir endpoint de bulk o caché.

### Paso 2 — Test + implementar `GET /api/pokemon/{id_or_name}`
1. Escribir `test_get_pokemon_detail`: mockear con respx la respuesta del endpoint de
   detalle de PokeAPI para `bulbasaur`. Afirmar shape completo.
2. Ejecutar → FALLA.
3. Implementar `get_pokemon(client, id_or_name)` en `pokeapi.py` + endpoint en `routes.py`.
4. Verificar que `animated` es `null` cuando no existe en los sprites de PokeAPI.
5. Ejecutar → VERDE.

#### Shape de respuesta esperado para detalle:
```json
{
  "id": 1,
  "name": "bulbasaur",
  "height": 7,
  "weight": 69,
  "types": ["grass", "poison"],
  "abilities": ["overgrow", "chlorophyll"],
  "stats": {
    "hp": 45,
    "attack": 49,
    "defense": 49,
    "special-attack": 65,
    "special-defense": 65,
    "speed": 45
  },
  "sprites": {
    "default": "https://...front_default...",
    "shiny": "https://...front_shiny...",
    "animated": "https://...gen5 animated... or null"
  }
}
```

El campo `animated` se encuentra en:
`pokemon.sprites.versions["generation-v"]["black-white"].animated.front_default`

Si esa ruta no existe o es `null`, devolver `null`.

### Paso 3 — Test + implementar `GET /api/types`
1. Escribir `test_list_types`: mockear respuesta de `https://pokeapi.co/api/v2/type`.
   Incluir `unknown` y `shadow` en el fixture. Afirmar que la respuesta los excluye.
2. Ejecutar → FALLA.
3. Implementar `list_types(client)` + endpoint.
4. Ejecutar → VERDE.

#### Shape de respuesta:
```json
["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison",
 "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark",
 "steel", "fairy"]
```

### Paso 4 — Test + implementar `GET /api/types/{type}`
1. Escribir `test_get_type_pokemon`: mockear respuesta de
   `https://pokeapi.co/api/v2/type/fire`. Afirmar que devuelve lista de ids enteros
   ordenados ascendentemente.
2. Ejecutar → FALLA.
3. Implementar `get_type_pokemon(client, type_name)` + endpoint.
4. Ejecutar → VERDE.

#### Shape de respuesta:
```json
[4, 5, 6, 37, 38, 58, ...]
```

Los ids se extraen de `type.pokemon[*].pokemon.url` con el mismo split de URL del paso 1.

### Paso 5 — Test errores (404 y 502)
1. Escribir `test_pokemon_not_found`: mockear respx devolviendo 404 para un pokemon.
   Afirmar que el backend devuelve 404 con `{"detail": "Not found"}`.
2. Escribir `test_pokemon_upstream_error`: mockear respx devolviendo 500. Afirmar 502
   con `{"detail": "PokeAPI error"}`.
3. Implementar manejo de errores en `pokeapi.py`.
4. Ejecutar → VERDE.

### Paso 6 — Verificación final
```bash
pytest tests/ -v
```
Todos los tests deben pasar. Sin warnings relevantes.

```bash
uvicorn app.main:app --reload
curl http://localhost:8000/api/pokemon/pikachu
```
Debe devolver el shape de detalle con stats, tipos y sprites.

## Tests

Fichero: `backend/tests/test_routes.py`

Tests mínimos:

| Test | Mock respx | Aserción |
|------|-----------|----------|
| `test_list_pokemon` | GET `pokeapi.co/api/v2/pokemon?limit=20&offset=0` | 200, lista con `id`, `name`, `sprite`, `types:[]` |
| `test_get_pokemon_detail` | GET `pokeapi.co/api/v2/pokemon/bulbasaur` | 200, shape completo con stats/types/sprites |
| `test_get_pokemon_animated_null` | GET detalle sin sprites gen5 | `sprites.animated == null` |
| `test_list_types` | GET `pokeapi.co/api/v2/type` con unknown+shadow | 200, lista sin `unknown` ni `shadow` |
| `test_get_type_pokemon` | GET `pokeapi.co/api/v2/type/fire` | 200, lista de ids ordenados |
| `test_pokemon_not_found` | 404 de PokeAPI | 404 `{"detail": "Not found"}` |
| `test_pokemon_upstream_error` | 500 de PokeAPI | 502 `{"detail": "PokeAPI error"}` |

Ejecutar todos: `pytest tests/ -v`

## Validación manual

```bash
uvicorn app.main:app --reload

# Lista paginada
curl "http://localhost:8000/api/pokemon?limit=5&offset=0"

# Detalle
curl "http://localhost:8000/api/pokemon/pikachu"

# Tipos
curl "http://localhost:8000/api/types"

# Pokémon de un tipo
curl "http://localhost:8000/api/types/fire"

# 404
curl "http://localhost:8000/api/pokemon/noexiste999"
```

## Criterios de aceptación

- [ ] `pytest tests/ -v` pasa en verde (7 tests).
- [ ] `GET /api/pokemon?limit=5&offset=0` devuelve lista con `id`, `name`, `sprite`, `types`.
- [ ] `GET /api/pokemon/pikachu` devuelve shape completo con `stats`, `types`, `sprites`.
- [ ] `sprites.animated` es `null` para Pokémon sin sprite animado gen5.
- [ ] `GET /api/types` excluye `unknown` y `shadow`.
- [ ] `GET /api/types/fire` devuelve lista de ids enteros ordenados.
- [ ] `GET /api/pokemon/noexiste999` devuelve 404.
- [ ] No hay dependencias añadidas fuera de `requirements.txt`.
- [ ] No hay código fuera de `backend/`.
- [ ] `AsyncClient` se crea una sola vez (en lifespan), no por request.

## Riesgos y consideraciones

- **N+1 en lista**: la lista no incluye tipos para evitar N requests por página. El
  frontend debe tolerar `types: []` en la lista.
- **Sprites animados gen5**: la ruta es profunda y frágil. Si PokeAPI cambia la
  estructura de sprites, devolver `null` silenciosamente es correcto.
- **PokeAPI rate limits**: no documentados oficialmente. El proxy sin caché puede
  golpear la API repetidamente con el comparador. Futuro: `cachetools.TTLCache`.
- **CORS**: solo `localhost:5173`. Si el frontend cambia de puerto, actualizar `main.py`.

## Preguntas abiertas

No hay preguntas abiertas relevantes.

## Recomendación de implementación

Recomendación: continuar en esta sesión.

Motivo: la spec es específica, el proyecto está vacío, no hay contexto ambiguo acumulado
y la implementación sigue un plan claro de TDD.

## Prompt sugerido para implementar

```text
Implementa la spec ubicada en doc/spec/2026-06-20-backend-fastapi-proxy/SPEC.md.

Lee la spec completa antes de modificar código.
Sigue el plan TDD: escribe el test que falla, implementa lo mínimo para que pase, verde.
No hagas cambios fuera de alcance.
No añadas dependencias salvo las indicadas en requirements.txt.
Ejecuta pytest antes de afirmar que los tests pasan.
Si necesitas desviarte de la spec, explícame antes el motivo.
```

## Instrucciones para Claude Code

- Lee esta spec completa antes de modificar código.
- Sigue el orden del plan de implementación (pasos 0 → 6).
- No introduzcas cambios fuera de alcance.
- Respeta la regla de minimalismo.
- No añadas dependencias no listadas.
- Ejecuta `pytest tests/ -v` antes de declarar que los tests pasan.
- Si encuentras una mejora fuera de alcance, propón una nueva spec.
