import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { soundEffects } from '../utils/soundEffects';

export function useReminderScheduler() {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      const { reminders = [] } = state;

      reminders.forEach(reminder => {
        if (!reminder.active) return;
        if (reminder.dueTimestamp <= now && !triggeredRef.current.has(reminder.id)) {
          triggeredRef.current.add(reminder.id);

          // Play Acoustic Alert Chime
          soundEffects.playReminder();

          // Show Toast Notification
          toast.warning(`⏰ Reminder: ${reminder.title}`, 8000);

          // Speak announcement aloud
          const announcement = `Reminder: ${reminder.title}`;
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              const utterance = new SpeechSynthesisUtterance(announcement);
              window.speechSynthesis.speak(utterance);
            } catch {
              // Ignore
            }
          }
          if (window.nova?.voiceCommand) {
            window.nova.voiceCommand({ action: 'speak', text: announcement });
          }

          // Handle recurring vs one-time
          if (reminder.recurring === 'daily') {
            const nextDay = reminder.dueTimestamp + 24 * 60 * 60 * 1000;
            dispatch({
              type: 'UPDATE_REMINDER',
              reminder: { ...reminder, dueTimestamp: nextDay, lastTriggeredAt: now },
            });
            triggeredRef.current.delete(reminder.id);
          } else if (reminder.recurring === 'weekly') {
            const nextWeek = reminder.dueTimestamp + 7 * 24 * 60 * 60 * 1000;
            dispatch({
              type: 'UPDATE_REMINDER',
              reminder: { ...reminder, dueTimestamp: nextWeek, lastTriggeredAt: now },
            });
            triggeredRef.current.delete(reminder.id);
          } else {
            // Deactivate one-time reminder
            dispatch({
              type: 'UPDATE_REMINDER',
              reminder: { ...reminder, active: false, lastTriggeredAt: now },
            });
          }
        }
      });
    };

    // Check every 10 seconds
    const interval = setInterval(checkReminders, 10000);
    checkReminders();

    return () => clearInterval(interval);
  }, [state.reminders, dispatch, toast]);
}
