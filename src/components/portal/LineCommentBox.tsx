import { postMessage } from "@/modules/negotiation/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function LineCommentBox({ quoteCode, lineId }: { quoteCode: string; lineId: number }) {
  return <details className="line-comment"><summary>Request a change</summary><form action={postMessage}><input type="hidden" name="quoteCode" value={quoteCode}/><input type="hidden" name="lineId" value={lineId}/><Textarea name="text" required minLength={2} placeholder="Tell the sales team what should change"/><Button variant="outline" size="sm">Send request</Button></form></details>;
}
