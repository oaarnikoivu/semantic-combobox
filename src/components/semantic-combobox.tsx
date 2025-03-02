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
import { useEffect, useRef, useState } from "react";
import { MAX_CACHE_SIZE, SENTENCES } from "@/constants";

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
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(SENTENCES);

  const workerRef = useRef<Worker | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
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
  }, []);

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setResults(SENTENCES);
      setInput("");
    }
  };

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
      setResults(SENTENCES);
    }
  };

  const handleSelect = (selectedValue: string) => {
    setValue(selectedValue === value ? "" : selectedValue);
    setInput("");
    setResults(SENTENCES);
    setOpen(false);
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
    <Popover open={open} onOpenChange={handleOpenChange}>
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
            ? SENTENCES.find((s) => s === value)
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
                <CommandItem key={s} value={s} onSelect={handleSelect}>
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
