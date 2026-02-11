import { GoogleGenAI, Type } from "@google/genai";
import { ColumnType, Task, AIAnalysisResult, ChatMessage } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

export const analyzeProjectInput = async (
  input: string,
  history: ChatMessage[],
  currentDate: string
): Promise<AIAnalysisResult> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  // Format history for the prompt
  const conversationHistory = history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n');

  const prompt = `
    Você é um especialista em Gestão de Projetos com IA chamado "Agente SAAD".
    Data Atual: ${currentDate}

    **OBJETIVO**: Gerenciar um quadro de projetos baseado na Entrada do Usuário e no Histórico do Chat.

    **REGRAS CRÍTICAS**:
    1. **Cronograma Primeiro**: Você NÃO PODE criar tarefas até que um cronograma (Duração, Prazo ou Datas de Início/Fim) seja estabelecido.
      Os cards de tarefas (tasks) DEVEM conter o texto COMPLETO da Regra de Negócio fornecida, sem resumir, sem parafrasear e sem encurtar. 
      - O campo "title" deve ser o nome ou identificador da regra (ex: "RN - 001.1 Tipo de Cadastro").
      - O campo "description" deve conter a regra na ÍNTEGRA como descrita pelo usuário.
      
      Exemplo:
      Se o usuário disser: "RN - 001.1 Tipo de Cadastro: Na Etapa 1 (Básico), o usuário deve selecionar a categoria do produto. Ao selecionar 'Combo', o sistema deve habilitar a aba 'Itens e Preços'."
      O JSON deve ser: {"code": "RN - 001.1", "title": "Tipo de Cadastro", "description": "Na Etapa 1 (Básico), o usuário deve selecionar a categoria do produto. Ao selecionar 'Combo', o sistema deve habilitar a aba 'Itens e Preços'.", "category": "Cadastro"}

      REGRAS ADICIONAIS:
      - NUNCA use reticências (...) ou cortes.
      - Se a regra for longa, capture TUDO.
      - Se o usuário passar datas, extraia para o objeto "timeline".
       - Se o usuário fornecer Regras de Negócio (RNs) mas NENHUM cronograma for encontrado no histórico ou na entrada atual:
         - **Ação**: Pergunte ao usuário sobre o cronograma (data de início, duração ou prazo final).
         - **Saída**: Retorne um array 'newTasks' vazio.
    
    2. **Criação de Tarefas**:
       - Uma vez que o cronograma é conhecido (ou se fornecido na mensagem atual junto com RNs), você deve gerar tarefas a partir das Regras de Negócio (RNs).
       - **Fonte**: Procure por RNs na *entrada atual*. Se a entrada atual for apenas uma atualização de cronograma (ex: "4 semanas"), olhe para o *Histórico do Chat* para encontrar as RNs fornecidas anteriormente e gere as tarefas a partir delas agora.
       - **Extração Estrita**: 
        - Regras Gerais de Negócio
          RN - 001 Definição do Tipo de Produto
        RN - 001.1 Tipo de Cadastro: Na Etapa 1 (Básico), o usuário deve selecionar a categoria do produto. Ao selecionar "Combo", o sistema deve habilitar a aba "Itens e Preços".
        RN - 001.2 Natureza do Combo: Dentro da aba "Itens e Preços", o usuário poderá misturar dois tipos de entrada: Itens Fixos (produto simples) e Etapas de Montagem (produtos com montagem).]
        As informações serão enviadas como no exemplo acima no chat, a IA deve entender que RN - 001 é o título e RN - 001.1 e RN 001.2 são as tarefas que serão criadas com o exato texto da regra, por exemplo, a tarefa criada vai ser: RN - 001.1 Tipo de Cadastro: Na Etapa 1 (Básico), o usuário deve selecionar a categoria do produto. Ao selecionar "Combo", o sistema deve habilitar a aba "Itens e Preços".
         - Copie o 'código' (ex: "RN - 001.1"), 'título' e 'descrição' **EXATAMENTE** como aparecem no texto. Não resuma.
         - Formato: "RN - 001 Título" -> Code: "RN - 001", Title: "Título", Category: "RN - 001 Título".
         - Formato: "RN - 001.1 Subtarefa" -> Code: "RN - 001.1", Title: "Subtarefa", Category: "RN - 001 Título" (infira a categoria pai se possível, caso contrário use o próprio código).
         - O usuário solicitou explicitamente: "As tarefas devem ter o mesmo nome da RN, com códigos e descrições idênticas."

    3. **Cálculo do Cronograma e Squads**:
       - Calcule 'totalWeeks' (total de semanas), 'currentWeek' (semana atual), 'startDate' (data de início), 'endDate' (data final).
       - **Squads**: Cada tarefa DEVE ser atribuída a um squad: 'UX/UI', 'Backend', 'Frontend' ou 'Geral'.
       - Lógica: Se apenas a duração (ex: "4 semanas") for dada, assuma Data de Início = Hoje.
       - Se 'prazo final' for dado, conte para trás.
       - 'currentWeek' = (Hoje - Data de Início) em semanas + 1.

    4. **Resposta**:
       - Forneça uma resposta natural e útil ('reply') ao usuário explicando o que você fez (ex: "Defini o cronograma para 4 semanas e criei 5 tarefas a partir das RNs fornecidas anteriormente.").
       - Gere 2 insights estratégicos ('insights') em português se existirem tarefas.

    **Contexto de Entrada**:
    Histórico do Chat:
    ${conversationHistory}
    
    Entrada Atual do Usuário:
    ${input}
    
    Retorne estritamente JSON correspondendo ao esquema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "Sua resposta conversacional para o usuário em Português." },
            newTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  squad: {
                    type: Type.STRING,
                    enum: ['UX/UI', 'Backend', 'Frontend', 'Geral'],
                    description: "Atribua a tarefa ao squad mais relevante."
                  },
                },
                required: ['code', 'title', 'category', 'squad']
              }
            },
            timeline: {
              type: Type.OBJECT,
              properties: {
                startDate: { type: Type.STRING, description: "ISO Date String" },
                endDate: { type: Type.STRING, description: "ISO Date String" },
                totalWeeks: { type: Type.INTEGER },
                currentWeek: { type: Type.INTEGER },
                progressMessage: { type: Type.STRING }
              }
            },
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta da IA");

    const data = JSON.parse(text);

    // Map raw AI tasks to Application Task type
    const mappedTasks: Task[] = (data.newTasks || []).map((t: any) => ({
      id: crypto.randomUUID(),
      code: t.code,
      title: t.title,
      category: t.category,
      description: t.description || '',
      column: ColumnType.TODO,
      squad: t.squad || 'Geral'
    }));

    return {
      tasks: mappedTasks,
      timeline: data.timeline,
      insights: data.insights || [],
      reply: data.reply || "Processado."
    };

  } catch (error) {
    console.error("Erro na análise da IA:", error);
    return {
      tasks: [],
      insights: [],
      timeline: undefined,
      reply: "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente."
    };
  }
};