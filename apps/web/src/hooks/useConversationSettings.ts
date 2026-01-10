import { useState, useEffect, useCallback } from 'react';
import { ConversationDetails, updateConversation } from '../api/conversations';

function clampTemperature(value: number): number {
  if (Number.isNaN(value)) return 0.7;
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
}

function clampTopP(value: number): number {
  if (Number.isNaN(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function useConversationSettings(
  conversation: ConversationDetails | null,
  token: string | null,
  onUpdate?: (updated: ConversationDetails) => void
) {
  const [model, setModel] = useState<string>('llama3.1');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(1);
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Sync state with conversation when it changes
  useEffect(() => {
    if (conversation) {
      const nextModel = conversation.model || 'llama3.1';
      const nextTemp = clampTemperature(conversation.temperature ?? 0.7);
      const nextTopP = clampTopP(conversation.topP ?? 1);

      // Only update state if it differs from current to avoid loops or unnecessary re-renders
      // But here we want to reset if conversation changes ID or actually changes
      setModel(nextModel);
      setTemperature(nextTemp);
      setTopP(nextTopP);
      setDirty(false);
    }
  }, [conversation?.id, conversation?.model, conversation?.temperature, conversation?.topP]);

  // Auto-clear the "Saved" chip after some time
  useEffect(() => {
    if (!savedAt) return;
    const timeout = window.setTimeout(() => {
      setSavedAt(null);
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const saveSettings = useCallback(async () => {
    if (!token || !conversation) return;

    setSaving(true);
    try {
      const resp = await updateConversation(token, conversation.id, {
        model,
        temperature,
        topP,
      });
      if (onUpdate) {
        onUpdate(resp.conversation);
      }
      setDirty(false);
      setSavedAt(Date.now());
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  }, [token, conversation, model, temperature, topP, onUpdate]);

  const resetSettings = useCallback(() => {
    if (!conversation) return;
    const baseModel = conversation.model || 'llama3.1';
    const baseTemp = clampTemperature(conversation.temperature ?? 0.7);
    const baseTopP = clampTopP(conversation.topP ?? 1);
    setModel(baseModel);
    setTemperature(baseTemp);
    setTopP(baseTopP);
    setDirty(false);
  }, [conversation]);

  const handleChangeModel = useCallback((value: string) => {
    setModel(value);
    setDirty(true);
  }, []);

  const handleChangeTemperature = useCallback((value: number) => {
    setTemperature(value);
    setDirty(true);
  }, []);

  const handleChangeTopP = useCallback((value: number) => {
    setTopP(value);
    setDirty(true);
  }, []);

  return {
    model,
    temperature,
    topP,
    dirty,
    saving,
    savedAt,
    saveSettings,
    resetSettings,
    handleChangeModel,
    handleChangeTemperature,
    handleChangeTopP,
  };
}
