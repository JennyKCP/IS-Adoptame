import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatusPage from "@/components/StatusPage";
import { getCachedSession } from "@/app/lib/auth/session";
import { can } from "@/app/lib/auth/can";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { toActor } from "@/app/lib/auth/actor";
import { toolNamesForActor } from "@/app/lib/ai/registry";
import { examplesForTools } from "@/app/lib/ai/chat-examples";
import { AiChat } from "@/components/dashboard/ai-chat/ai-chat";


const Page = async () => {
  const session = await getCachedSession();

  if (!session?.user || !can(session.user.role, AppPermissions.AI_CHAT_USE)) {
    return (
      <StatusPage
        type="accessDenied"
        redirectUrl="/dashboard"
        buttonGoTo="Dashboard"
      />
    );
  }

  
  
  
  
  const availableTools = toolNamesForActor(toActor(session.user));

  return (
    
    <div className="flex h-[calc(100dvh-var(--header-height)-2rem)] min-h-0 flex-col md:h-[calc(100dvh-var(--header-height)-3rem)]">
      <Card className="@container/card flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0">
          <CardTitle className="@[650px]/card:text-xl">AI Assistant</CardTitle>
          <CardDescription>
            Ask about animals, tasks, and what needs attention today.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <AiChat
            examples={examplesForTools(availableTools)}
            availableTools={availableTools}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
