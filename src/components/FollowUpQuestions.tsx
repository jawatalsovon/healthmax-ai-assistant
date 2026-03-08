import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FollowUpQuestion } from '@/types/triage';

interface Props {
  questions: FollowUpQuestion[];
  lang: 'bn' | 'en';
  onSubmitAnswers: (combinedAnswer: string) => void;
  disabled?: boolean;
}

export function FollowUpQuestions({ questions, lang, onSubmitAnswers, disabled }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return null;

  const handleSubmit = () => {
    const combined = questions.map((q, i) => {
      const qText = lang === 'bn' ? q.question_bn : q.question_en;
      const ans = answers[i] || (lang === 'bn' ? 'উত্তর দেওয়া হয়নি' : 'Not answered');
      return `Q: ${qText}\nA: ${ans}`;
    }).join('\n\n');
    setSubmitted(true);
    onSubmitAnswers(combined);
  };

  const allAnswered = questions.every((_, i) => answers[i]);

  return (
    <Card className="bg-secondary/50 border-0">
      <CardContent className="pt-4 pb-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          {lang === 'bn' ? 'অনুসরণমূলক প্রশ্ন' : 'Follow-up Questions'}
        </p>
        {questions.map((q, i) => (
          <div key={i} className="space-y-2">
            <p className="font-bangla text-sm font-medium">
              {i + 1}. {lang === 'bn' ? q.question_bn : q.question_en}
            </p>
            {q.type === 'yes_no' ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={answers[i] === (lang === 'bn' ? 'হ্যাঁ' : 'Yes') ? 'default' : 'outline'}
                  onClick={() => setAnswers(p => ({ ...p, [i]: lang === 'bn' ? 'হ্যাঁ' : 'Yes' }))}
                  disabled={disabled}
                  className="font-bangla"
                >
                  {lang === 'bn' ? 'হ্যাঁ' : 'Yes'}
                </Button>
                <Button
                  size="sm"
                  variant={answers[i] === (lang === 'bn' ? 'না' : 'No') ? 'default' : 'outline'}
                  onClick={() => setAnswers(p => ({ ...p, [i]: lang === 'bn' ? 'না' : 'No' }))}
                  disabled={disabled}
                  className="font-bangla"
                >
                  {lang === 'bn' ? 'না' : 'No'}
                </Button>
              </div>
            ) : q.type === 'choice' && q.options_en ? (
              <div className="flex flex-wrap gap-2">
                {(lang === 'bn' ? q.options_bn || q.options_en : q.options_en).map((opt, j) => (
                  <Button
                    key={j}
                    size="sm"
                    variant={answers[i] === opt ? 'default' : 'outline'}
                    onClick={() => setAnswers(p => ({ ...p, [i]: opt }))}
                    disabled={disabled}
                    className="font-bangla"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            ) : (
              <Input
                value={answers[i] || ''}
                onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                placeholder={lang === 'bn' ? 'আপনার উত্তর লিখুন...' : 'Type your answer...'}
                className="font-bangla text-sm"
                disabled={disabled}
              />
            )}
          </div>
        ))}
        <Button onClick={handleSubmit} disabled={disabled || !allAnswered} size="sm" className="w-full font-bangla">
          {lang === 'bn' ? 'উত্তর জমা দিন' : 'Submit Answers'}
        </Button>
      </CardContent>
    </Card>
  );
}
