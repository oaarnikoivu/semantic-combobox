"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  WorkerMessage,
  WorkerinitializeEmbeddingsMessage,
  WorkerComputeSimilarityMessage,
  SimilarityResult,
} from "@/types";

const sentences = [
  "The quick brown fox jumps over the lazy dog",
  "A fast, dark-colored fox leaps over a sleep canine",
  "A journey of a thousand miles begins with a single step",
  "To be or not to be, that is the question",
  "All that glitters is not gold",
  "The early bird catches the worm",
  "Life is what happens when you're busy making other plans",
  "In the middle of difficulty lies opportunity",
  "Knowledge is power, but enthusiasm pulls the switch",
  "The only way to do great work is to love what you do",
  "Happiness is not something ready-made, it comes from your own actions",
  "The best time to plant a tree was 20 years ago, the second best time is now",
  "Success is not final, failure is not fatal: it is the courage to continue that counts",
  "You miss 100% of the shots you don't take",
  "It does not matter how slowly you go as long as you do not stop",
  "The future belongs to those who believe in the beauty of their dreams",
  "Believe you can and you're halfway there",
  "The purpose of our lives is to be happy",
  "Don't count the days, make the days count",
  "The only impossible journey is the one you never begin",
  "The best revenge is massive success",
];

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

export function SemanticCombobox() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [results, setResults] = React.useState(sentences);

  const workerRef = React.useRef<Worker | null>(null);
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const similarityCache = React.useRef<Record<string, string[]>>({});

  React.useEffect(() => {
    workerRef.current = new Worker(new URL("../worker.ts", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      const type = message.type;

      if (type === "modelLoaded") {
        if (workerRef.current) {
          sendinitializeEmbeddingsMessage(workerRef.current, sentences);
        }
      } else if (type === "initialEmbeddingsComputed") {
        setLoading(false);
      } else if (type === "similarityResults") {
        if ("data" in message && message.data && "results" in message.data) {
          const { results: similarityResults } = message.data;
          const resultSentences = similarityResults.map(
            (r: SimilarityResult) => sentences[r.index]
          );

          if (input) {
            similarityCache.current[input] = resultSentences;
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
          console.error(
            "Worker error:",
            message.data.message,
            message.data.error
          );
          setLoading(false);
        }
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValueChange = (value: string) => {
    setInput(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (value.length > 0) {
      const debounceTime = value.length > 5 ? 500 : 300;
      debounceTimeout.current = setTimeout(() => {
        computeSimilarity(value);
      }, debounceTime);
    } else {
      setResults(sentences);
    }
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

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setResults(sentences);
          setInput("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[400px] justify-between"
        >
          {loading
            ? "Loading..."
            : value
            ? sentences.find((s) => s === value)
            : "Select sentence..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search sentences..."
            value={input}
            onValueChange={handleValueChange}
          />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {results.map((s) => (
                <CommandItem
                  key={s}
                  value={s}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setInput("");
                    setResults(sentences);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === s ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
