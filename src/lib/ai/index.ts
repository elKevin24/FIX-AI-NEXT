export { AIServiceBase } from './ai-service.base';
export type { GeminiModel, AIServiceConfig, TenantAIContext } from './ai-service.base';

export { AIDiagnosticAssistant } from './ai-diagnostic-assistant';
export type { 
  DiagnosticInput, 
  SuggestedPart, 
  LaborEstimate, 
  SafetyChecklist, 
  DiagnosticResult 
} from './ai-diagnostic-assistant';

export { AISmartQuoteGenerator } from './ai-smart-quote-generator';
export type { 
  QuoteInput, 
  ClientExplanation, 
  QuoteBreakdown, 
  SmartQuoteResult 
} from './ai-smart-quote-generator';

export { AISemanticSearchService } from './ai-semantic-search';
export type { 
  PastRepairSearch, 
  SimilarTicket, 
  SemanticSearchResult 
} from './ai-semantic-search';
