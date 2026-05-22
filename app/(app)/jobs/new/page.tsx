/** /jobs/new 진입 시 step-1으로 리다이렉트. */
import { redirect } from "next/navigation";

export default function NewJobIndex() {
  redirect("/jobs/new/step-1-category");
}
