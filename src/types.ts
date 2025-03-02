export enum WorkerMessageType {
  Init = "init",
  ModelLoaded = "modelLoaded",
  InitializeEmbeddings = "initializeEmbeddings",
  InitialEmbeddingsComputed = "initialEmbeddingsComputed",
  ComputeSimilarity = "computeSimilarity",
  SimilarityResults = "similarityResults",
  Error = "error",
}

export interface SimilarityResult {
  index: number;
  similarity: number;
}

export interface WorkerInitMessage {
  type: WorkerMessageType.Init;
}

export interface WorkerModelLoadedMessage {
  type: WorkerMessageType.ModelLoaded;
}

export interface WorkerinitializeEmbeddingsMessage {
  type: WorkerMessageType.InitializeEmbeddings;
  data: {
    sentences: string[];
  };
}

export interface WorkerinitialEmbeddingsComputedMessage {
  type: WorkerMessageType.InitialEmbeddingsComputed;
  data: unknown;
}

export interface WorkerComputeSimilarityMessage {
  type: WorkerMessageType.ComputeSimilarity;
  data: {
    query: string;
  };
}

export interface WorkerSimilarityResultsMessage {
  type: WorkerMessageType.SimilarityResults;
  data: {
    results: SimilarityResult[];
    query: string;
  };
}

export interface WorkerErrorMessage {
  type: WorkerMessageType.Error;
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
