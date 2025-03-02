# Semantic Combobox

Using embeddings from a pre-trained language model to provide semantic search capabilities in a combobox interface, directly in the browser.

## How It Works

1. The application loads a BERT model in a Web Worker
2. Sentences are converted to vector embeddings when the app initializes
3. As you type in the search box, your query is converted to an embedding
4. The app computes cosine similarity between your query and all sentences
5. Results are sorted by similarity and displayed in real-time

## Project Structure

- `src/components/semantic-combobox.tsx`: Main component with UI logic
- `src/worker.ts`: Web Worker for handling similarity search
- `src/types.ts`: Shared type definitions
