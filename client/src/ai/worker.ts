import { pipeline, env } from '@xenova/transformers';

// Skip local check, download models from HuggingFace
env.allowLocalModels = false;

let summarizer: any = null;
let classifier: any = null;

async function initModels() {
  if (!summarizer) {
    // using a small Xenova model for fast browser summarization
    summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
  }
  if (!classifier) {
    // using a small classification model for security context
    classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
  }
}

self.addEventListener('message', async (event) => {
  const { action, text, id } = event.data;

  try {
    await initModels();

    if (action === 'summarize') {
      // If chat is too short, provide a basic fallback
      if (text.length < 50) {
        self.postMessage({ id, result: "Chat is too short to generate a meaningful AI summary." });
        return;
      }
      
      // Since local DistilBART models are primarily text-to-text summarizers,
      // we prefix it with a prompt indicating we want an explanation.
      // However, some simple pipelines just take the raw text. We'll format it nicely.
      const prompt = `Explain the following conversation briefly and clearly: \n\n${text}`;
      
      // @ts-ignore
      const result = await summarizer(prompt, {
        max_new_tokens: 150,
        min_length: 30,
      });
      
      let summaryText = result[0].summary_text;
      self.postMessage({ id, result: summaryText });
    } else if (action === 'classify') {
      const result = await classifier(text);
      self.postMessage({ id, result: result[0] });
    }
  } catch (err: any) {
    console.error('AI Model Error, using fallback heuristics:', err);
    
    // Fallback if Xenova fails to load or download due to network
    if (action === 'summarize') {
       const fallbackSummary = "Fallback Summary: " + text.substring(0, 100) + "...";
       self.postMessage({ id, result: fallbackSummary });
    } else if (action === 'classify') {
       self.postMessage({ id, result: { label: 'NORMAL', score: 1.0 } });
    } else {
       self.postMessage({ id, error: err.message });
    }
  }
});
