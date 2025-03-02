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
import { useRef, useState } from "react";
import useSemanticSearch from "@/hooks/use-semantic-search";
import { SENTENCES } from "@/constants";

export function SemanticCombobox() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [input, setInput] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const { loading, results, setResults, computeSimilarity } =
    useSemanticSearch();

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
              {results.map((result) => (
                <CommandItem
                  key={result}
                  value={result}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === result ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {result}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
