import { useEffect, useState } from 'react';
import { Bug, Lightbulb, MessageSquareText, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { supabase } from '../../lib/supabase.js';

const FEEDBACK_QUEUE_KEY = 'shadowAscentPendingFeedback';
const categories = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'feedback', label: 'Feedback', icon: MessageSquareText },
  { value: 'idea', label: 'Idea', icon: Lightbulb },
];

function readQueue() {
  try {
    const stored = globalThis?.localStorage?.getItem(FEEDBACK_QUEUE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    globalThis?.localStorage?.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

function removeQueuedItem(id) {
  const nextQueue = readQueue()?.filter((item) => item?.id !== id);
  writeQueue(nextQueue);
}

function syncFeedback(item, onSuccess, onFailure) {
  if (!supabase || !item?.id || !item?.user_id) {
    onFailure?.();
    return;
  }

  try {
    supabase
      .from('beta_feedback')
      .insert(item)
      .then(({ error }) => {
        if (!error || error?.code === '23505') {
          removeQueuedItem(item?.id);
          onSuccess?.();
          return;
        }
        onFailure?.();
      })
      .catch(() => onFailure?.());
  } catch {
    onFailure?.();
  }
}

function createFeedbackId(userId) {
  const uuid = globalThis?.crypto?.randomUUID?.();
  return uuid || `${userId || 'user'}-${Date.now()}`;
}

export default function FeedbackButton() {
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('feedback');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    readQueue()
      ?.filter((item) => item?.user_id === user?.id)
      ?.forEach((item) => syncFeedback(item));
  }, [user?.id]);

  function submitFeedback(event) {
    event.preventDefault();
    const cleanMessage = message?.trim();
    if (cleanMessage?.length < 3) {
      setError('Tell us what happened in at least three characters.');
      return;
    }
    if (cleanMessage?.length > 2000) {
      setError('Keep feedback under 2,000 characters.');
      return;
    }

    const item = {
      id: createFeedbackId(user?.id),
      user_id: user?.id,
      category,
      message: cleanMessage,
      page_path: location?.pathname || '/',
      created_at: new Date().toISOString(),
    };
    const nextQueue = [...readQueue(), item]?.slice(-20);
    writeQueue(nextQueue);
    setMessage('');
    setCategory('feedback');
    setError('');
    setOpen(false);
    toast?.success?.('Feedback saved. Thank you for shaping the beta.');
    syncFeedback(
      item,
      undefined,
      () => toast?.warning?.('Feedback is saved locally and will retry when the connection returns.'),
    );
  }

  if (!user?.id) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Send beta feedback"
        className="fixed bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-shadow-purple/40 bg-shadow-secondary text-shadow-purpleLight shadow-purpleGlow transition hover:border-shadow-gold/45 hover:text-shadow-gold md:bottom-6 md:right-6"
        onClick={() => setOpen(true)}
        title="Send beta feedback"
        type="button"
      >
        <MessageSquareText className="h-5 w-5" aria-hidden="true" />
      </button>

      <Modal
        description="Report a bug, share an idea, or tell us what would make your ascent better."
        onClose={() => setOpen(false)}
        open={open}
        title="Beta Feedback"
      >
        <form className="space-y-5" onSubmit={submitFeedback}>
          <div>
            <p className="text-xs font-semibold uppercase text-shadow-textMuted">Type</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {categories?.map((option) => {
                const Icon = option?.icon;
                const selected = category === option?.value;
                return (
                  <button
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition ${
                      selected
                        ? 'border-shadow-gold/50 bg-shadow-gold/10 text-shadow-gold'
                        : 'border-white/10 bg-black/20 text-shadow-textSecondary hover:border-shadow-purple/40'
                    }`}
                    key={option?.value}
                    onClick={() => setCategory(option?.value)}
                    type="button"
                  >
                    {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                    {option?.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-shadow-textMuted">Message</span>
            <textarea
              className="mt-2 min-h-36 w-full resize-y rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-shadow-text outline-none transition placeholder:text-shadow-textMuted focus:border-shadow-purple/50 focus:ring-2 focus:ring-shadow-purple/20"
              maxLength={2000}
              onChange={(event) => {
                setMessage(event?.target?.value || '');
                setError('');
              }}
              placeholder="What happened, what did you expect, or what should we build next?"
              value={message}
            />
            <span className="mt-1 flex justify-between gap-3 text-xs text-shadow-textMuted">
              <span>{error || 'Your report includes the current page automatically.'}</span>
              <span>{message?.length || 0}/2000</span>
            </span>
          </label>

          <Button className="w-full" type="submit">
            <Send className="h-4 w-4" aria-hidden="true" />
            Send Feedback
          </Button>
        </form>
      </Modal>
    </>
  );
}
