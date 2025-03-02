import { MAX_CACHE_SIZE, SENTENCES } from "@/constants";
import {
  SimilarityResult,
  WorkerComputeSimilarityMessage,
  WorkerinitializeEmbeddingsMessage,
  WorkerMessage,
  WorkerMessageType,
} from "@/types";
import { useEffect, useRef, useState } from "react";

function sendinitializeEmbeddingsMessage(
  worker: Worker,
  sentences: string[]
): void {
  const message: WorkerinitializeEmbeddingsMessage = {
    type: WorkerMessageType.InitializeEmbeddings,
    data: { sentences },
  };
  worker.postMessage(message);
}

function sendComputeSimilarityMessage(worker: Worker, query: string): void {
  const message: WorkerComputeSimilarityMessage = {
    type: WorkerMessageType.ComputeSimilarity,
    data: { query },
  };
  worker.postMessage(message);
}

export default function useSemanticSearch() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState(SENTENCES);

  const workerRef = useRef<Worker | null>(null);
  const similarityCache = useRef<Record<string, string[]>>({});

  const addToCache = (query: string, results: string[]) => {
    if (
      !(query in similarityCache.current) &&
      Object.keys(similarityCache.current).length >= MAX_CACHE_SIZE
    ) {
      similarityCache.current = {};
    }
    similarityCache.current[query] = results;
  };

  const computeSimilarity = async (query: string) => {
    if (similarityCache.current[query]) {
      setResults(similarityCache.current[query]);
      return;
    }

    if (workerRef.current) {
      sendComputeSimilarityMessage(workerRef.current, query);
    }
  };

  useEffect(() => {
    workerRef.current = new Worker(new URL("../worker.ts", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      const type = message.type;

      switch (type) {
        case WorkerMessageType.ModelLoaded:
          if (workerRef.current) {
            sendinitializeEmbeddingsMessage(workerRef.current, SENTENCES);
          }
          break;
        case WorkerMessageType.InitialEmbeddingsComputed:
          setLoading(false);
          break;
        case WorkerMessageType.SimilarityResults:
          if (message.data?.results) {
            const { results: similarityResults } = message.data;
            const resultSentences = similarityResults.map(
              (r: SimilarityResult) => SENTENCES[r.index]
            );

            if ("query" in message.data && message.data.query) {
              addToCache(message.data.query, resultSentences);
            }

            setResults(resultSentences);
          }
          break;
        case WorkerMessageType.Error:
          setError(`${message.data.message}: ${message.data.error}`);
          setLoading(false);
          break;
        default:
          throw new Error(`Unknown message type: ${type}`);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return { loading, error, results, setResults, computeSimilarity };
}
