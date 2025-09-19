"use client";
import { cn } from "@/lib/utils";
import ModernChatHeader from "@/components/chat/ModernChatHeader";
import MessagesList from "@/components/chat/MessagesList";
import Composer from "@/components/chat/Composer";
import ReportModal from "@/components/chat/ReportModal";
import { useModernChat, type ReportReason } from "@/hooks/useModernChat";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useState } from "react";
import { canSendVoiceMessage } from "@/lib/utils/messageUtils";

export type ModernChatProps = {
  conversationId: string;
  currentUserId: string;
  matchUserId: string;
  matchUserName?: string;
  matchUserAvatarUrl?: string;
  className?: string;
};

function ModernChat({
  conversationId,
  currentUserId,
  matchUserId,
  matchUserName = "",
  matchUserAvatarUrl = "",
  className = "",
}: ModernChatProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);
  const {
    subscriptionStatus,
    connectionStatus,
    scrollRef,
    inputRef,
    toggleBtnRef,
    // pickerRef not used here; kept local in hook
    state,
    messagesState,
    presence,
    handlers,
  } = useModernChat({
    conversationId,
    currentUserId,
    matchUserId,
  });

  const {
    text,
    showPicker,
    isSending,
    isBlocked,
    playingVoice,
    showReportModal,
    messageFeedback,
    error,
    replyTo,
  } = state;

  const {
    messages,
    loading,
    loadingOlder,
    hasMore,
    typingUsers,
    getMessageDeliveryStatus,
    showScrollToBottom,
  } = messagesState;

  const {
    setText,
    setShowPicker,
    setPlayingVoice,
    setShowReportModal,
    handleSendMessage,
    handleInputChange,
    handleKeyPress,
    handleBlockUser,
    handleReportUser,
    onFetchOlder,
    onScrollToBottom,
    setReplyTo,
    // setMessageFeedback managed inside hook
    startEditMessage,
    cancelEditMessage,
    toggleReaction,
  } = handlers;

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-white via-slate-50/20 to-white text-neutral-900 rounded-3xl shadow-xl border border-slate-200/60 flex flex-col flex-1 overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-2xl",
        "relative before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-transparent before:via-slate-50/10 before:to-transparent before:pointer-events-none",
        "min-h-[600px] max-h-[800px] sm:min-h-[700px] lg:min-h-[750px]", // Responsive height constraints
        "w-full sm:max-w-4xl lg:max-w-5xl", // Responsive width constraints
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.8) 25%, rgba(255,255,255,0.95) 50%, rgba(248,250,252,0.8) 75%, rgba(255,255,255,0.95) 100%)",
      }}
    >
      {/* Enhanced Header Section */}
      <div className="relative z-10 border-b border-slate-200/40 bg-gradient-to-r from-white/80 to-slate-50/60 backdrop-blur-sm">
        <ModernChatHeader
          matchUserName={matchUserName}
          matchUserAvatarUrl={matchUserAvatarUrl}
          subscriptionPlan={subscriptionStatus.data?.plan}
          connectionStatus={presence?.isOnline ? "connected" : connectionStatus}
          lastSeenAt={presence?.lastSeen}
          onReport={() => setShowReportModal(true)}
          onToggleSearch={() => {
            const messagesList = document.querySelector("[data-messages-list]");
            if (messagesList) {
              const searchEvent = new CustomEvent("toggleSearch");
              messagesList.dispatchEvent(searchEvent);
            }
          }}
        />
      </div>

      {/* Enhanced Messages Section */}
      <div className="relative flex-1 bg-gradient-to-b from-slate-50/30 via-transparent to-slate-50/20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/5 to-transparent pointer-events-none" />
        <MessagesList
          scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
          loading={loading}
          loadingOlder={loadingOlder}
          hasMore={hasMore}
          onFetchOlder={onFetchOlder}
          messages={messages}
          currentUserId={currentUserId}
          isBlocked={isBlocked}
          matchUserName={matchUserName}
          matchUserAvatarUrl={matchUserAvatarUrl}
          typingUsers={typingUsers}
          playingVoice={playingVoice}
          setPlayingVoice={setPlayingVoice}
          getMessageDeliveryStatus={getMessageDeliveryStatus}
          onScrollToBottom={onScrollToBottom}
          showScrollToBottom={showScrollToBottom}
          otherLastReadAt={messagesState.otherLastReadAt}
          onUnblock={handleBlockUser /* reuse; toggled in dialog elsewhere */}
          onSelectReply={(m) =>
            setReplyTo({
              messageId: m._id,
              text: (m as any).text,
              type: (m as any).type || "text",
              fromUserId: m.fromUserId,
            })
          }
          onEditMessage={(id, currentText) => startEditMessage(id, currentText)}
          onDeleteMessage={async (id) => {
            setTargetDeleteId(id);
            setDeleteModalOpen(true);
          }}
          onToggleReaction={(messageId, emoji) =>
            toggleReaction(messageId, emoji)
          }
          getReactionsForMessage={messagesState.getReactionsForMessage}
        />
      </div>

      {/* Enhanced Input Section */}
      <div className="relative z-10 border-t border-slate-200/40 bg-gradient-to-r from-white/90 to-slate-50/80 backdrop-blur-sm">
        <Composer
          inputRef={inputRef as any}
          text={text}
          setText={setText}
          isSending={isSending}
          isBlocked={isBlocked}
          showPicker={showPicker}
          setShowPicker={setShowPicker}
          toggleBtnRef={toggleBtnRef as any}
          onSend={handleSendMessage}
          onInputChange={handleInputChange}
          onKeyPress={handleKeyPress}
          // Voice: gate mic based on subscription plan
          canSendVoice={(() => {
            const plan = subscriptionStatus.data?.plan || "free";
            return canSendVoiceMessage(plan);
          })()}
          onSendVoice={undefined}
          onVoiceUpgradeRequired={() => {}}
          onVoiceError={() => {}}
          messageFeedback={messageFeedback}
          setMessageFeedback={() => {}}
          error={error}
          conversationId={conversationId}
          toUserId={matchUserId}
          fromUserId={currentUserId}
          // tiny typing hint inline below composer
          isOtherTyping={
            (Array.isArray(typingUsers) &&
              typingUsers.length > 0) as unknown as boolean
          }
          replyTo={replyTo || undefined}
          onCancelReply={() => setReplyTo(null)}
          editing={state.editing || null}
          onCancelEdit={cancelEditMessage}
        />
      </div>

      {/* Enhanced Modals */}
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onBlockUser={handleBlockUser}
        onReportUser={async (reason: string, description: string) => {
          await handleReportUser(
            reason as unknown as ReportReason,
            description
          );
        }}
      />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
            setTargetDeleteId(null);
          }
        }}
        onConfirm={async () => {
          if (!targetDeleteId) return;
          try {
            setDeleting(true);
            const { deleteMessage } = await import("@/lib/api/messages");
            await deleteMessage(targetDeleteId);
          } catch {
            // optional toast could be added
          } finally {
            setDeleting(false);
            setDeleteModalOpen(false);
            setTargetDeleteId(null);
          }
        }}
        title="Delete this message?"
        description="This action will delete the message for you. It may not remove it for the other participant depending on policy."
        isDeleting={deleting}
        confirmText="Delete"
      />

      {/* Enhanced loading state */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-slate-50/40 to-white/60 backdrop-blur-md flex items-center justify-center z-20 animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 bg-white/90 rounded-2xl px-8 py-6 shadow-xl border border-slate-200/50">
            <div className="relative">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-pink-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-8 h-8 border-3 border-transparent border-l-pink-400 rounded-full animate-spin animation-delay-100"></div>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-slate-700">
                Loading conversation
              </span>
              <div className="flex gap-1 mt-2 justify-center">
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce animation-delay-100"></div>
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce animation-delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModernChat;
