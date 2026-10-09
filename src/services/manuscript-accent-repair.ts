import { BookProject } from '../types/book-project';
import { ManuscriptIntegrityEngine } from './manuscript-integrity-engine';

/**
 * Tabela de substituição de artefatos de mojibake (dupla codificação UTF-8 interpretada como Latin-1 / Windows-1252)
 */
const MOJIBAKE_MAP: Array<[RegExp, string]> = [
  // Minúsculas acentuadas
  [/Ã¡/g, 'á'],
  [/Ã /g, 'à'],
  [/Ã¢/g, 'â'],
  [/Ã£/g, 'ã'],
  [/Ã¤/g, 'ä'],
  [/Ã©/g, 'é'],
  [/Ãª/g, 'ê'],
  [/Ã«/g, 'ë'],
  [/Ã­|Ã\u00ad/g, 'í'],
  [/Ã®/g, 'î'],
  [/Ã¯/g, 'ï'],
  [/Ã³/g, 'ó'],
  [/Ã´/g, 'ô'],
  [/Ãµ/g, 'õ'],
  [/Ã¶/g, 'ö'],
  [/Ãº/g, 'ú'],
  [/Ã»/g, 'û'],
  [/Ã¼/g, 'ü'],
  [/Ã§/g, 'ç'],

  // Maiúsculas acentuadas
  [/Ã|Ã\x81/g, 'Á'],
  [/Ã€|Ã\x80/g, 'À'],
  [/Ã‚|Ã\x82/g, 'Â'],
  [/Ãƒ|Ã\x83/g, 'Ã'],
  [/Ã„|Ã\x84/g, 'Ä'],
  [/Ã‰|Ã\x89/g, 'É'],
  [/ÃŠ|Ã\x8a/g, 'Ê'],
  [/Ã‹|Ã\x8b/g, 'Ë'],
  [/Ã|Ã\x8d/g, 'Í'],
  [/ÃŽ|Ã\x8e/g, 'Î'],
  [/Ã|Ã\x8f/g, 'Ï'],
  [/Ã“|Ã\x93/g, 'Ó'],
  [/Ã”|Ã\x94/g, 'Ô'],
  [/Ã•|Ã\x95/g, 'Õ'],
  [/Ã–|Ã\x96/g, 'Ö'],
  [/Ãš|Ã\x9a/g, 'Ú'],
  [/Ã›|Ã\x9b/g, 'Û'],
  [/Ãœ|Ã\x9c/g, 'Ü'],
  [/Ã‡|Ã\x87/g, 'Ç'],

  // Pontuação e símbolos especiais corrompidos
  [/â€œ|â€/g, '"'],
  [/â€˜|â€™/g, "'"],
  [/â€”/g, '—'],
  [/â€“/g, '–'],
  [/â€¦/g, '...'],
  [/â€¢/g, '•'],
  [/Â«/g, '«'],
  [/Â»/g, '»'],
  [/Â°/g, '°'],
  [/Âº/g, 'º'],
  [/Âª/g, 'ª'],
  [/Â§/g, '§'],
  [/Â\s/g, ' '],
  [/Â/g, ''],
  [/Ã\s/g, 'à '], // caso comum de crase solta corrompida
  [/\uFFFD/g, ''] // caractere de substituição desconhecido
];

/**
 * Dicionário de palavras frequentes em português que perdem acentos em gerações de IA
 */
const COMMON_ACCENT_REPLACEMENTS: Array<[string, string]> = [
  ['nao', 'não'],
  ['sao', 'são'],
  ['voce', 'você'],
  ['voces', 'vocês'],
  ['tambem', 'também'],
  ['ja', 'já'],
  ['ate', 'até'],
  ['entao', 'então'],
  ['estao', 'estão'],
  ['posicao', 'posição'],
  ['posicoes', 'posições'],
  ['acao', 'ação'],
  ['acoes', 'ações'],
  ['situacao', 'situação'],
  ['situacoes', 'situações'],
  ['relacao', 'relação'],
  ['relacoes', 'relações'],
  ['informacao', 'informação'],
  ['informacoes', 'informações'],
  ['opcao', 'opção'],
  ['opcoes', 'opções'],
  ['solucao', 'solução'],
  ['solucoes', 'soluções'],
  ['funcao', 'função'],
  ['funcoes', 'funções'],
  ['visao', 'visão'],
  ['visoes', 'visões'],
  ['direcao', 'direção'],
  ['direcoes', 'direções'],
  ['atencao', 'atenção'],
  ['producao', 'produção'],
  ['construcao', 'construção'],
  ['distribuicao', 'distribuição'],
  ['organizacao', 'organização'],
  ['organizacoes', 'organizações'],
  ['transformacao', 'transformação'],
  ['transformacoes', 'transformações'],
  ['operacao', 'operação'],
  ['operacoes', 'operações'],
  ['comunicacao', 'comunicação'],
  ['decisao', 'decisão'],
  ['decisoes', 'decisões'],
  ['avaliacao', 'avaliação'],
  ['avaliacoes', 'avaliações'],
  ['gestao', 'gestão'],
  ['padrao', 'padrão'],
  ['padroes', 'padrões'],
  ['geracao', 'geração'],
  ['geracoes', 'gerações'],
  ['evolucao', 'evolução'],
  ['revolucao', 'revolução'],
  ['configuracao', 'configuração'],
  ['configuracoes', 'configurações'],
  ['edicao', 'edição'],
  ['edicoes', 'edições'],
  ['publicacao', 'publicação'],
  ['publicacoes', 'publicações'],
  ['introducao', 'introdução'],
  ['conclusao', 'conclusão'],
  ['especificacao', 'especificação'],
  ['especificacoes', 'especificações'],
  ['capitulo', 'capítulo'],
  ['capitulos', 'capítulos'],
  ['pagina', 'página'],
  ['paginas', 'páginas'],
  ['titulo', 'título'],
  ['titulos', 'títulos'],
  ['subtitulo', 'subtítulo'],
  ['subtitulos', 'subtítulos'],
  ['metodo', 'método'],
  ['metodos', 'métodos'],
  ['estrategia', 'estratégia'],
  ['estrategias', 'estratégias'],
  ['tecnica', 'técnica'],
  ['tecnicas', 'técnicas'],
  ['tecnico', 'técnico'],
  ['tecnicos', 'técnicos'],
  ['pratica', 'prática'],
  ['praticas', 'práticas'],
  ['pratico', 'prático'],
  ['praticos', 'práticos'],
  ['experiencia', 'experiência'],
  ['experiencias', 'experiências'],
  ['ciencia', 'ciência'],
  ['ciencias', 'ciências'],
  ['cientifico', 'científico'],
  ['cientifica', 'científica'],
  ['cientificos', 'científicos'],
  ['cientificas', 'científicas'],
  ['analise', 'análise'],
  ['analises', 'análises'],
  ['numero', 'número'],
  ['numeros', 'números'],
  ['conteudo', 'conteúdo'],
  ['conteudos', 'conteúdos'],
  ['necessario', 'necessário'],
  ['necessaria', 'necessária'],
  ['necessarios', 'necessários'],
  ['necessarias', 'necessárias'],
  ['basico', 'básico'],
  ['basica', 'básica'],
  ['basicos', 'básicos'],
  ['basicas', 'básicas'],
  ['saude', 'saúde'],
  ['logica', 'lógica'],
  ['logico', 'lógico'],
  ['fisica', 'física'],
  ['fisico', 'físico'],
  ['automatico', 'automático'],
  ['automatica', 'automática'],
  ['especifico', 'específico'],
  ['especifica', 'específica'],
  ['unico', 'único'],
  ['unica', 'única'],
  ['facil', 'fácil'],
  ['faceis', 'fáceis'],
  ['dificil', 'difícil'],
  ['dificeis', 'difíceis'],
  ['possivel', 'possível'],
  ['possiveis', 'possíveis'],
  ['impossivel', 'impossível'],
  ['impossiveis', 'impossíveis'],
  ['sustentavel', 'sustentável'],
  ['sustentaveis', 'sustentáveis'],
  ['previsivel', 'previsível'],
  ['responsavel', 'responsável'],
  ['responsaveis', 'responsáveis'],
  ['agil', 'ágil'],
  ['ageis', 'ágeis'],
  ['util', 'útil'],
  ['uteis', 'úteis'],
  ['inutil', 'inútil'],
  ['inuteis', 'inúteis'],
  ['habito', 'hábito'],
  ['habitos', 'hábitos'],
  ['periodo', 'período'],
  ['periodos', 'períodos'],
  ['visao', 'visão'],
  ['misao', 'missão'],
  ['funcao', 'função'],
  ['conexao', 'conexão'],
  ['conexoes', 'conexões'],
  ['padrao', 'padrão'],
  ['eletronica', 'eletrônica'],
  ['eletronico', 'eletrônico'],
  ['eletronicos', 'eletrônicos'],
  ['eletrico', 'elétrico'],
  ['eletrica', 'elétrica'],
  ['eletricos', 'elétricos'],
  ['eletricas', 'elétricas'],
  ['mecanica', 'mecânica'],
  ['mecanico', 'mecânico'],
  ['autonomo', 'autônomo'],
  ['autonoma', 'autônoma'],
  ['potencia', 'potência'],
  ['frequencia', 'frequência'],
  ['frequencias', 'frequências'],
  ['resistencia', 'resistência'],
  ['indutancia', 'indutância'],
  ['capacitancia', 'capacitância'],
  ['tolerancia', 'tolerância'],
  ['distancia', 'distância'],
  ['importancia', 'importância'],
  ['tendencia', 'tendência'],
  ['tendencias', 'tendências'],
  ['referencia', 'referência'],
  ['referencias', 'referências'],
  ['criterio', 'critério'],
  ['criterios', 'critérios'],
  ['publico', 'público'],
  ['publica', 'pública'],
  ['publicos', 'públicos'],
  ['publicas', 'públicas']
];

export class ManuscriptAccentRepairEngine {
  /**
   * Corrige problemas de mojibake (dupla decodificação UTF-8)
   */
  public static fixMojibake(text: string): string {
    if (!text) return '';
    let result = text;
    for (const [pattern, replacement] of MOJIBAKE_MAP) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  /**
   * Restaura acentuação em palavras da língua portuguesa preservando a caixa original (maiúsculas/minúsculas)
   */
  public static repairPortugueseAccents(text: string): string {
    if (!text) return '';
    let result = text;

    for (const [plain, accented] of COMMON_ACCENT_REPLACEMENTS) {
      // Regex que busca a palavra exata em limites de palavra
      const regex = new RegExp(`\\b${plain}\\b`, 'gi');
      result = result.replace(regex, (match) => {
        // Se a palavra original estava toda em MAIÚSCULAS
        if (match === match.toUpperCase()) {
          return accented.toUpperCase();
        }
        // Se a primeira letra era maiúscula (Title Case)
        if (match[0] === match[0].toUpperCase()) {
          return accented[0].toUpperCase() + accented.slice(1);
        }
        // Minúscula padrão
        return accented;
      });
    }

    return result;
  }

  /**
   * Executa a reparação completa do manuscrito:
   * 1. Elimina mojibake
   * 2. Restaura acentuação correta
   * 3. Normaliza em Unicode NFC
   */
  public static repairManuscript(text: string): string {
    if (!text) return '';
    const withoutLaTeX = ManuscriptIntegrityEngine.cleanLaTeXResiduals(text);
    const withoutMojibake = this.fixMojibake(withoutLaTeX);
    const withAccents = this.repairPortugueseAccents(withoutMojibake);
    return withAccents.normalize('NFC');
  }

  /**
   * Aplica a reparação em todos os campos de um BookProject KDP
   */
  public static repairBookProject(project: BookProject): BookProject {
    const updated = { ...project };

    if (updated.title) updated.title = this.repairManuscript(updated.title);
    if (updated.subtitle) updated.subtitle = this.repairManuscript(updated.subtitle);
    if (updated.description) updated.description = this.repairManuscript(updated.description);
    if (updated.topic) updated.topic = this.repairManuscript(updated.topic);
    if (updated.notes) updated.notes = this.repairManuscript(updated.notes);

    if (updated.kdpChapters && Array.isArray(updated.kdpChapters)) {
      updated.kdpChapters = updated.kdpChapters.map((ch: any) => ({
        ...ch,
        title: this.repairManuscript(ch.title || ch.titulo || ''),
        summary: ch.summary ? this.repairManuscript(ch.summary) : '',
        content: ch.content ? this.repairManuscript(ch.content) : '',
        prose: ch.prose ? this.repairManuscript(ch.prose) : '',
        texto: ch.texto ? this.repairManuscript(ch.texto) : '',
        auditNotes: ch.auditNotes?.map((n: string) => this.repairManuscript(n)) || []
      }));
    }

    return updated;
  }
}
