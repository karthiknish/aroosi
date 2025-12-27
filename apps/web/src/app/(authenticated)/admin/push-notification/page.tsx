"use client";

import { useMemo, useState } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import {
  AnalyticsDashboard,
  NotificationForm,
  DeviceManager,
  TestNotification,
  TemplateManager,
  ConfirmSendUsersDialog,
  ConfirmSendDevicesDialog,
  PushNotificationHeader,
  PushTabsNavigation,
} from "./components";
import { DEFAULT_TEMPLATE_CATEGORIES } from "./types";
import { usePushNotificationForm } from "@/hooks/usePushNotificationForm";
import { usePushNotificationDevices } from "@/hooks/usePushNotificationDevices";
import { usePushNotificationTemplates } from "@/hooks/usePushNotificationTemplates";
import { usePushNotificationTest } from "@/hooks/usePushNotificationTest";

export default function PushNotificationAdminPage() {
  // Cookie-auth: no token in context
  useAuthContext();
  const [activeTab, setActiveTab] = useState<"compose" | "devices" | "test" | "templates">("compose");

  const {
    devices,
    deviceSearch, setDeviceSearch,
    devicePage, setDevicePage,
    deviceTotal,
    devicesLoading,
    selectedDevices, setSelectedDevices,
    analytics,
    devicePageSize,
    fetchDevices,
    confirmSendUsersOpen, setConfirmSendUsersOpen,
    confirmSendDevicesOpen, setConfirmSendDevicesOpen,
    pendingExternalIds, setPendingExternalIds,
    pendingPlayerIds, setPendingPlayerIds,
  } = usePushNotificationDevices();

  const {
    templates,
    templatesLoading,
    newTemplateName, setNewTemplateName,
    newTemplateDesc, setNewTemplateDesc,
    templateSearch, setTemplateSearch,
    selectedTemplate, setSelectedTemplate,
    loadTemplates,
    deleteTemplate,
  } = usePushNotificationTemplates();

  const {
    title, setTitle,
    message, setMessage,
    url, setUrl,
    imageUrl, setImageUrl,
    dataJson, setDataJson,
    buttonsJson, setButtonsJson,
    sending,
    dryRun, setDryRun,
    segments, setSegments,
    excludedSegments, setExcludedSegments,
    maxAudience, setMaxAudience,
    confirmLive, setConfirmLive,
    selectedCategory, setSelectedCategory,
    previewData,
    handleSend,
    applyTemplate,
    saveCurrentAsTemplate,
    setIncludeExternalUserIds,
    setIncludePlayerIds,
    setAppliedTemplateId,
  } = usePushNotificationForm();

  const {
    testPlayerId, setTestPlayerId,
    testSending,
    testResult,
    handleTestSend,
  } = usePushNotificationTest();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccessToast("Copied to clipboard");
    } catch (_error) {
      showErrorToast(null, "Failed to copy to clipboard");
    }
  };

  const categoryNames = useMemo(() => Object.keys(DEFAULT_TEMPLATE_CATEGORIES), []);
  const presets = useMemo(() => DEFAULT_TEMPLATE_CATEGORIES[selectedCategory] || [], [selectedCategory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-light to-neutral/5">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <PushNotificationHeader />
        <AnalyticsDashboard analytics={analytics} />

        <div className="bg-base-light rounded-2xl shadow-sm border border-neutral/20 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <PushTabsNavigation />

            <TabsContent value="compose" className="p-6">
              <NotificationForm
                title={title} setTitle={setTitle}
                message={message} setMessage={setMessage}
                url={url} setUrl={setUrl}
                imageUrl={imageUrl} setImageUrl={setImageUrl}
                dataJson={dataJson} setDataJson={setDataJson}
                buttonsJson={buttonsJson} setButtonsJson={setButtonsJson}
                selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
                categoryNames={categoryNames}
                presets={presets}
                setAppliedTemplateId={setAppliedTemplateId}
                segments={segments} setSegments={setSegments}
                excludedSegments={excludedSegments} setExcludedSegments={setExcludedSegments}
                maxAudience={maxAudience} setMaxAudience={setMaxAudience}
                dryRun={dryRun} setDryRun={setDryRun}
                confirmLive={confirmLive} setConfirmLive={setConfirmLive}
                handleSend={handleSend}
                sending={sending}
                previewData={previewData}
                copyToClipboard={copyToClipboard}
              />
            </TabsContent>

            <TabsContent value="devices" className="p-6">
              <DeviceManager
                devices={devices}
                deviceSearch={deviceSearch}
                setDeviceSearch={setDeviceSearch}
                devicePage={devicePage}
                setDevicePage={setDevicePage}
                deviceTotal={deviceTotal}
                devicesLoading={devicesLoading}
                selectedDevices={selectedDevices}
                setSelectedDevices={setSelectedDevices}
                setTestPlayerId={setTestPlayerId}
                setPendingExternalIds={setPendingExternalIds}
                setPendingPlayerIds={setPendingPlayerIds}
                setConfirmSendUsersOpen={setConfirmSendUsersOpen}
                setConfirmSendDevicesOpen={setConfirmSendDevicesOpen}
                setActiveTab={setActiveTab}
                copyToClipboard={copyToClipboard}
                fetchDevices={fetchDevices}
                totalDevicePages={Math.ceil(deviceTotal / devicePageSize)}
              />
            </TabsContent>

            <TabsContent value="test" className="p-6">
              <TestNotification
                testTitle={title} setTestTitle={setTitle}
                testMessage={message} setTestMessage={setMessage}
                testUrl={url} setTestUrl={setUrl}
                testImageUrl={imageUrl} setTestImageUrl={setImageUrl}
                testPlayerId={testPlayerId} setTestPlayerId={setTestPlayerId}
                handleTestSend={() => handleTestSend(title, message, url)}
                testSending={testSending}
                testResult={testResult}
                copyToClipboard={copyToClipboard}
              />
            </TabsContent>

            <TabsContent value="templates" className="p-6">
              <TemplateManager
                templates={templates}
                templateSearch={templateSearch}
                setTemplateSearch={setTemplateSearch}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                templateName={newTemplateName}
                setTemplateName={setNewTemplateName}
                templateTitle={title}
                setTemplateTitle={setTitle}
                templateMessage={message}
                setTemplateMessage={setMessage}
                templateImageUrl={imageUrl}
                setTemplateImageUrl={setImageUrl}
                templateUrl={url}
                setTemplateUrl={setUrl}
                templateCategory={selectedCategory}
                setTemplateCategory={setSelectedCategory}
                handleSaveTemplate={() => saveCurrentAsTemplate(newTemplateName, newTemplateDesc)}
                handleDeleteTemplate={(tpl: any) => deleteTemplate(tpl.id)}
                handleApplyTemplate={applyTemplate}
              />
            </TabsContent>
          </Tabs>
        </div>

        <ConfirmSendUsersDialog
          open={confirmSendUsersOpen}
          onOpenChange={setConfirmSendUsersOpen}
          onCancel={() => {
            setConfirmSendUsersOpen(false);
            setPendingExternalIds([]);
          }}
          onConfirm={() => {
            setIncludeExternalUserIds(pendingExternalIds.join(", "));
            setConfirmSendUsersOpen(false);
            setPendingExternalIds([]);
            showSuccessToast("Selected users added to Include External User IDs");
            setActiveTab("compose");
          }}
          userIds={devices
            .filter((d) => pendingExternalIds.includes(d.userId))
            .map((d) => d.userId)}
          pendingExternalIds={pendingExternalIds}
        />

        <ConfirmSendDevicesDialog
          open={confirmSendDevicesOpen}
          onOpenChange={setConfirmSendDevicesOpen}
          onCancel={() => {
            setConfirmSendDevicesOpen(false);
            setPendingPlayerIds([]);
          }}
          onConfirm={() => {
            setIncludePlayerIds(pendingPlayerIds.join(", "));
            setConfirmSendDevicesOpen(false);
            setPendingPlayerIds([]);
            showSuccessToast("Selected device IDs added to Include Player IDs");
            setActiveTab("compose");
          }}
          playerIds={devices
            .filter((d) => pendingPlayerIds.includes(d.playerId))
            .map((d) => d.playerId)}
          pendingPlayerIds={pendingPlayerIds}
        />
      </div>
    </div>
  );
}