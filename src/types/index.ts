export type WorkerMessageType =
  | "init"
  | "modelLoaded"
  | "initializeEmbeddings"
  | "initialEmbeddingsComputed"
  | "computeSimilarity"
  | "similarityResults"
  | "error";

export interface SimilarityResult {
  index: number;
  similarity: number;
}

export interface WorkerInitMessage {
  type: "init";
}

export interface WorkerModelLoadedMessage {
  type: "modelLoaded";
}

export interface WorkerinitializeEmbeddingsMessage {
  type: "initializeEmbeddings";
  data: {
    sentences: string[];
  };
}

export interface WorkerinitialEmbeddingsComputedMessage {
  type: "initialEmbeddingsComputed";
  data: unknown;
}

export interface WorkerComputeSimilarityMessage {
  type: "computeSimilarity";
  data: {
    query: string;
  };
}

export interface WorkerSimilarityResultsMessage {
  type: "similarityResults";
  data: {
    results: SimilarityResult[];
  };
}

export interface WorkerErrorMessage {
  type: "error";
  data: {
    message: string;
    error: string;
  };
}

export type WorkerMessage =
  | WorkerInitMessage
  | WorkerModelLoadedMessage
  | WorkerinitializeEmbeddingsMessage
  | WorkerinitialEmbeddingsComputedMessage
  | WorkerComputeSimilarityMessage
  | WorkerSimilarityResultsMessage
  | WorkerErrorMessage;
