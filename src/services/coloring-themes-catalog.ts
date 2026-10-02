// Catálogo de Temas e Prompts Especializados para Livros de Colorir Amazon KDP
// Portabilidade oficial do repositório ElliottSax/coloring-books com expansão para Book Intel KDP

import { ColoringTheme } from '../types/coloring-book';

export const COLORING_THEMES: ColoringTheme[] = [
  {
    id: 'mandalas',
    name: 'Mandalas Místicas (Mystical Mandalas)',
    category: 'Padrões',
    description: 'Padrões geométricos elegantes, símbolos sagrados e desenhos circulares simétricos de alta introspecção e relaxamento.',
    coverPromptDetails: 'elegant mandala patterns, intricate geometric designs, spiritual symbols, purple and gold color scheme, calming zen aesthetic',
    prompts: [
      'intricate mandala pattern with geometric shapes and floral elements, black line art on white background, adult coloring book page, highly detailed symmetrical design',
      'zen mandala with lotus flowers and sacred geometry, clean black outlines on white, coloring page style, no shading',
      'celestial mandala with sun moon and stars pattern, detailed line drawing, adult coloring book, white background',
      'nature mandala with leaves vines and flowers, circular symmetrical design, black linework coloring page',
      'tribal mandala with ethnic patterns and symbols, intricate black line art, coloring book style',
      'kaleidoscope mandala with repeating crystalline facets, sharp vector style black lines on pure white paper',
      'sacred geometry mandala with Sri Yantra nested triangles and floral perimeter, ultra crisp black linework'
    ]
  },
  {
    id: 'animals',
    name: 'Animais Encantados (Enchanted Animals)',
    category: 'Natureza',
    description: 'Retratos majestosos de animais silvestres adornados com texturas zentangle, mandalas e arte ornamental.',
    coverPromptDetails: 'decorated animals with intricate patterns, lion owl elephant, vibrant nature colors, professional book cover design, whimsical artistic style',
    prompts: [
      'majestic lion portrait with decorative mane made of intricate patterns and flowers, adult coloring book style, black line art on white',
      'owl with ornate feathers filled with zentangle patterns, detailed coloring page, clean black outlines',
      'elephant decorated with mandala and paisley patterns, adult coloring book page, intricate line art',
      'wolf howling at moon with tribal patterns in fur, detailed line drawing for coloring, white background',
      'butterfly with intricate wing patterns and floral designs, adult coloring page, black linework',
      'peacock with elaborate tail feathers in zentangle style, coloring book art, detailed outlines',
      'fox with decorative fur patterns and nature elements, adult coloring page, clean lines',
      'horse with flowing mane filled with swirls and patterns, line art coloring page, intricate design'
    ]
  },
  {
    id: 'nature',
    name: 'Jardins Botânicos (Botanical Gardens)',
    category: 'Natureza',
    description: 'Folhagens tropicais, arranjos florais detalhados, florestas encantadas e composições botânicas relaxantes.',
    coverPromptDetails: 'beautiful flowers and plants, tropical leaves, botanical illustration style, fresh green and floral colors, elegant book cover design',
    prompts: [
      'tropical flowers and leaves arrangement, detailed botanical illustration, adult coloring book style, black line art',
      'enchanted forest scene with mushrooms ferns and flowers, intricate line drawing for coloring, white background',
      'underwater coral reef with fish and sea plants, detailed coloring page, clean black outlines',
      'garden scene with roses lilies and vines, botanical coloring book page, intricate linework',
      'tree of life with detailed bark leaves and roots, adult coloring page, ornate line art',
      'succulent garden arrangement, detailed botanical drawing, coloring book style, clean lines',
      'monstera leaves and exotic orchids in conservatory, crisp contour lines for coloring, no gray tones'
    ]
  },
  {
    id: 'geometric',
    name: 'Geometria Sagrada (Sacred Geometry)',
    category: 'Padrões',
    description: 'Tesselações matemáticas, ilusões de ótica, padrões 3D e arte moderna de alta precisão linear.',
    coverPromptDetails: 'complex geometric patterns, mathematical art, sacred geometry symbols, modern minimalist design, blue and gold color scheme',
    prompts: [
      'complex geometric pattern with interlocking shapes, adult coloring book page, precise black line art on white',
      'optical illusion geometric design, intricate repeating pattern, coloring page style, clean outlines',
      '3D geometric tessellation pattern, adult coloring book, detailed line art, white background',
      'art deco geometric pattern with symmetrical design, coloring page, black linework',
      'islamic geometric tile pattern, intricate arabesque design, adult coloring book style',
      'metatron cube surrounded by nested platonic solids, clean vector black outlines on white'
    ]
  },
  {
    id: 'fantasy',
    name: 'Reinos de Fantasia (Fantasy Realms)',
    category: 'Épico & Fantasia',
    description: 'Dragões ancestrais, fadas, sereias, castelos nas nuvens e criaturas míticas com ricas linhas narrativas.',
    coverPromptDetails: 'magical creatures, dragons and fairies, enchanted fantasy landscape, vibrant magical colors, dreamy whimsical book cover',
    prompts: [
      'fairy sitting on mushroom in enchanted forest, intricate details, adult coloring book page, line art',
      'dragon with ornate scales and decorative patterns, detailed coloring page, black outlines on white',
      'mermaid with flowing hair and detailed tail patterns, adult coloring book style, line drawing',
      'unicorn with decorated mane and magical elements, intricate coloring page, clean black lines',
      'castle in clouds with fantasy landscape, detailed line art for coloring, adult coloring book',
      'phoenix rising with elaborate feather patterns, coloring book page, intricate linework'
    ]
  },
  {
    id: 'patterns',
    name: 'Padrões Terapêuticos (Relaxing Patterns)',
    category: 'Padrões',
    description: 'Estilo paisley, texturas zentangle, papéis de parede damasco e arabescos art nouveau para foco e desestresse.',
    coverPromptDetails: 'abstract paisley and zentangle designs, decorative patterns, soothing art nouveau style, calming pastel colors, elegant cover',
    prompts: [
      'paisley pattern with intricate swirls and details, adult coloring book page, black line art on white',
      'zentangle abstract pattern with various textures, detailed coloring page, clean outlines',
      'damask wallpaper pattern, ornate repeating design, adult coloring book style, line art',
      'moroccan tile pattern with geometric and floral elements, coloring page, intricate lines',
      'art nouveau flowing pattern with organic curves, adult coloring book, detailed linework'
    ]
  },
  {
    id: 'inspirational',
    name: 'Palavras & Afirmações (Mindful Words)',
    category: 'Geral',
    description: 'Letras ornamentadas e tipografia decorativa com palavras de poder e paz cercadas por flores e folhagens.',
    coverPromptDetails: 'decorative inspirational words, peace love breathe, ornate lettering with floral elements, uplifting soft colors, motivational book cover',
    prompts: [
      'word BREATHE surrounded by decorative swirls flowers and patterns, adult coloring book page, line art',
      'word PEACE with mandala and nature elements around it, coloring page style, intricate outlines',
      'word LOVE decorated with hearts flowers and ornate patterns, adult coloring book, black lines',
      'word DREAM with clouds stars and whimsical designs, coloring page, detailed line art',
      'word CREATE surrounded by artistic elements and patterns, adult coloring book style, clean lines',
      'word GRATITUDE framed by blooming sunflower borders and zentangle ribbons, bold black line art'
    ]
  },
  {
    id: 'ocean',
    name: 'Mar & Vida Oceânica (Ocean Wonders)',
    category: 'Natureza',
    description: 'Tartarugas marinhas, recifes de corais, águas-vivas, cavalos-marinhos e criaturas oceânicas ornamentadas.',
    coverPromptDetails: 'underwater ocean reef, sea turtle and exotic fish, oceanic turquoise and coral hues, detailed nautical cover',
    prompts: [
      'detailed sea turtle swimming with decorative shell patterns, coral and seaweed around, adult coloring book page, intricate line art',
      'jellyfish with flowing tentacles filled with zentangle patterns, underwater scene, coloring page, clean black outlines',
      'ornate seahorse with intricate decorative patterns and bubbles, adult coloring book style, line drawing',
      'octopus with detailed tentacles wrapped around coral, underwater garden, coloring page, black linework',
      'tropical fish school with decorative scales and fins, coral reef background, adult coloring book, detailed outlines',
      'dolphin jumping through waves with decorative patterns, ocean scene, coloring page, intricate line art'
    ]
  },
  {
    id: 'flowers',
    name: 'Jardins em Flor (Blooming Gardens)',
    category: 'Natureza',
    description: 'Buquês exuberantes de girassóis, rosas, lótus, orquídeas e flores silvestres com traços puros para preenchimento.',
    coverPromptDetails: 'blooming flower bouquet, elegant floral composition, watercolor-inspired book cover palette, luxury aesthetics',
    prompts: [
      'sunflower with intricate center pattern and detailed petals, adult coloring book page, black line art on white',
      'rose garden with blooming roses, leaves and vines intertwining, detailed coloring page, clean outlines',
      'lotus flower floating on water with lily pads and koi fish, adult coloring book style, intricate linework',
      'cherry blossom branch with delicate flowers and decorative patterns, coloring page, detailed line art',
      'wildflower meadow with diverse flowers, butterflies and bees, coloring page, intricate patterns',
      'peony bouquet with full blooms and ornate leaves, adult coloring book style, detailed outlines'
    ]
  },
  {
    id: 'zen',
    name: 'Zen & Meditação (Zen & Mindfulness)',
    category: 'Geral',
    description: 'Monges em meditação, jardins secos de areia, árvores bonsai, círculos Ensō e símbolos espirituais.',
    coverPromptDetails: 'zen garden with stones, lotus and bonsai, calming green and bamboo tones, peaceful meditation book cover',
    prompts: [
      'buddha meditating surrounded by lotus flowers and ornate patterns, adult coloring book page, line art',
      'zen garden with raked sand patterns, rocks and bonsai tree, detailed coloring page, clean outlines',
      'yin yang symbol with decorative patterns and natural elements, adult coloring book style, intricate linework',
      'meditation stones stacked with flowing water and bamboo, coloring page, detailed line art',
      'om symbol surrounded by mandalas and spiritual patterns, adult coloring book, black linework',
      'lotus mandala with layers of petals and sacred geometry, coloring page, intricate patterns'
    ]
  },
  {
    id: 'celtic',
    name: 'Arte Celta (Celtic Knots)',
    category: 'Cultura',
    description: 'Nós infinitos, cruzes célticas, triskeles e espirais sagradas da mitologia gaélica e britânica antiga.',
    coverPromptDetails: 'intricate celtic knotwork borders, ancient emerald green and bronze tones, mythical celtic book cover',
    prompts: [
      'celtic trinity knot with intricate interwoven lines and patterns, adult coloring book page, line art',
      'celtic cross with ornate knotwork and decorative details, coloring page, clean black outlines',
      'celtic tree of life with intertwining branches and roots, adult coloring book style, intricate linework',
      'celtic animals with knotwork patterns, dragons and birds intertwined, coloring page, detailed line art',
      'celtic border pattern with continuous interlacing design, adult coloring book, black linework'
    ]
  },
  {
    id: 'japanese',
    name: 'Arte Tradicional Japonesa (Japanese Art)',
    category: 'Cultura',
    description: 'Peixes Carpa Koi, cerejeiras em flor, gueixas, templos pagodes, dragões orientais e ondas no estilo Ukiyo-e.',
    coverPromptDetails: 'japanese pagoda with cherry blossoms and mount fuji, crimson red and gold details, elegant oriental book cover',
    prompts: [
      'koi fish swimming in pond with lotus flowers and decorative waves, adult coloring book page, line art',
      'japanese cherry blossom tree with intricate branches and blooms, coloring page, clean outlines',
      'geisha with ornate kimono patterns and elaborate hair decorations, adult coloring book style, detailed linework',
      'pagoda temple with decorative rooflines and garden landscape, coloring page, intricate line art',
      'japanese dragon with scales and flowing mane, clouds and waves, adult coloring book, black linework',
      'origami crane with decorative fold patterns and traditional designs, coloring page, clean lines'
    ]
  },
  {
    id: 'space',
    name: 'Sonhos Cósmicos (Cosmic Dreams)',
    category: 'Épico & Fantasia',
    description: 'Astronautas flutuantes, planetas detalhados, constelações míticas, galáxias em espiral e luas crescentes.',
    coverPromptDetails: 'cosmic nebula with planets and astronaut silhouette, deep purple and starlight navy, stunning space cover',
    prompts: [
      'solar system with detailed planets, stars and orbital patterns, adult coloring book page, intricate line art',
      'astronaut floating in space with decorative suit patterns, stars and galaxies, coloring page, clean outlines',
      'moon phases with ornate lunar surface details and celestial patterns, adult coloring book style, linework',
      'constellation patterns with connected stars forming mythical creatures, coloring page, detailed line art',
      'rocket ship launching with decorative hull designs and flame patterns, adult coloring book, black lines',
      'galaxy spiral with swirling stars and cosmic dust patterns, adult coloring book style, detailed outlines'
    ]
  },
  {
    id: 'architecture',
    name: 'Monumentos & Cidades (Beautiful Buildings)',
    category: 'Cultura',
    description: 'Catedrais góticas, mansões vitorianas, o Taj Mahal, a Torre Eiffel, faróis marítimos e moinhos de vento.',
    coverPromptDetails: 'architectural landmarks montage, refined line drafting with warm twilight tones, premium book cover',
    prompts: [
      'gothic cathedral with intricate stained glass windows and ornate spires, adult coloring book page, line art',
      'victorian mansion with detailed gingerbread trim and wraparound porch, coloring page, clean outlines',
      'taj mahal with ornate domes and decorative archways, reflecting pool, adult coloring book style, linework',
      'eiffel tower with intricate ironwork lattice patterns and parisian skyline, coloring page, detailed line art',
      'lighthouse on cliff with decorative stonework and crashing waves, adult coloring book, black linework',
      'castle with detailed towers, battlements and decorative stonework, adult coloring book style, clean lines'
    ]
  }
];

export const PROMPT_VARIATIONS = [
  '',
  ', with bold thick outlines and balanced whitespace',
  ', with intricate background patterns and ornamental details',
  ', centered composition, framed by delicate vignette borders',
  ', full page design, maximized coloring surface area',
  ', zen balanced composition, serene flow of lines',
  ', clean vector style, crisp high contrast monochrome linework'
];
