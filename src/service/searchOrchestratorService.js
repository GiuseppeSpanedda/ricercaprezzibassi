export class SearchOrchestratorService {
  constructor(searchAgentService, summaryAgentService) {
    this.searchAgentService = searchAgentService;
    this.summaryAgentService = summaryAgentService;
  }

  async execute(request) {
    const searchResult = await this.searchAgentService.search(request);
    const summary = await this.summaryAgentService.summarize(searchResult.query, searchResult.results);

    return {
      query: searchResult.query,
      summary,
      results: searchResult.results,
      warnings: searchResult.warnings
    };
  }
}
