import { useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, Circle } from 'lucide-react';
import { brainQuestBank } from '../../data/brainQuestBank.js';
import { completeBrainQuest, getDailyBrainQuest } from '../../utils/brainQuestEngine.js';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';
import BrainQuestResetTimer from './BrainQuestResetTimer.jsx';

export default function BrainQuestModal({ open = false, onClose, onComplete, loading = false, error = null }) {
  const [quest, setQuest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    try {
      const dailyQuest = getDailyBrainQuest(brainQuestBank);
      setQuest(dailyQuest);
      setAnswers(dailyQuest?.answers || {});
      setResult(null);
      setLocalError('');
    } catch {
      setLocalError('Brain quest could not be prepared.');
    }
  }, [open]);

  const empty = !quest?.questions?.length;
  const answeredCount = useMemo(() => Object.values(answers || {}).filter(Boolean)?.length, [answers]);
  const completeDisabled = empty || answeredCount < (quest?.questions?.length || 0) || quest?.completed;

  function selectAnswer(questionId, answer) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answer,
    }));
  }

  function finishQuest() {
    const completion = completeBrainQuest({ questionBank: brainQuestBank, answers });

    if (!completion?.success) {
      setLocalError(completion?.message || 'Brain quest could not be completed.');
      return;
    }

    setResult(completion);
    onComplete?.(completion);
  }

  return (
    <Modal
      description="Answer all three daily questions. Rewards can only be claimed once per day."
      empty={empty}
      emptyText="No brain quest questions are available yet."
      error={error || localError}
      loading={loading}
      onClose={onClose}
      open={open}
      title="Brain Quest"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-shadow-purpleLight" aria-hidden="true" />
            <span className="text-sm font-semibold text-shadow-textSecondary">
              {quest?.completed ? 'Completed today' : `${answeredCount}/${quest?.questions?.length || 0} answered`}
            </span>
          </div>
          <BrainQuestResetTimer empty={empty} />
        </div>

        {quest?.completed && !result ? (
          <div className="rounded-2xl border border-shadow-green/30 bg-shadow-green/10 p-4 text-sm text-shadow-textSecondary">
            You have already claimed today brain quest reward.
          </div>
        ) : null}

        {quest?.questions?.map((question, questionIndex) => {
          const selectedAnswer = answers?.[question?.id] || '';
          const resultRow = result?.results?.find((entry) => entry?.questionId === question?.id);

          return (
            <section className="rounded-2xl border border-white/10 bg-black/20 p-4" key={question?.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-shadow-purpleLight">
                    {question?.category} / {question?.difficulty}
                  </p>
                  <h3 className="mt-2 font-heading text-lg font-bold text-shadow-gold">
                    {questionIndex + 1}. {question?.question}
                  </h3>
                </div>
                <span className="rounded-full border border-shadow-gold/30 bg-shadow-gold/10 px-3 py-1 text-xs font-semibold text-shadow-gold">
                  {question?.points} pts
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {question?.options?.map((option) => {
                  const selected = selectedAnswer === option;
                  const revealed = Boolean(result);
                  const correct = resultRow?.correctAnswer === option;

                  return (
                    <button
                      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        revealed && correct
                          ? 'border-shadow-green/40 bg-shadow-green/10 text-shadow-green'
                          : selected
                            ? 'border-shadow-gold/40 bg-shadow-gold/10 text-shadow-gold'
                            : 'border-white/10 bg-white/[0.03] text-shadow-textSecondary hover:border-shadow-purple/40'
                      }`}
                      disabled={quest?.completed || Boolean(result)}
                      key={option}
                      onClick={() => selectAnswer(question?.id, option)}
                      type="button"
                    >
                      {selected || (revealed && correct) ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              {resultRow ? <p className="mt-3 text-sm leading-6 text-shadow-textSecondary">{resultRow?.explanation}</p> : null}
            </section>
          );
        })}

        {result ? (
          <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-4">
            <p className="font-heading text-xl font-bold text-shadow-gold">
              Score {result?.score}/{result?.questions?.length} / {result?.pointsAwarded} RP earned
            </p>
            <p className="mt-1 text-sm text-shadow-textSecondary">Your daily mind trial has been sealed.</p>
          </div>
        ) : null}

        <Button className="w-full" disabled={completeDisabled} onClick={finishQuest} size="lg">
          Complete Brain Quest
        </Button>
      </div>
    </Modal>
  );
}
