import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: function LetterLlama() {
    return <iframe className="mailbox-frame" title="Letter Llama" src="/Letter-Llama.html" />;
  },
});
