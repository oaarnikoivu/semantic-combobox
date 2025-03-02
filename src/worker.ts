import {
  DataArray,
  FeatureExtractionPipeline,
  pipeline,
  cos_sim,
} from "@huggingface/transformers";
import {
  WorkerMessage,
  WorkerModelLoadedMessage,
  WorkerinitialEmbeddingsComputedMessage,
  WorkerSimilarityResultsMessage,
  WorkerErrorMessage,
  SimilarityResult,
} from "./types";

let model: FeatureExtractionPipeline;
let sentenceEmbeddings: DataArray[];

function sendModelLoaded(): void {
  const message: WorkerModelLoadedMessage = {
    type: "modelLoaded",
  };
  self.postMessage(message);
}

function sendinitialEmbeddingsComputed(embeddings: DataArray[]): void {
  const message: WorkerinitialEmbeddingsComputedMessage = {
    type: "initialEmbeddingsComputed",
    data: embeddings,
  };
  self.postMessage(message);
}

function sendSimilarityResults(results: SimilarityResult[]): void {
  const message: WorkerSimilarityResultsMessage = {
    type: "similarityResults",
    data: { results },
  };
  self.postMessage(message);
}

function sendError(errorMessage: string, error: unknown): void {
  const message: WorkerErrorMessage = {
    type: "error",
    data: {
      message: errorMessage,
      error: String(error),
    },
  };
  self.postMessage(message);
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

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  try {
    const message = event.data;
    const type = message.type;

    if (type === "init") {
      await initModel();
    } else if (type === "initializeEmbeddings") {
      if ("data" in message && message.data && "sentences" in message.data) {
        const { sentences } = message.data;
        const embeddings: DataArray[] = [];

        for (const sentence of sentences) {
          const embedding = await model(sentence, {
            pooling: "mean",
            normalize: true,
          });
          embeddings.push(embedding.data);
        }

        sentenceEmbeddings = embeddings;
        sendinitialEmbeddingsComputed(embeddings);
      }
    } else if (type === "computeSimilarity") {
      if ("data" in message && message.data && "query" in message.data) {
        const { query } = message.data;
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
            return {
              index,
              similarity,
            };
          }
        );

        const topResults = similarities
          .filter((item) => item.similarity >= 0.7)
          .sort((a, b) => b.similarity - a.similarity);

        sendSimilarityResults(topResults);
      }
    }
  } catch (error) {
    sendError("Error in worker", error);
  }
};

initModel();
