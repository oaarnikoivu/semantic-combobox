import {
  DataArray,
  FeatureExtractionPipeline,
  pipeline,
  cos_sim,
} from "@huggingface/transformers";
import { SimilarityResult, WorkerMessageType, WorkerMessage } from "./types";

let model: FeatureExtractionPipeline;
let sentenceEmbeddings: DataArray[];

function sendModelLoaded(): void {
  self.postMessage({ type: WorkerMessageType.ModelLoaded });
}

function sendinitialEmbeddingsComputed(embeddings: DataArray[]): void {
  self.postMessage({
    type: WorkerMessageType.InitialEmbeddingsComputed,
    data: embeddings,
  });
}

function sendSimilarityResults(
  results: SimilarityResult[],
  query: string
): void {
  self.postMessage({
    type: WorkerMessageType.SimilarityResults,
    data: { results, query },
  });
}

function sendError(errorMessage: string, error: unknown): void {
  self.postMessage({
    type: WorkerMessageType.Error,
    data: {
      message: errorMessage,
      error: String(error),
    },
  });
}

async function initializeEmbeddings(sentences: string[]): Promise<DataArray[]> {
  const embeddings: DataArray[] = [];

  for (const sentence of sentences) {
    const embedding = await model(sentence, {
      pooling: "mean",
      normalize: true,
    });
    embeddings.push(embedding.data);
  }

  return embeddings;
}

async function initModel() {
  try {
    model = await pipeline("feature-extraction", "Xenova/bert-base-uncased", {
      device: "wasm",
      dtype: "q8",
      revision: "default",
    });

    sendModelLoaded();
  } catch (error) {
    sendError("Failed to load model", error);
  }
}

async function computeSimilarity(
  query: string,
  sentenceEmbeddings: DataArray[]
): Promise<SimilarityResult[]> {
  const queryEmbedding = await model(query, {
    pooling: "mean",
    normalize: true,
  });
  const queryVector = queryEmbedding.data;

  const similarities: SimilarityResult[] = sentenceEmbeddings.map(
    (sentenceEmbedding, index) => {
      const similarity = cos_sim(
        queryVector as number[],
        sentenceEmbedding as number[]
      );
      return { index, similarity };
    }
  );

  return similarities;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  try {
    const message = event.data;
    const type = message.type;

    switch (type) {
      case WorkerMessageType.Init:
        await initModel();
        break;
      case WorkerMessageType.InitializeEmbeddings:
        if (message.data?.sentences) {
          const { sentences } = message.data;
          sentenceEmbeddings = await initializeEmbeddings(sentences);
          sendinitialEmbeddingsComputed(sentenceEmbeddings);
        }
        break;
      case WorkerMessageType.ComputeSimilarity:
        if (message.data?.query) {
          const { query } = message.data;
          const similarities = await computeSimilarity(
            query,
            sentenceEmbeddings
          );
          const topResults = similarities
            .filter((item) => item.similarity >= 0.7)
            .sort((a, b) => b.similarity - a.similarity);

          sendSimilarityResults(topResults, query);
        }
        break;
      case WorkerMessageType.Error:
        sendError(message.data.message, message.data.error);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    sendError("Error in worker", error);
  }
};

initModel();
