import { MAX_CACHE_SIZE, SENTENCES } from "@/constants";
import {
  SimilarityResult,
  WorkerComputeSimilarityMessage,
  WorkerinitializeEmbeddingsMessage,
  WorkerMessage,
} from "@/types";
import { useEffect, useRef, useState } from "react";

function sendinitializeEmbeddingsMessage(
  worker: Worker,
  sentences: string[]
): void {
  const message: WorkerinitializeEmbeddingsMessage = {
    type: "initializeEmbeddings",
    data: { sentences },
  };
  worker.postMessage(message);
}

function sendComputeSimilarityMessage(worker: Worker, query: string): void {
  const message: WorkerComputeSimilarityMessage = {
    type: "computeSimilarity",
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

      if (type === "modelLoaded") {
        if (workerRef.current) {
          sendinitializeEmbeddingsMessage(workerRef.current, SENTENCES);
        }
      } else if (type === "initialEmbeddingsComputed") {
        setLoading(false);
      } else if (type === "similarityResults") {
        if ("data" in message && message.data && "results" in message.data) {
          const { results: similarityResults } = message.data;
          const resultSentences = similarityResults.map(
            (r: SimilarityResult) => SENTENCES[r.index]
          );

          if ("query" in message.data && message.data.query) {
            addToCache(message.data.query, resultSentences);
          }

          setResults(resultSentences);
        }
      } else if (type === "error") {
        if (
          "data" in message &&
          message.data &&
          "message" in message.data &&
          "error" in message.data
        ) {
          const errorMessage = `${message.data.message}: ${message.data.error}`;
          console.error("Worker error:", errorMessage);
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return { loading, error, results, setResults, computeSimilarity };
}
