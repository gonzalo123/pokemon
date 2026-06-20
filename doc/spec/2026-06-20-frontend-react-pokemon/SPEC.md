# Frontend React — Pokédex con efecto wow

## Objetivo

Crear un frontend React + TypeScript con Vite que consuma el backend FastAPI local
(`http://localhost:8000/api`) y presente tres vistas: lista paginada con búsqueda y
filtro por tipo, detalle de Pokémon, y comparador. El "efecto wow" combina animaciones
con Framer Motion, radar chart de stats con Recharts, sprites animados (gen5 cuando
existan) y color dinámico por tipo.

## Estado actual observado

Proyecto vacío. Carpeta `frontend/` no existe. No hay código previo que heredar.
El backend tiene su propia spec en `doc/spec/2026-06-20-backend-fastapi-proxy/SPEC.md`
y expone los siguientes endpoints:

- `GET /api/pokemon?limit&offset` → `[{id, name, sprite, types: []}]`
- `GET /api/pokemon/{id_or_name}` → detalle completo con stats, types, abilities, sprites
- `GET /api/types` → `["normal", "fire", ...]`
- `GET /api/types/{type}` → `[4, 5, 6, ...]` (ids)

**Nota**: la lista devuelve `types: []`. Los tipos solo están disponibles en el detalle.

## Contexto

- Vite + React + TypeScript como scaffold base.
- Frontend se ejecuta en `http://localhost:5173`.
- Backend en `http://localhost:8000`.
- Dependencias de "efecto wow" aprobadas: Framer Motion, Recharts.
- Routing: React Router v6.
- Sin backend de sesión, sin autenticación, sin base de datos en el frontend.
- El comparador selecciona Pokémon buscando por nombre y cargando su detalle.

## Alcance

- Scaffold completo de `frontend/` con Vite + React + TS.
- `src/api.ts`: funciones fetch hacia `http://localhost:8000/api`.
- `src/theme.ts`: mapa de colores por tipo (18 tipos + fallback).
- `src/App.tsx`: router con 3 rutas.
- `src/components/TypeBadge.tsx`: badge de tipo con color.
- `src/components/PokemonCard.tsx`: card animada para la lista.
- `src/components/SearchBar.tsx`: input de búsqueda por nombre.
- `src/components/StatRadar.tsx`: radar chart de 6 stats con Recharts.
- `src/pages/ListPage.tsx`: grid paginado + búsqueda + filtro por tipo.
- `src/pages/DetailPage.tsx`: detalle completo con sprite/shiny toggle.
- `src/pages/ComparePage.tsx`: comparador de 2 Pokémon.

## Fuera de alcance

- Favoritos o persistencia de estado.
- SSR / Next.js.
- Tests automatizados de frontend (sin jest/vitest en esta spec; la validación es visual
  con Playwright).
- Internacionalización.
- Modo oscuro / temas alternantes.
- PWA / service workers.
- Paginación infinita (se usa paginación clásica con botones).
- Tipos en la lista (el backend no los devuelve en la lista para evitar N+1).

## No tocar

No hay ficheros previos. Al crear, no introducir:
- CSS global que rompa el tema por tipo.
- Llamadas directas a `pokeapi.co` desde el frontend (todo pasa por el backend local).
- Dependencias no listadas en esta spec.

## Requisitos funcionales

### Lista (`/`)
- Muestra un grid de `PokemonCard`. Cada card tiene: sprite, nombre, id en formato
  `#001`, badge del tipo primario (vacío si `types: []`).
- Paginación: botones "Anterior" / "Siguiente", 20 Pokémon por página.
- `SearchBar`: filtra por nombre (case-insensitive, substring). La búsqueda se aplica
  sobre la página actual cargada (filtro local, no llama al backend por cada letra).
- Dropdown de filtro por tipo: al seleccionar un tipo, llama a
  `GET /api/types/{type}` para obtener ids, luego carga los detalles de esos Pokémon en
  páginas de 20 (reemplaza el modo paginado normal por un modo "filtro por tipo").
- Al hacer clic en una card, navega a `/pokemon/:id`.
- Animación de entrada escalonada: las cards aparecen con `motion.div` de Framer Motion
  con `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`, con
  `delay: index * 0.04` (stagger).
- Efecto tilt en hover de cada card: usar `whileHover={{ scale: 1.06, rotateX: 4 }}`
  con `perspective` CSS en el contenedor de la card.

### Detalle (`/pokemon/:id`)
- Sprite grande centrado (200px mínimo).
- Toggle "Normal / Shiny": alterna entre `sprites.default` y `sprites.shiny`.
- Si `sprites.animated` no es `null`, mostrar el sprite animado por defecto en lugar
  del estático. El toggle sigue alternando entre animado/shiny (shiny estático).
- Fondo o gradiente del color del tipo primario (`theme.ts`), de opacidad 0.15 para
  no saturar.
- Nombre en mayúsculas + id `#001`.
- `StatRadar`: radar chart de los 6 stats con Recharts `RadarChart`. Los stats son:
  `hp`, `attack`, `defense`, `special-attack`, `special-defense`, `speed`.
  Valor máximo del eje: 255 (max stat en PokeAPI). Color del área: color del tipo
  primario desde `theme.ts`.
- Badges de tipos con `TypeBadge`.
- Lista de habilidades como texto simple.
- Altura (en dm, mostrar como `{height/10} m`) y peso (en hectogramos, mostrar como
  `{weight/10} kg`).
- Botón "Comparar": navega a `/compare?a={id}`.
- Botón "← Volver" que regresa a `/`.
- Animación de entrada de la página: `motion.div` con
  `initial={{ opacity: 0, scale: 0.96 }}` → `animate={{ opacity: 1, scale: 1 }}`.

### Comparador (`/compare`)
- Interfaz para seleccionar 2 Pokémon por nombre (dos `SearchBar` independientes).
- Al escribir un nombre y pulsar Enter o un botón "Cargar", carga el detalle del
  Pokémon y lo muestra en su columna (sprite, nombre, tipos).
- Si se llegó desde el detalle con `?a={id}`, el primer Pokémon se precarga.
- Cuando ambos Pokémon están cargados, muestra un `RadarChart` superpuesto con dos
  series: una por cada Pokémon. Colores distintos (color del tipo primario de cada uno).
- Debajo del radar, tabla de stats comparativa: para cada stat, resaltar en negrita el
  Pokémon con mayor valor.
- Botón "Limpiar" que resetea ambas columnas.

## Requisitos técnicos

- Node ≥ 20, Vite ≥ 5, React ≥ 18, TypeScript estricto (`"strict": true`).
- Dependencias exactas en `package.json`:
  ```json
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "framer-motion": "^11.2.10",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.12"
  }
  ```
- `src/api.ts` usa `fetch` nativo (no axios). Lanza `Error("NOT_FOUND")` en 404 y
  `Error("UPSTREAM_ERROR")` en otros errores HTTP.
- Todas las llamadas al backend pasan por `src/api.ts`. No hay `fetch` inline en
  componentes.
- El estado de carga se muestra con un spinner CSS simple (sin librerías adicionales).
  El estado de error muestra un mensaje de texto.
- No usar `any` en TypeScript. Definir tipos para las respuestas del backend.
- CSS: usar CSS Modules (`*.module.css`) o estilos inline via `style={{}}` para estilos
  específicos de componente. No usar Tailwind ni styled-components.
- `theme.ts` exporta un objeto `TYPE_COLORS: Record<string, string>` con colores hex
  para los 18 tipos + `"default": "#A8A8A8"`.

## Mapa de colores por tipo (theme.ts)

```typescript
export const TYPE_COLORS: Record<string, string> = {
  normal:   "#A8A878",
  fire:     "#F08030",
  water:    "#6890F0",
  electric: "#F8D030",
  grass:    "#78C850",
  ice:      "#98D8D8",
  fighting: "#C03028",
  poison:   "#A040A0",
  ground:   "#E0C068",
  flying:   "#A890F0",
  psychic:  "#F85888",
  bug:      "#A8B820",
  rock:     "#B8A038",
  ghost:    "#705898",
  dragon:   "#7038F8",
  dark:     "#705848",
  steel:    "#B8B8D0",
  fairy:    "#EE99AC",
  default:  "#A8A8A8",
};
```

## Tipos TypeScript esperados

```typescript
// src/types.ts
export interface PokemonListItem {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  abilities: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    "special-attack": number;
    "special-defense": number;
    speed: number;
  };
  sprites: {
    default: string;
    shiny: string;
    animated: string | null;
  };
}
```

## Regla de minimalismo

La implementación debe ser la mínima necesaria para cumplir los criterios de aceptación.
No introducir:
- Context API / Redux / Zustand (estado local con `useState` es suficiente).
- Librerías de componentes UI (Material UI, Chakra, etc.).
- Dependencias de testing en esta spec.
- CSS global más allá de un reset mínimo en `index.css`.
- Animaciones más allá de las descritas (no partículas, no shaders).

## Prohibido dejar placeholders

Todos los colores, tipos, shapes de datos y animaciones están definidos en esta spec.

## Ficheros probablemente afectados

```
frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx              entry point, BrowserRouter
    ├── App.tsx               Routes: /, /pokemon/:id, /compare
    ├── api.ts                fetchPokemonList, fetchPokemon, fetchTypes, fetchTypePokemons
    ├── types.ts              PokemonListItem, PokemonDetail
    ├── theme.ts              TYPE_COLORS
    ├── index.css             reset mínimo
    ├── components/
    │   ├── TypeBadge.tsx     badge colorido por tipo
    │   ├── PokemonCard.tsx   card con Framer Motion
    │   ├── SearchBar.tsx     input controlado
    │   └── StatRadar.tsx     RadarChart de Recharts
    └── pages/
        ├── ListPage.tsx      lista + búsqueda + filtro
        ├── DetailPage.tsx    detalle + sprite toggle
        └── ComparePage.tsx   comparador de 2 Pokémon
```

## Comandos relevantes

```bash
# Desde la raíz del proyecto
cd frontend

# Instalar dependencias
npm install

# Ejecutar dev server
npm run dev
# → disponible en http://localhost:5173

# Build de producción
npm run build

# Typecheck
npx tsc --noEmit
```

## Decisiones tomadas

- **Confirmadas por el usuario**: Vite + React + TS, Framer Motion, Recharts, React Router.
- **Inferidas del plan**: CSS Modules o inline, no Tailwind, sin Context/Redux.
- **Adoptadas por minimalismo**:
  - Búsqueda local (filtro sobre la página cargada, no request por letra).
  - En el comparador, búsqueda por nombre + Enter (no autocompletado con lista).
  - Tipos en lista ausentes (backend no los devuelve; badge vacío es aceptable).
  - Sin tests unitarios automatizados de frontend en esta spec (validación visual).

## Plan de implementación sugerido

### Paso 0 — Scaffold con Vite
```bash
cd /ruta/al/proyecto
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom framer-motion recharts
npm install  # instala todo
```
Verificar: `npm run dev` arranca en `localhost:5173` y muestra la página por defecto.

### Paso 1 — Tipos, tema y api.ts
1. Crear `src/types.ts` con `PokemonListItem` y `PokemonDetail` (ver sección Tipos).
2. Crear `src/theme.ts` con `TYPE_COLORS` (ver sección Mapa de colores).
3. Crear `src/api.ts` con 4 funciones:
   - `fetchPokemonList(limit: number, offset: number): Promise<PokemonListItem[]>`
   - `fetchPokemon(idOrName: string | number): Promise<PokemonDetail>`
   - `fetchTypes(): Promise<string[]>`
   - `fetchTypePokemons(type: string): Promise<number[]>`
4. Verificar: `npx tsc --noEmit` sin errores.

### Paso 2 — Componentes base
1. `TypeBadge.tsx`: recibe `type: string`, renderiza un `<span>` con
   `backgroundColor: TYPE_COLORS[type] ?? TYPE_COLORS.default`, color blanco, padding,
   border-radius, font-size pequeño.
2. `SearchBar.tsx`: `<input type="text">` controlado con prop `value`, `onChange`,
   `placeholder`.
3. `StatRadar.tsx`: `RadarChart` de Recharts con los 6 stats. Props: `stats: PokemonDetail["stats"]`, `color: string`. Usar `PolarGrid`, `PolarAngleAxis`, `Radar`, `ResponsiveContainer`. Domain: [0, 255].
4. Verificar: `npx tsc --noEmit` sin errores.

### Paso 3 — PokemonCard
`PokemonCard.tsx` recibe `pokemon: PokemonListItem`, `index: number`, `onClick: () => void`.
- `motion.div` con `initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`,
  `transition={{ delay: index * 0.04 }}`, `whileHover={{ scale: 1.06, rotateX: 4 }}`.
- Contenido: imagen (`<img src={sprite}>`), nombre capitalizado, id `#NNN`, `TypeBadge`
  del primer tipo (si `types.length > 0`).
- Fondo de la card: color semitransparente del tipo primario o `#f5f5f5` si sin tipo.

### Paso 4 — ListPage
`ListPage.tsx`:
- Estado: `items: PokemonListItem[]`, `offset: number`, `query: string`,
  `selectedType: string | null`, `typeIds: number[] | null`, `loading: boolean`.
- Al montar y al cambiar `offset`: llama a `fetchPokemonList(20, offset)`.
- Si `selectedType` está activo: llama a `fetchTypePokemons(selectedType)` para obtener
  `typeIds`, luego carga los Pokémon de esa página usando `fetchPokemon` para cada id
  del slice (20 en 20). Mostrar spinner mientras carga.
- `SearchBar` filtra `items` por `name.includes(query.toLowerCase())`.
- Dropdown `<select>` con todos los tipos de `fetchTypes()` + opción "Todos".
- Grid CSS con `display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`.
- Botones "← Anterior" (deshabilitado si `offset === 0`) / "Siguiente →".
- Al hacer clic en una card: `navigate(\`/pokemon/\${id}\`)`.

### Paso 5 — DetailPage
`DetailPage.tsx`:
- Carga `fetchPokemon(id)` al montar.
- Estado: `shiny: boolean`, `pokemon: PokemonDetail | null`, `loading: boolean`.
- Sprite mostrado: si `sprites.animated !== null && !shiny` → `sprites.animated`;
  si `shiny` → `sprites.shiny`; sino → `sprites.default`.
- Toggle: botón "✨ Shiny" / "Normal".
- Fondo: `background: \`linear-gradient(135deg, \${color}26 0%, #ffffff 60%)\``
  donde `color = TYPE_COLORS[pokemon.types[0]] ?? TYPE_COLORS.default`.
- `StatRadar` con el color del tipo primario.
- Altura: `{(height / 10).toFixed(1)} m`, Peso: `{(weight / 10).toFixed(1)} kg`.
- Botón "Comparar" → `navigate(\`/compare?a=\${id}\`)`.
- Botón "← Volver" → `navigate(-1)`.
- Animación de entrada de la página entera con `motion.div`.

### Paso 6 — ComparePage
`ComparePage.tsx`:
- Lee query param `a` al montar; si existe, precarga ese Pokémon en slot A.
- Dos columnas. Cada columna tiene `SearchBar` + botón "Cargar" + visualización del
  Pokémon cargado (sprite, nombre, `TypeBadge`s).
- Cuando ambos slots tienen un Pokémon cargado:
  - `RadarChart` superpuesto: dos `<Radar>` con `dataKey` apuntando a las stats de
    cada uno. Colores distintos (tipo primario de cada Pokémon).
  - Tabla de stats: 6 filas. Cada fila: nombre del stat, valor A, valor B. El mayor
    aparece en negrita (`fontWeight: "bold"`).
- Botón "Limpiar" → resetea ambos slots a `null`.

### Paso 7 — App.tsx y main.tsx
```tsx
// App.tsx
<Routes>
  <Route path="/" element={<ListPage />} />
  <Route path="/pokemon/:id" element={<DetailPage />} />
  <Route path="/compare" element={<ComparePage />} />
</Routes>

// main.tsx
<BrowserRouter>
  <App />
</BrowserRouter>
```
`index.css`: solo reset (`*, *::before, *::after { box-sizing: border-box; }`,
`body { margin: 0; font-family: system-ui, sans-serif; }`).

### Paso 8 — Verificación typecheck
```bash
npx tsc --noEmit
```
Sin errores ni `any` implícitos.

## Tests

No hay tests automatizados en esta spec. La validación es visual con Playwright (ver
sección Validación manual). Si se quieren añadir tests unitarios en el futuro, proponer
una nueva spec con Vitest.

## Validación manual

Con el backend corriendo (`uvicorn app.main:app --reload` en `backend/`) y el frontend
(`npm run dev` en `frontend/`):

1. Abrir `http://localhost:5173` → debe aparecer grid de Pokémon con animación de
   entrada escalonada.
2. Escribir "char" en el buscador → filtra las cards visibles a Pokémon que contengan
   "char".
3. Seleccionar "fire" en el dropdown de tipos → la lista cambia a Pokémon de tipo fuego.
4. Hacer clic en Charizard → navega a `/pokemon/6` con fondo naranja-fuego, sprite,
   radar de stats y badges.
5. Pulsar "✨ Shiny" → el sprite cambia al shiny de Charizard.
6. Pulsar "Comparar" → navega a `/compare?a=6`. La columna A muestra Charizard.
7. En la columna B, escribir "pikachu" y pulsar "Cargar" → aparece Pikachu.
8. Verificar que el radar superpuesto muestra dos polígonos de colores distintos y la
   tabla resalta en negrita los stats superiores de cada Pokémon.
9. Abrir DevTools → Network: confirmar que las llamadas van a `localhost:8000`, no a
   `pokeapi.co`.

## Criterios de aceptación

- [ ] `npx tsc --noEmit` sin errores.
- [ ] La lista carga y muestra grid de Pokémon con animación escalonada.
- [ ] El tilt en hover de las cards es visible.
- [ ] La búsqueda filtra por nombre sin recargar página.
- [ ] El filtro por tipo carga la lista de Pokémon del tipo seleccionado.
- [ ] La vista de detalle muestra sprite, stats (radar), tipos, habilidades, altura y peso.
- [ ] El toggle Normal/Shiny cambia el sprite.
- [ ] El radar usa el color del tipo primario.
- [ ] El comparador acepta 2 Pokémon y muestra radar superpuesto + tabla.
- [ ] La tabla del comparador resalta en negrita el stat mayor.
- [ ] El parámetro `?a=id` precarga el primer Pokémon en el comparador.
- [ ] Todas las llamadas van a `localhost:8000`, no a `pokeapi.co`.
- [ ] No hay `any` explícito ni implícito en TypeScript.
- [ ] No hay dependencias añadidas fuera de las indicadas.

## Riesgos y consideraciones

- **Sprites animados gen5**: solo existen hasta la gen 5 (Pokémon 1–649). Pokémon
  posteriores tendrán `animated: null`. El fallback al sprite estático es correcto.
- **Filtro por tipo N+1**: al seleccionar un tipo se obtienen ~50-100 ids y se hacen
  hasta 20 llamadas al backend para la página. El backend hace una llamada a PokeAPI
  por cada una. Sin caché puede ser lento. Futuro: caché en backend.
- **Paginación con filtro por tipo**: la lógica de paginación cambia entre modo normal
  (offset de lista) y modo tipo (slice de ids). Mantener estado claro para evitar bugs.
- **RadarChart Recharts con dos series**: la estructura de datos debe transformarse.
  Recharts espera un array de objetos `{stat: string, a: number, b: number}`. Construir
  ese array al montar el comparador.

## Preguntas abiertas

No hay preguntas abiertas relevantes.

## Recomendación de implementación

Recomendación: continuar en esta sesión.

Motivo: la spec es completa, el proyecto está vacío, y la sesión ya tiene el contexto
necesario para implementar sin ambigüedad. El plan de implementación es incremental y
verificable paso a paso.

## Prompt sugerido para implementar

```text
Implementa la spec ubicada en doc/spec/2026-06-20-frontend-react-pokemon/SPEC.md.

Lee la spec completa antes de modificar código.
Sigue el orden del plan de implementación (pasos 0 → 7).
No hagas cambios fuera de alcance.
No añadas dependencias salvo las indicadas.
Ejecuta `npx tsc --noEmit` después de cada paso para verificar tipos.
Si necesitas desviarte de la spec, explícame antes el motivo.
```

## Instrucciones para Claude Code

- Lee esta spec completa antes de modificar código.
- Sigue el orden del plan (pasos 0 → 7).
- No introduzcas cambios fuera de alcance.
- Respeta la regla de minimalismo.
- No añadas dependencias no listadas.
- Ejecuta `npx tsc --noEmit` al final del paso 7 para confirmar sin errores.
- Si encuentras una mejora fuera de alcance, propón una nueva spec.
