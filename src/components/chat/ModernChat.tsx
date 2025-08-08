"use client";
import { cn } from "@/lib/utils";
import ModernChatHeader from "@/components/chat/ModernChatHeader";
import MessagesList from "@/components/chat/MessagesList";
import Composer from "@/components/chat/Composer";
import ReportModal from "@/components/chat/ReportModal";
import { useModernChat, type ReportReason } from "@/hooks/useModernChat";

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
    // setMessageFeedback managed inside hook
  } = handlers;

  return (
    <div
      className={cn(
        "bg-white text-neutral-900 rounded-xl shadow-sm flex flex-col h-full mb-6",
        className
      )}
    >
      <ModernChatHeader
        matchUserName={matchUserName}
        matchUserAvatarUrl={matchUserAvatarUrl}
        subscriptionPlan={subscriptionStatus.data?.plan}
        connectionStatus={presence?.isOnline ? "connected" : connectionStatus}
        lastSeenAt={presence?.lastSeen}
        onReport={() => setShowReportModal(true)}
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
        // Voice not used: provide no-op handlers to satisfy props
        canSendVoice={false}
        onSendVoice={async () => {}}
        onVoiceUpgradeRequired={() => {}}
        onVoiceError={() => {}}
        messageFeedback={messageFeedback}
        setMessageFeedback={() => {}}
        error={error}
        // tiny typing hint inline below composer
        isOtherTyping={
          (Array.isArray(typingUsers) &&
            typingUsers.length > 0) as unknown as boolean
        }
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
    </div>
  );
}

export default ModernChat;
