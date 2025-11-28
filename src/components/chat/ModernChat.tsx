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
import { MessageCircle } from "lucide-react";

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
        "flex flex-col flex-1 w-full h-full overflow-hidden rounded-3xl shadow-2xl border border-neutral-200/60 relative",
        // Refined gradient background - subtle warmth for matrimony context
        "bg-gradient-to-b from-[#FDFBF9] via-white to-[#FBF8F5]",
        className
      )}
    >
      {/* Atmospheric ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-rose-200/20 via-amber-100/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-rose-100/20 to-transparent rounded-full blur-2xl" />
      </div>

      {/* Refined Header Section */}
      <div className="relative z-10 border-b border-neutral-100/80 bg-gradient-to-r from-white/95 via-[#FEFCFA]/95 to-white/95 backdrop-blur-xl">
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

      {/* Elevated Messages Section - subtle pattern overlay */}
      <div className="relative flex-1 bg-gradient-to-b from-neutral-50/30 via-transparent to-neutral-50/20">
        {/* Subtle fabric-like texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.15) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
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

      {/* Refined Input Section with subtle gradient */}
      <div className="relative z-10 bg-gradient-to-t from-white via-[#FEFCFA] to-white/95 border-t border-neutral-100/60">
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

      {/* Refined loading state with elegant animation */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-[#FDFBF9]/90 to-white/80 backdrop-blur-xl flex items-center justify-center z-20 animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-5 bg-white/95 rounded-3xl px-10 py-8 shadow-2xl border border-neutral-100/80">
            {/* Refined spinner with rose accent */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-neutral-100"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose-400 animate-spin"></div>
              <div className="absolute inset-1 rounded-full border border-transparent border-l-amber-300/60 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
              <MessageCircle className="absolute inset-0 m-auto w-5 h-5 text-rose-400/80" />
            </div>
            <div className="text-center space-y-2">
              <span className="text-sm font-semibold tracking-wide text-neutral-700">
                Loading conversation
              </span>
              <div className="flex gap-1.5 justify-center">
                <div className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModernChat;
