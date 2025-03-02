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
import { cos_sim, DataArray, pipeline } from "@huggingface/transformers";

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

const model = await pipeline("feature-extraction", "Xenova/bert-base-uncased", {
  device: "wasm",
  dtype: "q8",
  revision: "default",
});

let precomputedEmbeddings: DataArray[] = [];
(async () => {
  for (const sentence of sentences) {
    const embedding = await model(sentence, {
      pooling: "mean",
      normalize: true,
    });
    precomputedEmbeddings.push(embedding.data);
  }
})();

export function ComboboxDemo() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [input, setInput] = React.useState("");
  const [sentenceEmbeddings, setSentenceEmbeddings] = React.useState<
    DataArray[]
  >([]);
  const [results, setResults] = React.useState(sentences);

  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const similarityCache = React.useRef<Record<string, string[]>>({});

  React.useEffect(() => {
    if (precomputedEmbeddings.length === sentences.length) {
      setSentenceEmbeddings(precomputedEmbeddings);
    } else {
      const initializeEmbeddings = async () => {
        const embeddings: DataArray[] = [];
        for (const sentence of sentences) {
          const embedding = await model(sentence, {
            pooling: "mean",
            normalize: true,
          });
          embeddings.push(embedding.data);
        }
        setSentenceEmbeddings(embeddings);
        precomputedEmbeddings = embeddings;
      };
      initializeEmbeddings();
    }
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

    const queryEmbedding = await model(query, {
      pooling: "mean",
      normalize: true,
    });

    const queryVector = queryEmbedding.data;

    const similarities = sentenceEmbeddings.map((sentenceEmbedding, index) => {
      const similarity = cos_sim(
        queryVector as number[],
        sentenceEmbedding as number[]
      );
      return {
        sentence: sentences[index],
        similarity,
      };
    });

    const sortedSimilarities = similarities.sort(
      (a, b) => b.similarity - a.similarity
    );

    const topResults = sortedSimilarities.slice(0, 5);
    const resultSentences = topResults.map((s) => s.sentence);

    similarityCache.current[query] = resultSentences;
    setResults(resultSentences);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[400px] justify-between"
        >
          {value ? sentences.find((s) => s === value) : "Select sentence..."}
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
