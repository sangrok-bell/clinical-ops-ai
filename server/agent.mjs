// server/agent.mjs — reusable Anthropic tool-use AGENT LOOP harness.
// Drives a ReAct-style loop: the model calls grounding tools (toolImpls) to gather
// evidence, then ends by calling the special `submit_verdict` tool. We capture a
// trace of every tool call so the UI can show *why* the agent decided what it did.
//
// Contract:
//   runAgent({ client, model, system, user, tools, toolImpls, maxSteps=6, max_tokens=700 })
//   -> { final, trace }   where `final` is the input object of submit_verdict (or null).
//
// `tools` is the Anthropic tool[] array (must include a tool named "submit_verdict").
// `toolImpls` maps every NON-terminal tool name -> (input) => result (sync or async).
export async function runAgent({ client, model, system, user, tools, toolImpls, maxSteps = 6, max_tokens = 700 }) {
  const messages = [{ role: "user", content: user }];
  const trace = [];

  for (let step = 0; step < maxSteps; step++) {
    const resp = await client.messages.create({ model, max_tokens, system, tools, messages });

    const toolUses = (resp.content ?? []).filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) {
      const text = (resp.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
      return { final: null, text, trace };
    }

    // Record the assistant's turn (so the next call sees its own tool_use blocks).
    messages.push({ role: "assistant", content: resp.content });

    let final = null;
    const results = [];
    for (const tu of toolUses) {
      if (tu.name === "submit_verdict") {
        final = tu.input;
        results.push({ type: "tool_result", tool_use_id: tu.id, content: "ok" });
        continue;
      }
      let out;
      try {
        const impl = toolImpls[tu.name];
        out = impl ? await impl(tu.input ?? {}) : { error: `unknown tool: ${tu.name}` };
      } catch (e) {
        out = { error: String(e) };
      }
      trace.push({ tool: tu.name, summary: JSON.stringify(out).slice(0, 200) });
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
    }

    messages.push({ role: "user", content: results });
    if (final) return { final, trace };
  }

  // maxSteps exhausted without a verdict.
  return { final: null, trace };
}
