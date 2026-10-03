import React, { useState } from 'react';
import { CheckCircle2Icon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { susStatements } from '../../data/pilot';
import { susScore } from '../../utils/credentials';

const scale = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

export function UsabilitySurvey() {
  const { user } = useAuth();
  const { susResponses, submitSus } = useSkillPass();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  if (!user) return null;
  const existing = susResponses.find((r) => r.userId === user.id);
  const complete = answers.every((a) => a !== null);

  if (existing) {
    return (
      <>
        <PageHeader title="Usability Survey" subtitle="System Usability Scale (SUS)" />
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-8 text-center">
          <CheckCircle2Icon className="mx-auto h-10 w-10 text-ok-600" />
          <h2 className="mt-3 text-lg font-semibold text-ink">Thank you for your feedback</h2>
          <p className="mt-1 text-sm text-ink-muted">Your SUS score was <span className="font-semibold text-ink">{existing.score}</span>. The pilot target is 68 or above.</p>
        </div>
      </>);

  }

  return (
    <>
      <PageHeader title="Usability Survey" subtitle="10 quick statements · about 2 minutes · answers are anonymised for the pilot evaluation." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (complete) submitSus(user.id, user.role, susScore(answers as number[]));
        }}
        className="mx-auto max-w-3xl space-y-3">
        
        {susStatements.map((q, i) =>
        <fieldset key={q} className="rounded-2xl border border-line bg-white p-5">
            <legend className="sr-only">Statement {i + 1}</legend>
            <p className="text-sm font-medium text-ink"><span className="mr-2 text-ink-subtle">{i + 1}.</span>{q}</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {scale.map((label, v) => {
              const val = v + 1;
              const on = answers[i] === val;
              return (
                <label key={label} className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-colors duration-150 ${on ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-canvas'}`}>
                    <input type="radio" name={`q${i}`} value={val} checked={on} onChange={() => setAnswers((prev) => prev.map((a, j) => j === i ? val : a))} className="sr-only" />
                    <span className={`text-base font-semibold ${on ? 'text-brand-700' : 'text-ink'}`}>{val}</span>
                    <span className="hidden text-[11px] leading-tight text-ink-muted sm:block">{label}</span>
                  </label>);

            })}
            </div>
          </fieldset>
        )}
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-ink-muted">{answers.filter((a) => a !== null).length} of 10 answered</p>
          <button type="submit" disabled={!complete} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">Submit survey</button>
        </div>
      </form>
    </>);

}