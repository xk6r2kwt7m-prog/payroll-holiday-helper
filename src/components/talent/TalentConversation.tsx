import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, UserCheck, Calendar, ClipboardCheck, FileText, XCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useConversationMessages, useSendMessage, useMarkMessagesRead } from "@/hooks/useTalentConversations";
import { useUpdateApplicationStatus } from "@/hooks/useVacancies";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TalentConversationProps {
  conversationId: string;
  otherPartyName: string;
  vacancyTitle?: string | null;
  applicationId?: string | null;
  applicationStatus?: string;
  senderType: "employer" | "worker";
  onBack: () => void;
}

const QUICK_ACTIONS = [
  { label: "Interview", icon: Calendar, type: "interview_invite", message: "We'd like to invite you for an interview. When are you available?", status: "interviewing" },
  { label: "Trial Shift", icon: ClipboardCheck, type: "trial_invite", message: "We'd like to offer you a trial shift. Are you available this week?", status: "trial" },
  { label: "Docs", icon: FileText, type: "doc_request", message: "Could you please share your right to work documents?" },
  { label: "Hire", icon: UserCheck, type: "offer", message: "We'd like to offer you this position! Please let us know if you'd like to accept.", status: "hired" },
  { label: "Reject", icon: XCircle, type: "rejection", message: "Thank you for your interest. Unfortunately, we've decided to move forward with other candidates.", status: "rejected" },
  { label: "Keep Warm", icon: Heart, type: "keep_warm", message: "We don't have an opening right now, but we'd love to keep you in mind for future opportunities." },
];

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  interview_invite: "📅 Interview Invite",
  trial_invite: "📋 Trial Shift Invite",
  doc_request: "📄 Document Request",
  offer: "🎉 Job Offer",
  rejection: "Outcome Update",
  keep_warm: "💛 Talent Bench",
  text: "",
};

export function TalentConversation({
  conversationId,
  otherPartyName,
  vacancyTitle,
  applicationId,
  applicationStatus,
  senderType,
  onBack,
}: TalentConversationProps) {
  const { data: messages = [], isLoading } = useConversationMessages(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();
  const updateStatus = useUpdateApplicationStatus();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark messages as read on open
  useEffect(() => {
    if (conversationId) {
      markRead.mutate({
        conversationId,
        senderType: senderType === "employer" ? "worker" : "employer",
      });
    }
  }, [conversationId]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text) return;
    await sendMessage.mutateAsync({
      conversation_id: conversationId,
      message_text: text,
      sender_type: senderType,
    });
    setNewMessage("");
  };

  const handleQuickAction = async (action: typeof QUICK_ACTIONS[0]) => {
    await sendMessage.mutateAsync({
      conversation_id: conversationId,
      message_text: action.message,
      message_type: action.type,
      sender_type: senderType,
      metadata: { action_type: action.type },
    });
    // Update application status if applicable
    if (action.status && applicationId) {
      await updateStatus.mutateAsync({ id: applicationId, status: action.status });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{otherPartyName}</p>
          {vacancyTitle && (
            <p className="text-[11px] text-muted-foreground truncate">Re: {vacancyTitle}</p>
          )}
        </div>
        {applicationStatus && (
          <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
            {applicationStatus.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-0">
        {isLoading && <p className="text-xs text-muted-foreground text-center py-8">Loading messages...</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_user_id === user?.id;
          const typeLabel = MESSAGE_TYPE_LABELS[msg.message_type];
          return (
            <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                isOwn
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}>
                {typeLabel && (
                  <p className={cn("text-[10px] font-medium mb-0.5", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {typeLabel}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-[13px]">{msg.message_text}</p>
                <p className={cn("text-[9px] mt-1", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {msg.read_at && isOwn && " ✓"}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (employer only) */}
      {senderType === "employer" && applicationId && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-hide">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.type}
              variant="outline"
              size="sm"
              className="shrink-0 text-[10px] h-7 gap-1 px-2"
              onClick={() => handleQuickAction(action)}
              disabled={sendMessage.isPending}
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 h-10 text-sm"
        />
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleSend}
          disabled={!newMessage.trim() || sendMessage.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
