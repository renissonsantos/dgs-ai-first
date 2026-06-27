// Round 1 — gerado pelo agente lendo APENAS o AGENTS.md v1.
// (Snapshot de evidência; não é o código final do projeto.)
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { OpenAIClient, AzureKeyCredential } from "@azure/openai";
import { SearchClient } from "@azure/search-documents";

const QuerySchema = z.object({
  question: z.string().min(1),
});

class ValidationError extends Error {}

export async function query(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const parsed = QuerySchema.parse(body);

    // monta o RAG
    const search = new SearchClient(
      process.env.SEARCH_ENDPOINT!,
      "novatech-index",
      new AzureKeyCredential(process.env.SEARCH_KEY!)
    );
    const results = await search.search(parsed.question, { top: 5 });
    const chunks: string[] = [];
    for await (const r of results.results) {
      chunks.push((r.document as any).content);
    }

    const openai = new OpenAIClient(
      process.env.OPENAI_ENDPOINT!,
      new AzureKeyCredential(process.env.OPENAI_KEY!)
    );
    const completion = await openai.getChatCompletions("gpt-4o", [
      { role: "system", content: "Você é o assistente da NovaTech." },
      { role: "user", content: parsed.question + "\n\n" + chunks.join("\n") },
    ]);

    const answer = completion.choices[0].message?.content;
    console.log("query respondida:", parsed.question);

    return { jsonBody: { answer } };
  } catch (err) {
    console.error(err);
    return { status: 500, jsonBody: { error: "erro interno" } };
  }
}

app.http("query", {
  methods: ["POST"],
  authLevel: "function",
  handler: query,
});
