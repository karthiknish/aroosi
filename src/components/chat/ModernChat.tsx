"use client";
import { cn } from "@/lib/utils";
import ModernChatHeader from "@/components/chat/ModernChatHeader";
import MessagesList from "@/components/chat/MessagesList";
import Composer from "@/components/chat/Composer";
import ReportModal from "@/components/chat/ReportModal";
import { useModernChat, type ReportReason } from "@/hooks/useModernChat";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useState } from "react";

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
        "bg-gradient-to-b from-white to-gray-50/30 text-neutral-900 rounded-2xl shadow-lg border border-gray-200/50 flex flex-col flex-1 overflow-hidden backdrop-blur-sm",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.8) 0%, rgba(248,250,252,0.6) 50%, rgba(255,255,255,0.9) 100%)",
      }}
    >
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
        // Voice: enable if device supports it; Composer will gate via hook
        canSendVoice={true}
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
    </div>
  );
}

export default ModernChat;
